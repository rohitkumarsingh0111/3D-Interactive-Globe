'use client';

// src/app/admin/page.tsx
// Full-featured admin dashboard: event list + CRUD form
import { useState, useEffect, useCallback, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

/* ── Types ─────────────────────────────────────────────────── */
interface AdminEvent {
  id: string; city: string; country: string; lat: number; lng: number;
  name: string; type: string; users: string; category: string;
  duration: string; color: string; isActive: boolean;
}
interface GeoSuggestion {
  displayName: string; city: string; state: string; country: string;
  lat: number; lng: number;
}
const EMPTY: Omit<AdminEvent,'id'|'type'|'isActive'> = {
  name:'', city:'', country:'', lat:0, lng:0,
  users:'', category:'', duration:'', color:'#00FFFF',
};

/* ── Toast ──────────────────────────────────────────────────── */
function Toast({ msg, type, onDone }: { msg:string; type:'ok'|'err'; onDone:()=>void }) {
  useEffect(() => { const t=setTimeout(onDone,3000); return ()=>clearTimeout(t); }, [onDone]);
  return (
    <div style={{
      position:'fixed', top:80, right:24, zIndex:999,
      background: type==='ok'?'rgba(74,222,128,0.12)':'rgba(255,68,68,0.12)',
      border:`1px solid ${type==='ok'?'rgba(74,222,128,0.35)':'rgba(255,68,68,0.35)'}`,
      borderRadius:12, padding:'12px 18px', color: type==='ok'?'#4ade80':'#ff6b6b',
      fontFamily:"'JetBrains Mono',monospace", fontSize:12, letterSpacing:'0.05em',
      backdropFilter:'blur(12px)', boxShadow:'0 8px 32px rgba(0,0,0,0.5)',
      display:'flex', alignItems:'center', gap:8, animation:'slideIn 0.25s ease',
    }}>
      {type==='ok'?'✓ ':'⚠ '}{msg}
    </div>
  );
}

/* ── Confirm dialog ─────────────────────────────────────────── */
function Confirm({ msg, onYes, onNo }: { msg:string; onYes:()=>void; onNo:()=>void }) {
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',zIndex:998,
      display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)' }}>
      <div style={{ background:'rgba(8,8,28,0.98)',border:'1px solid rgba(0,255,255,0.2)',
        borderRadius:16,padding:'28px 32px',width:340,textAlign:'center',
        boxShadow:'0 24px 80px rgba(0,0,0,0.8)' }}>
        <div style={{ fontSize:28, marginBottom:12 }}>🗑</div>
        <div style={{ color:'#fff',fontSize:14,marginBottom:20,lineHeight:1.5 }}>{msg}</div>
        <div style={{ display:'flex',gap:10 }}>
          <button onClick={onNo} style={{ flex:1,padding:'10px 0',background:'transparent',
            border:'1px solid rgba(255,255,255,0.15)',borderRadius:10,color:'rgba(255,255,255,0.5)',
            cursor:'pointer',fontFamily:"'Outfit',sans-serif",fontSize:13 }}>Cancel</button>
          <button onClick={onYes} style={{ flex:1,padding:'10px 0',background:'rgba(255,68,68,0.15)',
            border:'1px solid rgba(255,68,68,0.35)',borderRadius:10,color:'#ff6b6b',
            cursor:'pointer',fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:600 }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────── */
export default function AdminPage() {
  const router = useRouter();
  const [events,       setEvents]       = useState<AdminEvent[]>([]);
  const [form,         setForm]         = useState({ ...EMPTY });
  const [editId,       setEditId]       = useState<string|null>(null);
  const [loading,      setLoading]      = useState(false);
  const [fetching,     setFetching]     = useState(true);
  const [toast,        setToast]        = useState<{msg:string;type:'ok'|'err'}|null>(null);
  const [confirm,      setConfirm]      = useState<string|null>(null);
  // ── Geocoding autocomplete ──
  const [geoQuery,     setGeoQuery]     = useState('');
  const [geoResults,   setGeoResults]   = useState<GeoSuggestion[]>([]);
  const [geoLoading,   setGeoLoading]   = useState(false);
  const [showGeo,      setShowGeo]      = useState(false);
  const [geoActive,    setGeoActive]    = useState(-1); // keyboard nav index
  const geoRef = useRef<HTMLDivElement>(null);

  const showToast = (msg:string, type:'ok'|'err'='ok') => setToast({msg,type});

  /* ── Auth guard ── */
  useEffect(() => {
    fetch('/api/admin/verify').then(r => {
      if (!r.ok) router.replace('/admin/login');
    });
  }, [router]);

  /* ── Geocoding: debounced search ── */
  useEffect(() => {
    if (geoQuery.trim().length < 2) { setGeoResults([]); setShowGeo(false); return; }
    const timer = setTimeout(async () => {
      setGeoLoading(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(geoQuery)}`);
        if (res.ok) {
          const data: GeoSuggestion[] = await res.json();
          setGeoResults(data);
          setShowGeo(data.length > 0);
          setGeoActive(-1);
        }
      } catch { /* silent */ }
      finally { setGeoLoading(false); }
    }, 420);
    return () => clearTimeout(timer);
  }, [geoQuery]);

  /* ── Geocoding: close dropdown on outside click ── */
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (geoRef.current && !geoRef.current.contains(e.target as Node)) {
        setShowGeo(false);
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  /* ── Apply geocoding suggestion to form ── */
  function selectGeo(s: GeoSuggestion) {
    setForm(f => ({ ...f, city: s.city, country: s.country, lat: s.lat, lng: s.lng }));
    setGeoQuery(s.city + (s.state ? `, ${s.state}` : '') + (s.country ? `, ${s.country}` : ''));
    setShowGeo(false);
    setGeoActive(-1);
  }

  /* ── Keyboard nav inside geocode dropdown ── */
  function onGeoKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showGeo || geoResults.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setGeoActive(i => Math.min(i+1, geoResults.length-1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setGeoActive(i => Math.max(i-1, -1)); }
    if (e.key === 'Enter' && geoActive >= 0) { e.preventDefault(); selectGeo(geoResults[geoActive]); }
    if (e.key === 'Escape') setShowGeo(false);
  }

  /* ── Fetch all events (admin sees inactive too) ── */
  const fetchEvents = useCallback(async () => {
    setFetching(true);
    try {
      const r = await fetch('/api/events');
      if (r.ok) setEvents(await r.json());
    } finally { setFetching(false); }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  /* ── Logout ── */
  async function logout() {
    await fetch('/api/admin/logout', { method:'POST' });
    router.replace('/admin/login');
  }

  /* ── Edit mode ── */
  function startEdit(ev: AdminEvent) {
    setEditId(ev.id);
    setForm({ name:ev.name, city:ev.city, country:ev.country, lat:ev.lat, lng:ev.lng,
      users:ev.users, category:ev.category, duration:ev.duration, color:ev.color });
    setGeoQuery(`${ev.city}, ${ev.country}`);
    setShowGeo(false);
    window.scrollTo({ top:0, behavior:'smooth' });
  }

  function cancelEdit() { setEditId(null); setForm({ ...EMPTY }); setGeoQuery(''); }

  /* ── Submit (create or update) ── */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name || !form.city || !form.country) { showToast('Fill in all required fields','err'); return; }
    setLoading(true);
    try {
      const url    = editId ? `/api/events/${editId}` : '/api/events';
      const method = editId ? 'PUT' : 'POST';
      const r = await fetch(url, {
        method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(form),
      });
      if (r.ok) {
        showToast(editId ? 'Event updated ✓' : 'Event created ✓');
        cancelEdit();
        fetchEvents();
      } else {
        const d = await r.json();
        showToast(d.error||'Failed','err');
      }
    } catch { showToast('Network error','err'); }
    finally { setLoading(false); }
  }

  /* ── Toggle active ── */
  async function toggleActive(ev: AdminEvent) {
    const r = await fetch(`/api/events/${ev.id}`, {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ isActive: !ev.isActive }),
    });
    if (r.ok) { showToast(`Event ${ev.isActive?'deactivated':'activated'}`); fetchEvents(); }
    else showToast('Failed to toggle','err');
  }

  /* ── Delete ── */
  async function doDelete(id: string) {
    setConfirm(null);
    const r = await fetch(`/api/events/${id}`, { method:'DELETE' });
    if (r.ok) { showToast('Event deleted'); fetchEvents(); }
    else showToast('Delete failed','err');
  }

  /* ── Styles ── */
  const s = {
    input: {
      width:'100%', boxSizing:'border-box' as const, padding:'10px 13px',
      background:'rgba(0,255,255,0.04)', border:'1px solid rgba(0,255,255,0.15)',
      borderRadius:9, color:'#fff', fontSize:13, fontFamily:"'Outfit',sans-serif",
      outline:'none', transition:'border-color 0.2s',
    },
    label: {
      fontSize:9, fontFamily:"'JetBrains Mono',monospace", color:'rgba(255,255,255,0.38)',
      letterSpacing:'0.14em', textTransform:'uppercase' as const, display:'block', marginBottom:5,
    },
    field: { marginBottom:14 },
    card: {
      background:'rgba(255,255,255,0.025)', border:'1px solid rgba(0,255,255,0.10)',
      borderRadius:14, padding:'14px 16px', marginBottom:10,
      transition:'border-color 0.2s',
    },
  };

  return (
    <div style={{ minHeight:'100vh', background:'#0A0A1A', fontFamily:"'Outfit',sans-serif", color:'#fff' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0A0A1A; }
        input:focus { border-color: rgba(0,255,255,0.45) !important; box-shadow: 0 0 0 3px rgba(0,255,255,0.07) !important; }
        select:focus { border-color: rgba(0,255,255,0.45) !important; }
        @keyframes slideIn { from { transform:translateX(20px); opacity:0; } to { transform:translateX(0); opacity:1; } }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }
        ::-webkit-scrollbar { width:5px; } ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(0,255,255,0.15); border-radius:99px; }
      `}</style>

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
      {confirm && <Confirm msg="Delete this event permanently?" onYes={()=>doDelete(confirm)} onNo={()=>setConfirm(null)}/>}

      {/* ── Header ── */}
      <header style={{ position:'sticky',top:0,zIndex:100, background:'rgba(6,6,22,0.92)',
        backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(0,255,255,0.10)',
        padding:'0 28px', height:58, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <a href="/" style={{ display:'flex',alignItems:'center',gap:10,textDecoration:'none' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#00FFFF" strokeWidth="1.8" width="20" height="20">
              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            <span style={{ fontSize:17,fontWeight:700 }}>Globe<span style={{color:'#00FFFF'}}>X</span></span>
          </a>
          <span style={{ fontSize:9,fontFamily:"'JetBrains Mono',monospace",color:'rgba(0,255,255,0.45)',
            letterSpacing:'0.15em',padding:'3px 8px',background:'rgba(0,255,255,0.06)',
            border:'1px solid rgba(0,255,255,0.15)',borderRadius:20 }}>ADMIN PANEL</span>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:12 }}>
          <div style={{ fontSize:11,fontFamily:"'JetBrains Mono',monospace",color:'rgba(0,255,255,0.5)' }}>
            {events.filter(e=>e.isActive).length} LIVE · {events.length} TOTAL
          </div>
          <a href="/" style={{ padding:'7px 14px',background:'rgba(0,255,255,0.06)',
            border:'1px solid rgba(0,255,255,0.18)',borderRadius:8,color:'rgba(0,255,255,0.7)',
            fontSize:11,fontFamily:"'JetBrains Mono',monospace",letterSpacing:'0.1em',
            cursor:'pointer',textDecoration:'none',transition:'all 0.2s' }}>← GLOBE</a>
          <button onClick={logout} style={{ padding:'7px 14px',background:'rgba(255,68,68,0.08)',
            border:'1px solid rgba(255,68,68,0.25)',borderRadius:8,color:'#ff6b6b',
            fontSize:11,fontFamily:"'JetBrains Mono',monospace",letterSpacing:'0.1em',cursor:'pointer' }}>
            LOGOUT
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 380px',gap:0,minHeight:'calc(100vh - 58px)' }}>

        {/* ── Left: Event List ── */}
        <div style={{ padding:'28px 28px 28px 28px',borderRight:'1px solid rgba(0,255,255,0.08)', overflowY:'auto' }}>
          <div style={{ fontSize:11,fontFamily:"'JetBrains Mono',monospace",color:'rgba(0,255,255,0.5)',
            letterSpacing:'0.15em',marginBottom:18 }}>
            LIVE EVENTS — {fetching ? '...' : `${events.length} TOTAL`}
          </div>

          {fetching && (
            <div style={{ textAlign:'center',padding:'60px 0',color:'rgba(255,255,255,0.3)',
              fontFamily:"'JetBrains Mono',monospace",fontSize:12,animation:'pulse 1.5s infinite' }}>
              LOADING EVENTS...
            </div>
          )}

          {!fetching && events.length === 0 && (
            <div style={{ textAlign:'center',padding:'60px 0',color:'rgba(255,255,255,0.25)' }}>
              No events yet. Add your first event →
            </div>
          )}

          {events.map((ev) => (
            <div key={ev.id} style={{
              ...s.card, opacity: ev.isActive ? 1 : 0.5,
              borderColor: editId===ev.id ? 'rgba(0,255,255,0.4)' : 'rgba(0,255,255,0.10)',
              boxShadow: editId===ev.id ? '0 0 20px rgba(0,255,255,0.06)' : 'none',
            }}>
              <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12 }}>
                {/* Marker color dot + info */}
                <div style={{ display:'flex',alignItems:'flex-start',gap:12,flex:1,minWidth:0 }}>
                  <div style={{ width:10,height:10,borderRadius:'50%',background:ev.color,
                    boxShadow:`0 0 8px ${ev.color}`,flexShrink:0,marginTop:5 }}/>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:15,fontWeight:600,marginBottom:3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>
                      {ev.name}
                    </div>
                    <div style={{ fontSize:12,color:'rgba(255,255,255,0.45)',marginBottom:6 }}>
                      📍 {ev.city}, {ev.country}
                    </div>
                    <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
                      <span style={{ fontSize:10,fontFamily:"'JetBrains Mono',monospace",
                        color:'rgba(0,255,255,0.6)',background:'rgba(0,255,255,0.06)',
                        border:'1px solid rgba(0,255,255,0.15)',borderRadius:6,padding:'2px 7px' }}>
                        👥 {ev.users}
                      </span>
                      <span style={{ fontSize:10,fontFamily:"'JetBrains Mono',monospace",
                        color:'rgba(168,85,247,0.8)',background:'rgba(168,85,247,0.06)',
                        border:'1px solid rgba(168,85,247,0.15)',borderRadius:6,padding:'2px 7px' }}>
                        {ev.category}
                      </span>
                      <span style={{ fontSize:10,fontFamily:"'JetBrains Mono',monospace",
                        color:`${ev.lat>=0?'rgba(74,222,128,0.7)':'rgba(255,182,72,0.7)'}`,
                        background:'rgba(255,255,255,0.03)',
                        border:'1px solid rgba(255,255,255,0.08)',borderRadius:6,padding:'2px 7px' }}>
                        {ev.lat.toFixed(2)}°, {ev.lng.toFixed(2)}°
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display:'flex',flexDirection:'column',gap:6,flexShrink:0 }}>
                  <button onClick={() => startEdit(ev)} style={{
                    padding:'5px 12px',background:'rgba(0,255,255,0.07)',
                    border:'1px solid rgba(0,255,255,0.22)',borderRadius:7,
                    color:'#00FFFF',fontSize:10,fontFamily:"'JetBrains Mono',monospace",
                    letterSpacing:'0.1em',cursor:'pointer' }}>EDIT</button>
                  <button onClick={() => toggleActive(ev)} style={{
                    padding:'5px 12px',
                    background: ev.isActive?'rgba(255,182,72,0.07)':'rgba(74,222,128,0.07)',
                    border:`1px solid ${ev.isActive?'rgba(255,182,72,0.22)':'rgba(74,222,128,0.22)'}`,
                    borderRadius:7,
                    color: ev.isActive?'#FFB648':'#4ade80',
                    fontSize:10,fontFamily:"'JetBrains Mono',monospace",
                    letterSpacing:'0.1em',cursor:'pointer' }}>
                    {ev.isActive?'PAUSE':'RESUME'}
                  </button>
                  <button onClick={() => setConfirm(ev.id)} style={{
                    padding:'5px 12px',background:'rgba(255,68,68,0.07)',
                    border:'1px solid rgba(255,68,68,0.22)',borderRadius:7,
                    color:'#ff6b6b',fontSize:10,fontFamily:"'JetBrains Mono',monospace",
                    letterSpacing:'0.1em',cursor:'pointer' }}>DEL</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Right: Add / Edit Form ── */}
        <div style={{ padding:'28px 28px', background:'rgba(4,4,18,0.6)', overflowY:'auto',
          position:'sticky',top:58,height:'calc(100vh - 58px)' }}>

          {/* Form header */}
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
            <div>
              <div style={{ fontSize:13,fontWeight:600,marginBottom:3 }}>
                {editId ? '✏ Edit Event' : '＋ New Event'}
              </div>
              <div style={{ fontSize:9,fontFamily:"'JetBrains Mono',monospace",color:'rgba(0,255,255,0.4)',letterSpacing:'0.12em' }}>
                {editId ? 'MODIFYING EXISTING RECORD' : 'ADDING TO LIVE GLOBE'}
              </div>
            </div>
            {editId && (
              <button onClick={cancelEdit} style={{ padding:'5px 11px',background:'transparent',
                border:'1px solid rgba(255,255,255,0.12)',borderRadius:7,
                color:'rgba(255,255,255,0.4)',fontSize:10,cursor:'pointer' }}>✕ Cancel</button>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Event Name */}
            <div style={s.field}>
              <label style={s.label}>Event Name *</label>
              <input style={s.input} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                placeholder="e.g. Test Event 5" required/>
            </div>

            {/* ── Location Search Autocomplete ── */}
            <div style={{ ...s.field, position:'relative' }} ref={geoRef}>
              <label style={s.label}>🔍 Search Location — auto-fills city, country &amp; coordinates</label>
              <div style={{ position:'relative' }}>
                <input
                  style={{
                    ...s.input,
                    paddingRight: 38,
                    borderColor: showGeo ? 'rgba(0,255,255,0.45)' : 'rgba(0,255,255,0.15)',
                    boxShadow:   showGeo ? '0 0 0 3px rgba(0,255,255,0.07)' : 'none',
                  }}
                  value={geoQuery}
                  onChange={e => { setGeoQuery(e.target.value); setShowGeo(true); }}
                  onKeyDown={onGeoKeyDown}
                  onFocus={() => geoResults.length > 0 && setShowGeo(true)}
                  placeholder="Type any city, state, or country…"
                  autoComplete="off"
                />
                {/* Spinner / search icon */}
                <div style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                  color:'rgba(0,255,255,0.5)', fontSize:14, pointerEvents:'none' }}>
                  {geoLoading
                    ? <span style={{ display:'inline-block', width:13, height:13,
                        border:'1.5px solid rgba(0,255,255,0.2)', borderTopColor:'#00FFFF',
                        borderRadius:'50%', animation:'spin 0.7s linear infinite' }}/>
                    : '🔍'}
                </div>
              </div>

              {/* Suggestions dropdown */}
              {showGeo && geoResults.length > 0 && (
                <div style={{
                  position:'absolute', top:'100%', left:0, right:0, zIndex:300,
                  background:'rgba(6,6,24,0.98)', border:'1px solid rgba(0,255,255,0.22)',
                  borderTop:'none', borderRadius:'0 0 12px 12px',
                  boxShadow:'0 16px 48px rgba(0,0,0,0.7)',
                  maxHeight:280, overflowY:'auto',
                }}>
                  {geoResults.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseEnter={() => setGeoActive(i)}
                      onClick={() => selectGeo(s)}
                      style={{
                        width:'100%', textAlign:'left', background: geoActive===i
                          ? 'rgba(0,255,255,0.08)' : 'transparent',
                        border:'none', borderBottom:'1px solid rgba(255,255,255,0.05)',
                        padding:'10px 14px', cursor:'pointer',
                        transition:'background 0.12s',
                      }}
                    >
                      {/* City + State + Country */}
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                        <span style={{ fontSize:11, color:'rgba(0,255,255,0.5)' }}>📍</span>
                        <span style={{ fontSize:13, fontWeight:600, color:'#fff' }}>
                          {s.city}{s.state ? `, ${s.state}` : ''}
                        </span>
                        <span style={{ fontSize:11, color:'rgba(255,255,255,0.38)',
                          background:'rgba(255,255,255,0.05)', borderRadius:4,
                          padding:'1px 6px', marginLeft:'auto', flexShrink:0 }}>
                          {s.country}
                        </span>
                      </div>
                      {/* Coordinates */}
                      <div style={{ fontSize:10, fontFamily:"'JetBrains Mono',monospace",
                        color:'rgba(0,255,255,0.5)', paddingLeft:20 }}>
                        {s.lat >= 0 ? `${s.lat.toFixed(4)}°N` : `${Math.abs(s.lat).toFixed(4)}°S`}
                        &nbsp;/&nbsp;
                        {s.lng >= 0 ? `${s.lng.toFixed(4)}°E` : `${Math.abs(s.lng).toFixed(4)}°W`}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* No results */}
              {showGeo && !geoLoading && geoQuery.length >= 2 && geoResults.length === 0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:300,
                  background:'rgba(6,6,24,0.98)', border:'1px solid rgba(0,255,255,0.15)',
                  borderTop:'none', borderRadius:'0 0 12px 12px',
                  padding:'14px', textAlign:'center',
                  fontSize:11, fontFamily:"'JetBrains Mono',monospace", color:'rgba(255,255,255,0.3)' }}>
                  No results for &ldquo;{geoQuery}&rdquo; — try a different name
                </div>
              )}
            </div>

            {/* City + Country */}
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,...s.field }}>
              <div>
                <label style={s.label}>City *</label>
                <input style={s.input} value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))}
                  placeholder="Mumbai" required/>
              </div>
              <div>
                <label style={s.label}>Country *</label>
                <input style={s.input} value={form.country} onChange={e=>setForm(f=>({...f,country:e.target.value}))}
                  placeholder="India" required/>
              </div>
            </div>

            {/* Lat + Lng */}
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,...s.field }}>
              <div>
                <label style={s.label}>Latitude (-90 to 90)</label>
                <input type="number" step="0.01" min="-90" max="90" style={s.input}
                  value={form.lat} onChange={e=>setForm(f=>({...f,lat:parseFloat(e.target.value)||0}))}
                  placeholder="19.08"/>
              </div>
              <div>
                <label style={s.label}>Longitude (-180 to 180)</label>
                <input type="number" step="0.01" min="-180" max="180" style={s.input}
                  value={form.lng} onChange={e=>setForm(f=>({...f,lng:parseFloat(e.target.value)||0}))}
                  placeholder="72.88"/>
              </div>
            </div>

            {/* Lat/Lng preview */}
            <div style={{ background:'rgba(0,255,255,0.04)',border:'1px solid rgba(0,255,255,0.08)',
              borderRadius:8,padding:'8px 12px',marginBottom:14,display:'flex',gap:14 }}>
              <div style={{ fontSize:9,fontFamily:"'JetBrains Mono',monospace",color:'rgba(0,255,255,0.5)',letterSpacing:'0.1em' }}>
                📍 PREVIEW
              </div>
              <div style={{ fontSize:11,fontFamily:"'JetBrains Mono',monospace",color:'rgba(0,255,255,0.8)' }}>
                {form.lat>=0?`${form.lat.toFixed(2)}°N`:`${Math.abs(form.lat).toFixed(2)}°S`}
                {' / '}
                {form.lng>=0?`${form.lng.toFixed(2)}°E`:`${Math.abs(form.lng).toFixed(2)}°W`}
              </div>
            </div>

            {/* Users */}
            <div style={s.field}>
              <label style={s.label}>Active Users</label>
              <input style={s.input} value={form.users} onChange={e=>setForm(f=>({...f,users:e.target.value}))}
                placeholder="e.g. 1.2K or 847"/>
            </div>

            {/* Category */}
            <div style={s.field}>
              <label style={s.label}>Category</label>
              <input style={s.input} value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}
                placeholder="Technology, Innovation..."/>
            </div>

            {/* Duration */}
            <div style={s.field}>
              <label style={s.label}>Duration</label>
              <input style={s.input} value={form.duration} onChange={e=>setForm(f=>({...f,duration:e.target.value}))}
                placeholder="3 Days, 48 Hours..."/>
            </div>

            {/* Color picker */}
            <div style={s.field}>
              <label style={s.label}>Marker Color</label>
              <div style={{ display:'flex',gap:10 }}>
                {[['#00FFFF','Cyber Cyan'],['#A855F7','Electric Purple'],['#4ade80','Neon Green'],['#FFB648','Solar Gold']].map(([c,n])=>(
                  <button key={c} type="button" onClick={()=>setForm(f=>({...f,color:c}))} style={{
                    flex:1,padding:'10px 0',borderRadius:9,cursor:'pointer',
                    background: form.color===c?`${c}22`:'rgba(255,255,255,0.03)',
                    border:`1px solid ${form.color===c?c:'rgba(255,255,255,0.08)'}`,
                    boxShadow: form.color===c?`0 0 16px ${c}44`:'none',
                    transition:'all 0.2s',display:'flex',flexDirection:'column',alignItems:'center',gap:5,
                  }}>
                    <div style={{ width:14,height:14,borderRadius:'50%',background:c,boxShadow:`0 0 8px ${c}` }}/>
                    <div style={{ fontSize:8,fontFamily:"'JetBrains Mono',monospace",color:'rgba(255,255,255,0.4)',
                      letterSpacing:'0.08em',textAlign:'center',lineHeight:1.3 }}>{n}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} style={{
              width:'100%',padding:'13px 0',marginTop:4,
              background: loading?'rgba(0,255,255,0.05)':'linear-gradient(90deg,rgba(0,255,255,0.15),rgba(138,43,226,0.15))',
              border:`1px solid ${loading?'rgba(0,255,255,0.15)':'rgba(0,255,255,0.35)'}`,
              borderRadius:12,color:loading?'rgba(255,255,255,0.35)':'#00FFFF',
              fontSize:11,fontFamily:"'JetBrains Mono',monospace",fontWeight:700,
              letterSpacing:'0.18em',cursor:loading?'not-allowed':'pointer',transition:'all 0.22s',
              display:'flex',alignItems:'center',justifyContent:'center',gap:8,
            }}>
              {loading
                ? <><span style={{ display:'inline-block',width:11,height:11,border:'1.5px solid rgba(0,255,255,0.3)',
                    borderTopColor:'#00FFFF',borderRadius:'50%',animation:'spin 0.8s linear infinite' }}/>SAVING...</>
                : <>{editId ? '💾 SAVE CHANGES' : '＋ ADD TO GLOBE'} →</>
              }
            </button>
          </form>

          {/* Tips */}
          <div style={{ marginTop:24,padding:'14px',background:'rgba(138,43,226,0.06)',
            border:'1px solid rgba(138,43,226,0.15)',borderRadius:10 }}>
            <div style={{ fontSize:9,fontFamily:"'JetBrains Mono',monospace",color:'rgba(168,85,247,0.6)',
              letterSpacing:'0.12em',marginBottom:8 }}>📡 COORDINATE REFERENCE</div>
            {[['Mumbai, India','19.08','72.88'],['Paris, France','48.86','2.35'],
              ['New York, USA','40.71','-74.01'],['Tokyo, Japan','35.68','139.69'],
              ['London, UK','51.51','-0.13'],['Sydney, Australia','-33.87','151.21'],
            ].map(([city,lat,lng])=>(
              <button key={city} type="button"
                onClick={()=>setForm(f=>({...f,city:city.split(',')[0],country:city.split(', ')[1],
                  lat:parseFloat(lat),lng:parseFloat(lng)}))}
                style={{ display:'flex',justifyContent:'space-between',width:'100%',background:'transparent',
                  border:'none',fontSize:10,color:'rgba(255,255,255,0.3)',fontFamily:"'JetBrains Mono',monospace",
                  padding:'4px 0',borderBottom:'1px solid rgba(255,255,255,0.04)',cursor:'pointer',textAlign:'left' }}>
                <span>{city}</span>
                <span style={{color:'rgba(0,255,255,0.4)'}}>{lat}°, {lng}°</span>
              </button>
            ))}
          </div>
          <div style={{ marginTop:8,fontSize:9,fontFamily:"'JetBrains Mono',monospace",
            color:'rgba(255,255,255,0.2)',textAlign:'center' }}>
            Click a city above to auto-fill coordinates
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
