'use client';

// src/app/admin/login/page.tsx
// Premium admin login screen — dark spatial aesthetic
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [show, setShow]         = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push('/admin');
      } else {
        const data = await res.json();
        setError(data.error || 'Invalid credentials');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 40%, #0d0825 0%, #0A0A1A 65%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Outfit', sans-serif",
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Animated grid background */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(0,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
        maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
      }} />

      {/* Glow orbs */}
      <div style={{ position:'absolute', top:'20%', left:'20%', width:300, height:300,
        background:'radial-gradient(circle, rgba(138,43,226,0.12), transparent 70%)', borderRadius:'50%', filter:'blur(40px)' }}/>
      <div style={{ position:'absolute', bottom:'20%', right:'20%', width:250, height:250,
        background:'radial-gradient(circle, rgba(0,255,255,0.10), transparent 70%)', borderRadius:'50%', filter:'blur(40px)' }}/>

      {/* Card */}
      <div style={{
        position: 'relative', width: 380, padding: '40px 36px 36px',
        background: 'linear-gradient(145deg, rgba(6,6,22,0.95) 0%, rgba(12,6,30,0.92) 100%)',
        backdropFilter: 'blur(32px)', border: '1px solid rgba(0,255,255,0.18)',
        borderRadius: 24,
        boxShadow: '0 0 0 1px rgba(138,43,226,0.08), 0 24px 80px rgba(0,0,0,0.7), 0 0 80px rgba(0,255,255,0.06)',
      }}>
        {/* Corner brackets */}
        {['tl','tr','bl','br'].map(c => (
          <div key={c} style={{
            position:'absolute',
            width:16, height:16,
            borderColor:'#00FFFF', borderStyle:'solid', borderWidth:0,
            ...(c==='tl'&&{top:10,left:10,borderTopWidth:2,borderLeftWidth:2,borderTopLeftRadius:4}),
            ...(c==='tr'&&{top:10,right:10,borderTopWidth:2,borderRightWidth:2,borderTopRightRadius:4}),
            ...(c==='bl'&&{bottom:10,left:10,borderBottomWidth:2,borderLeftWidth:2,borderBottomLeftRadius:4}),
            ...(c==='br'&&{bottom:10,right:10,borderBottomWidth:2,borderRightWidth:2,borderBottomRightRadius:4}),
          }}/>
        ))}

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{
            width:52, height:52, borderRadius:'50%', margin:'0 auto 14px',
            background:'rgba(0,255,255,0.08)', border:'1px solid rgba(0,255,255,0.25)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 0 24px rgba(0,255,255,0.15)',
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#00FFFF" strokeWidth="1.8" width="24" height="24">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          </div>
          <div style={{ fontSize:22, fontWeight:700, color:'#fff', letterSpacing:'-0.01em' }}>
            Globe<span style={{ color:'#00FFFF' }}>X</span>
          </div>
          <div style={{ fontSize:10, fontFamily:"'JetBrains Mono', monospace", color:'rgba(0,255,255,0.5)',
            letterSpacing:'0.2em', marginTop:5 }}>
            ADMIN PORTAL
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:9, fontFamily:"'JetBrains Mono', monospace",
              color:'rgba(255,255,255,0.4)', letterSpacing:'0.15em', display:'block', marginBottom:7 }}>
              ACCESS CODE
            </label>
            <div style={{ position:'relative' }}>
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter admin password"
                required
                autoFocus
                style={{
                  width:'100%', boxSizing:'border-box',
                  padding:'11px 40px 11px 14px',
                  background:'rgba(0,255,255,0.04)', border:'1px solid rgba(0,255,255,0.18)',
                  borderRadius:10, color:'#fff', fontSize:14,
                  fontFamily:"'Outfit', sans-serif", outline:'none',
                  transition:'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor='rgba(0,255,255,0.5)'}
                onBlur={e  => e.target.style.borderColor='rgba(0,255,255,0.18)'}
              />
              <button type="button" onClick={() => setShow(s=>!s)}
                style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.35)',
                  fontSize:13, padding:'2px 4px' }}>
                {show ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background:'rgba(255,68,68,0.10)', border:'1px solid rgba(255,68,68,0.25)',
              borderRadius:8, padding:'9px 12px', marginBottom:14, fontSize:12,
              color:'#ff6b6b', display:'flex', alignItems:'center', gap:7 }}>
              ⚠ {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width:'100%', padding:'13px 0',
            background: loading ? 'rgba(0,255,255,0.06)' : 'linear-gradient(90deg, rgba(0,255,255,0.15), rgba(138,43,226,0.15))',
            border:'1px solid rgba(0,255,255,0.3)', borderRadius:12,
            color: loading ? 'rgba(255,255,255,0.4)' : '#00FFFF',
            fontSize:11, fontFamily:"'JetBrains Mono', monospace", fontWeight:700,
            letterSpacing:'0.2em', cursor: loading ? 'not-allowed' : 'pointer',
            transition:'all 0.22s', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          }}>
            {loading ? (
              <>
                <span style={{ display:'inline-block', width:12, height:12, border:'1.5px solid rgba(0,255,255,0.3)',
                  borderTopColor:'#00FFFF', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
                AUTHENTICATING
              </>
            ) : (
              <>ACCESS SYSTEM →</>
            )}
          </button>
        </form>

        <div style={{ textAlign:'center', marginTop:20, fontSize:10,
          fontFamily:"'JetBrains Mono', monospace", color:'rgba(255,255,255,0.2)', letterSpacing:'0.1em' }}>
          GlobeX Admin · Secure Session · 24h Expiry
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=JetBrains+Mono:wght@400;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0A0A1A; }
      `}</style>
    </div>
  );
}
