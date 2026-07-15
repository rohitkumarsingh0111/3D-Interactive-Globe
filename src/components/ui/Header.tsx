'use client';
// src/components/ui/Header.tsx
// Navigation bar with functional tabs + admin quick-add button

import { useState, useEffect } from 'react';
import type { GlobeEvent } from '@/types/globe';

export type NavTab = 'globe' | 'events' | 'analytics' | 'network';

interface HeaderProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  events: GlobeEvent[];
  onEventAdded?: () => void;
}

const NAV: { id: NavTab; label: string; icon: string }[] = [
  { id: 'globe',     label: 'Globe',     icon: '🌐' },
  { id: 'events',    label: 'Events',    icon: '📡' },
  { id: 'analytics', label: 'Analytics', icon: '📊' },
  { id: 'network',   label: 'Network',   icon: '🔗' },
];

export default function Header({ activeTab, onTabChange, events = [], onEventAdded }: HeaderProps) {
  const [isAdmin, setIsAdmin]       = useState(false);
  const [showModal, setShowModal]   = useState(false);
  const liveCount = events.length;

  // Check if user has an active admin session
  useEffect(() => {
    fetch('/api/admin/verify').then(r => setIsAdmin(r.ok)).catch(() => setIsAdmin(false));
  }, []);

  return (
    <>
      <header className="hdr">
        {/* Logo */}
        <div className="hdr-logo">
          <div className="hdr-logo-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="#00FFFF" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2"  y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          </div>
          <div className="hdr-logo-text">Globe<span>X</span></div>
        </div>

        {/* Nav tabs */}
        <nav className="hdr-nav" role="navigation" aria-label="Main navigation">
          {NAV.map(({ id, label, icon }) => (
            <button
              key={id}
              className={`hdr-nav-pill${activeTab === id ? ' active' : ''}`}
              onClick={() => onTabChange(activeTab === id && id !== 'globe' ? 'globe' : id)}
              aria-current={activeTab === id ? 'page' : undefined}
            >
              <span style={{ marginRight: 5, fontSize: 13 }}>{icon}</span>{label}
            </button>
          ))}
        </nav>

        {/* Right side */}
        <div className="hdr-right">
          <div className="live-badge" role="status" aria-live="polite">
            <div className="live-dot" />
            <span>{liveCount} LIVE EVENT{liveCount !== 1 ? 'S' : ''}</span>
          </div>

          {/* Admin area — login button when guest, add-event when logged in */}
          {isAdmin ? (
            <button
              className="add-event-btn"
              onClick={() => setShowModal(true)}
              aria-label="Add new event"
              title="Add a new event to the globe"
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>＋</span>
              <span>Add Event</span>
            </button>
          ) : (
            <a
              href="/admin/login"
              className="admin-login-btn"
              aria-label="Admin login"
              title="Admin login"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </a>
          )}
        </div>
      </header>

      {/* Quick-add modal */}
      {showModal && <QuickAddModal onClose={() => { setShowModal(false); onEventAdded?.(); }} />}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   QUICK-ADD MODAL  (admin-only inline event creator)
───────────────────────────────────────────────────────────── */
interface GeoHit { displayName: string; city: string; state: string; country: string; lat: number; lng: number; }

function QuickAddModal({ onClose }: { onClose: () => void }) {
  const [form, setForm]         = useState({ name: '', city: '', country: '', lat: 0, lng: 0, users: '', category: '', duration: '', color: '#00FFFF' });
  const [geoQ, setGeoQ]         = useState('');
  const [hits, setHits]         = useState<GeoHit[]>([]);
  const [geoOpen, setGeoOpen]   = useState(false);
  const [geoSpin, setGeoSpin]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState('');
  const [done, setDone]         = useState(false);

  // Debounced geocode
  useEffect(() => {
    if (geoQ.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(async () => {
      setGeoSpin(true);
      try {
        const r = await fetch(`/api/geocode?q=${encodeURIComponent(geoQ)}`);
        if (r.ok) { const d = await r.json(); setHits(d); setGeoOpen(d.length > 0); }
      } finally { setGeoSpin(false); }
    }, 420);
    return () => clearTimeout(t);
  }, [geoQ]);

  function pick(h: GeoHit) {
    setForm(f => ({ ...f, city: h.city, country: h.country, lat: h.lat, lng: h.lng }));
    setGeoQ(`${h.city}${h.state ? ', ' + h.state : ''}, ${h.country}`);
    setGeoOpen(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.city || !form.country) { setErr('Fill Name, City and Country'); return; }
    setSaving(true); setErr('');
    try {
      const r = await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (r.ok) { setDone(true); setTimeout(onClose, 1600); }
      else { const d = await r.json(); setErr(d.error || 'Failed'); }
    } catch { setErr('Network error'); }
    finally { setSaving(false); }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px', background: 'rgba(0,255,255,0.04)',
    border: '1px solid rgba(0,255,255,0.18)', borderRadius: 9, color: '#fff',
    fontSize: 13, fontFamily: "'Outfit',sans-serif", outline: 'none', boxSizing: 'border-box',
  };
  const lbl: React.CSSProperties = {
    fontSize: 9, fontFamily: "'JetBrains Mono',monospace", color: 'rgba(255,255,255,0.38)',
    letterSpacing: '0.14em', textTransform: 'uppercase', display: 'block', marginBottom: 5,
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.65)',
      backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="quick-add-modal-inner" style={{ width: 460, maxWidth: '95vw', background: 'rgba(6,6,22,0.98)',
        border: '1px solid rgba(0,255,255,0.22)', borderRadius: 20,
        boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 0 60px rgba(0,255,255,0.06)',
        padding: '28px 28px 24px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>

        {/* Corner brackets */}
        {(['tl','tr','bl','br'] as const).map(c => (
          <div key={c} style={{ position:'absolute', width:14, height:14,
            borderColor:'#00FFFF', borderStyle:'solid', borderWidth:0,
            ...(c==='tl'&&{top:10,left:10,borderTopWidth:2,borderLeftWidth:2}),
            ...(c==='tr'&&{top:10,right:10,borderTopWidth:2,borderRightWidth:2}),
            ...(c==='bl'&&{bottom:10,left:10,borderBottomWidth:2,borderLeftWidth:2}),
            ...(c==='br'&&{bottom:10,right:10,borderBottomWidth:2,borderRightWidth:2}),
          }}/>
        ))}

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:22 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700 }}>＋ Add New Event</div>
            <div style={{ fontSize:9, fontFamily:"'JetBrains Mono',monospace", color:'rgba(0,255,255,0.4)',
              letterSpacing:'0.14em', marginTop:4 }}>POSTING TO LIVE GLOBE</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'1px solid rgba(255,255,255,0.12)',
            borderRadius:7, color:'rgba(255,255,255,0.4)', fontSize:13, cursor:'pointer', padding:'4px 9px' }}>✕</button>
        </div>

        {done ? (
          <div style={{ textAlign:'center', padding:'32px 0' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
            <div style={{ fontSize:15, fontWeight:600, color:'#4ade80' }}>Event Added!</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:6 }}>
              Appearing on globe in seconds…
            </div>
          </div>
        ) : (
          <form onSubmit={submit}>
            {/* Event name */}
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>Event Name *</label>
              <input style={inp} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                placeholder="e.g. Tech Summit 2025" required autoFocus/>
            </div>

            {/* Geo search */}
            <div style={{ marginBottom:14, position:'relative' }}>
              <label style={lbl}>🔍 Search Location — auto-fills city, country & coordinates</label>
              <div style={{ position:'relative' }}>
                <input style={{ ...inp, paddingRight:34 }} value={geoQ}
                  onChange={e=>{ setGeoQ(e.target.value); setGeoOpen(true); }}
                  onFocus={()=>hits.length>0&&setGeoOpen(true)}
                  placeholder="Type city, state, or country…" autoComplete="off"/>
                <div style={{ position:'absolute',right:11,top:'50%',transform:'translateY(-50%)',
                  fontSize:13,color:'rgba(0,255,255,0.45)',pointerEvents:'none' }}>
                  {geoSpin
                    ? <span style={{ display:'inline-block',width:12,height:12,
                        border:'1.5px solid rgba(0,255,255,0.2)',borderTopColor:'#00FFFF',
                        borderRadius:'50%',animation:'qs-spin 0.7s linear infinite' }}/>
                    : '🔍'}
                </div>
              </div>
              {geoOpen && hits.length > 0 && (
                <div style={{ position:'absolute',top:'100%',left:0,right:0,zIndex:50,
                  background:'rgba(6,6,24,0.98)',border:'1px solid rgba(0,255,255,0.22)',
                  borderTop:'none',borderRadius:'0 0 10px 10px',
                  boxShadow:'0 12px 40px rgba(0,0,0,0.7)',maxHeight:220,overflowY:'auto' }}>
                  {hits.map((h,i)=>(
                    <button key={i} type="button" onClick={()=>pick(h)} style={{
                      width:'100%',textAlign:'left',background:'transparent',border:'none',
                      borderBottom:'1px solid rgba(255,255,255,0.05)',
                      padding:'9px 14px',cursor:'pointer',transition:'background 0.12s' }}
                      onMouseEnter={e=>(e.currentTarget.style.background='rgba(0,255,255,0.07)')}
                      onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                      <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                        <span style={{ fontSize:11,color:'rgba(0,255,255,0.5)' }}>📍</span>
                        <span style={{ fontSize:13,fontWeight:600,color:'#fff' }}>
                          {h.city}{h.state?`, ${h.state}`:''}
                        </span>
                        <span style={{ marginLeft:'auto',fontSize:10,color:'rgba(255,255,255,0.35)',
                          background:'rgba(255,255,255,0.05)',borderRadius:4,padding:'1px 6px',flexShrink:0 }}>
                          {h.country}
                        </span>
                      </div>
                      <div style={{ fontSize:10,fontFamily:"'JetBrains Mono',monospace",
                        color:'rgba(0,255,255,0.45)',paddingLeft:20,marginTop:2 }}>
                        {h.lat>=0?`${h.lat.toFixed(4)}°N`:`${Math.abs(h.lat).toFixed(4)}°S`}
                        {' / '}
                        {h.lng>=0?`${h.lng.toFixed(4)}°E`:`${Math.abs(h.lng).toFixed(4)}°W`}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* City + Country */}
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14 }}>
              <div>
                <label style={lbl}>City *</label>
                <input style={inp} value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))} placeholder="Mumbai" required/>
              </div>
              <div>
                <label style={lbl}>Country *</label>
                <input style={inp} value={form.country} onChange={e=>setForm(f=>({...f,country:e.target.value}))} placeholder="India" required/>
              </div>
            </div>

            {/* Lat + Lng */}
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14 }}>
              <div>
                <label style={lbl}>Latitude</label>
                <input type="number" step="0.0001" style={inp} value={form.lat}
                  onChange={e=>setForm(f=>({...f,lat:parseFloat(e.target.value)||0}))} placeholder="19.0760"/>
              </div>
              <div>
                <label style={lbl}>Longitude</label>
                <input type="number" step="0.0001" style={inp} value={form.lng}
                  onChange={e=>setForm(f=>({...f,lng:parseFloat(e.target.value)||0}))} placeholder="72.8777"/>
              </div>
            </div>

            {/* Users + Category */}
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14 }}>
              <div>
                <label style={lbl}>Active Users</label>
                <input style={inp} value={form.users} onChange={e=>setForm(f=>({...f,users:e.target.value}))} placeholder="1.2K"/>
              </div>
              <div>
                <label style={lbl}>Category</label>
                <input style={inp} value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} placeholder="Technology"/>
              </div>
            </div>

            {/* Duration + Color */}
            <div style={{ display:'grid',gridTemplateColumns:'1fr auto',gap:10,marginBottom:20 }}>
              <div>
                <label style={lbl}>Duration</label>
                <input style={inp} value={form.duration} onChange={e=>setForm(f=>({...f,duration:e.target.value}))} placeholder="3 Days"/>
              </div>
              <div>
                <label style={lbl}>Marker</label>
                <div style={{ display:'flex',gap:6,paddingTop:2 }}>
                  {[['#00FFFF','Cyan'],['#A855F7','Purple'],['#4ade80','Green'],['#FFB648','Gold']].map(([c])=>(
                    <button key={c} type="button" onClick={()=>setForm(f=>({...f,color:c}))} style={{
                      width:28,height:28,borderRadius:'50%',background:c,border: form.color===c?`2px solid #fff`:'2px solid transparent',
                      cursor:'pointer',boxShadow:`0 0 ${form.color===c?12:6}px ${c}`,transition:'all 0.18s' }}/>
                  ))}
                </div>
              </div>
            </div>

            {err && <div style={{ background:'rgba(255,68,68,0.1)',border:'1px solid rgba(255,68,68,0.3)',
              borderRadius:8,padding:'8px 12px',marginBottom:12,color:'#ff6b6b',fontSize:12 }}>⚠ {err}</div>}

            <button type="submit" disabled={saving} style={{
              width:'100%',padding:'12px 0',
              background:'linear-gradient(90deg,rgba(0,255,255,0.15),rgba(138,43,226,0.15))',
              border:'1px solid rgba(0,255,255,0.35)',borderRadius:11,
              color:'#00FFFF',fontSize:11,fontFamily:"'JetBrains Mono',monospace",
              fontWeight:700,letterSpacing:'0.18em',cursor:saving?'not-allowed':'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
              {saving
                ? <><span style={{ display:'inline-block',width:11,height:11,
                    border:'1.5px solid rgba(0,255,255,0.3)',borderTopColor:'#00FFFF',
                    borderRadius:'50%',animation:'qs-spin 0.7s linear infinite' }}/>PUBLISHING…</>
                : <>＋ PUBLISH TO GLOBE →</>}
            </button>
          </form>
        )}
        <style>{`@keyframes qs-spin { to { transform:rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
