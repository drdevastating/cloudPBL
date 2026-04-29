import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─────────────────────────── Constants ──────────────────────────────

const DEMO_RESTAURANTS = [
  { id: 1, name: 'Bikanervala', cuisine: 'North Indian', x: 16.0, y: 20.5, emoji: '🍛', items: ['Paneer Roll ₹120', 'Dal Makhani ₹180', 'Gulab Jamun ₹60'], amount: 360 },
  { id: 2, name: 'Burger Singh', cuisine: 'Burgers', x: 32.5, y: 26.5, emoji: '🍔', items: ['Singh Burger ₹199', 'Fries ₹79', 'Oreo Shake ₹149'], amount: 427 },
  { id: 3, name: "Haldiram's", cuisine: 'Snacks', x: 35.5, y: 14.0, emoji: '🥗', items: ['Aloo Chaat ₹89', 'Kaju Barfi ₹199', 'Nimki ₹59'], amount: 347 },
  { id: 4, name: 'Pizza Hut', cuisine: 'Pizza', x: 24.0, y: 36.0, emoji: '🍕', items: ['Margherita ₹299', 'Garlic Bread ₹149', 'Cold Coffee ₹99'], amount: 547 },
  { id: 5, name: 'Wow! Momo', cuisine: 'Momos', x: 42.0, y: 30.5, emoji: '🥟', items: ['Steam Momos ₹120', 'Schezwan Momos ₹140', 'Soup ₹79'], amount: 339 },
];

const API = 'http://localhost:8000';

// ─────────────────────────── Styles ──────────────────────────────────

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:       #0a0a0f;
    --bg2:      #12121a;
    --bg3:      #1a1a26;
    --surface:  #1e1e2e;
    --border:   rgba(255,255,255,0.07);
    --border2:  rgba(255,255,255,0.14);
    --text:     #e8e8f0;
    --text2:    #8888aa;
    --text3:    #44445a;
    --brand:    #ff4d6d;
    --brand2:   #ff6b35;
    --green:    #2dd4a0;
    --amber:    #fbbf24;
    --blue:     #60a5fa;
    --purple:   #a78bfa;
    --red:      #f87171;
    --font:     'Space Grotesk', sans-serif;
    --mono:     'Space Mono', monospace;
  }

  html, body, #root { height: 100%; width: 100%; overflow: hidden; }
  body { background: var(--bg); color: var(--text); font-family: var(--font); -webkit-font-smoothing: antialiased; }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

  .app { display: flex; flex-direction: column; height: 100%; }

  /* ── Header ── */
  .header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 24px; border-bottom: 1px solid var(--border);
    background: var(--bg); flex-shrink: 0; z-index: 10;
  }
  .logo { display: flex; align-items: center; gap: 10px; }
  .logo-icon { font-size: 20px; }
  .logo-text { font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
  .logo-text span { color: var(--brand); }
  .header-badge {
    display: flex; align-items: center; gap: 6px; padding: 5px 12px;
    border: 1px solid var(--border2); border-radius: 99px;
    font-size: 11px; color: var(--text2); font-family: var(--mono);
  }
  .dot-pulse { width: 6px; height: 6px; border-radius: 50%; background: var(--green); animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }

  /* ── Main Layout ── */
  .main { display: flex; flex: 1; overflow: hidden; }

  /* ── Left Panel ── */
  .left { width: 360px; flex-shrink: 0; background: var(--bg2); border-right: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; }
  .panel-section { padding: 16px; border-bottom: 1px solid var(--border); }
  .panel-title { font-size: 10px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text3); margin-bottom: 12px; }

  /* Restaurant list */
  .rest-list { overflow-y: auto; flex: 1; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
  .rest-card {
    display: flex; align-items: center; gap: 12px; padding: 12px;
    background: var(--bg3); border: 1px solid var(--border);
    border-radius: 10px; cursor: pointer; transition: all 0.15s;
  }
  .rest-card:hover { border-color: var(--border2); transform: translateX(2px); }
  .rest-card.selected { border-color: var(--brand); background: rgba(255,77,109,0.08); }
  .rest-emoji { font-size: 28px; flex-shrink: 0; }
  .rest-info { flex: 1; min-width: 0; }
  .rest-name { font-size: 13px; font-weight: 600; }
  .rest-cuisine { font-size: 11px; color: var(--text2); margin-top: 2px; }
  .rest-amount { font-size: 13px; font-weight: 600; color: var(--brand); font-family: var(--mono); }

  /* Place order button */
  .place-btn {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    background: linear-gradient(135deg, var(--brand), var(--brand2));
    color: #fff; font-size: 14px; font-weight: 600; font-family: var(--font);
    padding: 13px; border-radius: 10px; border: none; cursor: pointer;
    transition: all 0.2s; letter-spacing: 0.2px; width: 100%;
  }
  .place-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
  .place-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .place-btn.loading { opacity: 0.75; }

  /* Reset button */
  .reset-btn {
    background: transparent; border: 1px solid var(--border2); color: var(--text2);
    font-size: 11px; padding: 6px 12px; border-radius: 6px; cursor: pointer;
    font-family: var(--mono); transition: all 0.15s;
  }
  .reset-btn:hover { border-color: var(--text2); color: var(--text); }

  /* ── Right Panel ── */
  .right { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

  /* ── Grid Map ── */
  .grid-section { flex: 0 0 auto; padding: 16px; border-bottom: 1px solid var(--border); background: var(--bg); }
  .grid-title { font-size: 10px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text3); margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }
  .grid-wrap { display: flex; gap: 16px; align-items: flex-start; }
  .grid-canvas { position: relative; flex-shrink: 0; }
  .grid-legend { display: flex; flex-direction: column; gap: 6px; }
  .legend-item { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--text2); }
  .legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

  /* ── Dispatch Log ── */
  .log-section { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
  .log-header { padding: 12px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
  .log-title { font-size: 10px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text3); }
  .log-entries { flex: 1; overflow-y: auto; padding: 12px 16px; display: flex; flex-direction: column; gap: 4px; }
  .log-entry {
    display: flex; align-items: flex-start; gap: 10px; padding: 7px 10px;
    border-radius: 6px; font-family: var(--mono); font-size: 12px;
    background: var(--bg3); border: 1px solid transparent;
    animation: slideIn 0.2s ease;
  }
  @keyframes slideIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  .log-entry.info    { color: var(--text); border-color: var(--border); }
  .log-entry.success { color: var(--green); border-color: rgba(45,212,160,0.2); background: rgba(45,212,160,0.06); }
  .log-entry.warn    { color: var(--amber); border-color: rgba(251,191,36,0.2); background: rgba(251,191,36,0.06); }
  .log-entry.error   { color: var(--red); border-color: rgba(248,113,113,0.2); background: rgba(248,113,113,0.06); }
  .log-time { color: var(--text3); flex-shrink: 0; font-size: 10px; margin-top: 1px; }
  .log-msg { flex: 1; line-height: 1.5; }

  /* Empty state */
  .log-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 8px; color: var(--text3); font-size: 13px; }
  .log-empty-icon { font-size: 32px; opacity: 0.3; }

  /* Status badge */
  .status-badge {
    padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 600;
    font-family: var(--mono); letter-spacing: 0.3px;
  }
  .status-badge.idle     { background: rgba(96,165,250,0.15); color: var(--blue); }
  .status-badge.dispatch { background: rgba(167,139,250,0.15); color: var(--purple); animation: blink 1s infinite; }
  .status-badge.assigned { background: rgba(45,212,160,0.15); color: var(--green); }
  .status-badge.failed   { background: rgba(248,113,113,0.15); color: var(--red); }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.5} }

  /* Rider card */
  .rider-card {
    margin: 12px 16px; padding: 14px; background: var(--bg3);
    border: 1px solid rgba(45,212,160,0.3); border-radius: 10px;
    animation: slideIn 0.3s ease;
  }
  .rider-card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
  .rider-avatar { font-size: 28px; }
  .rider-name { font-size: 14px; font-weight: 600; }
  .rider-meta { font-size: 11px; color: var(--text2); margin-top: 2px; }
  .rider-stats { display: flex; gap: 12px; }
  .rider-stat { font-size: 11px; color: var(--text2); font-family: var(--mono); }
  .rider-stat span { color: var(--text); font-weight: 600; }

  /* Spinner */
  .spin { animation: spin 0.8s linear infinite; display: inline-block; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Setup Screen */
  .setup-screen {
    position: fixed; inset: 0; background: var(--bg); z-index: 100;
    display: flex; align-items: center; justify-content: center;
  }
  .setup-card {
    background: var(--bg2); border: 1px solid var(--border);
    padding: 32px; border-radius: 16px; width: 400px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.4);
  }
  .setup-title { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
  .setup-subtitle { color: var(--text2); font-size: 14px; margin-bottom: 24px; }
  .form-group { margin-bottom: 16px; }
  .form-label { display: block; font-size: 12px; font-weight: 600; color: var(--text3); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px; }
  .form-input {
    width: 100%; background: var(--bg3); border: 1px solid var(--border);
    color: var(--text); padding: 12px; border-radius: 8px; font-family: var(--font);
    font-size: 14px; outline: none; transition: border-color 0.2s;
  }
  .form-input:focus { border-color: var(--brand); }
  .form-row { display: flex; gap: 16px; }
  .form-row .form-group { flex: 1; }
  .setup-btn {
    width: 100%; padding: 14px; background: linear-gradient(135deg, var(--brand), var(--brand2));
    color: #fff; border: none; border-radius: 8px; font-weight: 600;
    font-size: 15px; cursor: pointer; margin-top: 10px; transition: opacity 0.2s;
  }
  .setup-btn:hover { opacity: 0.9; }
`;

// ─────────────────────────── Grid Map ─────────────────────────────────

function GridMap({ riders, selectedRestaurant, tryingRiderId, userX, userY }) {
  const SIZE = 260;
  const GRID = 50;
  const PAD = 20;
  const CELL = (SIZE - PAD * 2) / GRID;

  const toSvg = (val) => PAD + (val / GRID) * (SIZE - PAD * 2);

  const getRiderColor = (r) => {
    if (r.status === 'busy') return '#f87171';
    if (r.id === tryingRiderId) return '#fbbf24';
    if (r.status === 'candidate') return '#a78bfa';
    return '#60a5fa';
  };

  return (
    <svg width={SIZE} height={SIZE} style={{ background: 'var(--bg3)', borderRadius: 10, border: '1px solid var(--border)' }}>
      {/* Grid lines (drawn every 5 units) */}
      {Array.from({ length: 11 }).map((_, i) => (
        <React.Fragment key={i}>
          <line x1={PAD + i * 5 * CELL} y1={PAD} x2={PAD + i * 5 * CELL} y2={SIZE - PAD}
            stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <line x1={PAD} y1={PAD + i * 5 * CELL} x2={SIZE - PAD} y2={PAD + i * 5 * CELL}
            stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        </React.Fragment>
      ))}

      {/* Restaurant */}
      {selectedRestaurant && (
        <g>
          <circle cx={toSvg(selectedRestaurant.x)} cy={toSvg(selectedRestaurant.y)}
            r={10} fill="rgba(255,107,53,0.2)" stroke="var(--brand2)" strokeWidth={1.5} />
          <text x={toSvg(selectedRestaurant.x)} y={toSvg(selectedRestaurant.y) + 1}
            textAnchor="middle" dominantBaseline="middle" fontSize={12}>{selectedRestaurant.emoji}</text>
        </g>
      )}

      {/* Riders */}
      {riders.map(r => (
        <g key={r.id}>
          {r.id === tryingRiderId && (
            <circle cx={toSvg(r.x)} cy={toSvg(r.y)} r={14}
              fill="none" stroke="var(--amber)" strokeWidth={1.5} strokeDasharray="3 2">
              <animateTransform attributeName="transform" type="rotate"
                from={`0 ${toSvg(r.x)} ${toSvg(r.y)}`} to={`360 ${toSvg(r.x)} ${toSvg(r.y)}`}
                dur="2s" repeatCount="indefinite" />
            </circle>
          )}
          <circle cx={toSvg(r.x)} cy={toSvg(r.y)} r={6}
            fill={getRiderColor(r)} opacity={r.status === 'busy' ? 0.4 : 1} />
          <text x={toSvg(r.x) + 8} y={toSvg(r.y) - 6} fontSize={8}
            fill="var(--text3)">{r.id}</text>
        </g>
      ))}

      {/* User */}
      <g>
        <circle cx={toSvg(userX)} cy={toSvg(userY)} r={9}
          fill="rgba(255,77,109,0.2)" stroke="var(--brand)" strokeWidth={2} />
        <text x={toSvg(userX)} y={toSvg(userY) + 1}
          textAnchor="middle" dominantBaseline="middle" fontSize={11}>🏠</text>
      </g>
    </svg>
  );
}

// ─────────────────────────── Main App ────────────────────────────────

export default function App() {
  const [setupComplete, setSetupComplete] = useState(false);
  const [userName, setUserName] = useState('');
  const [userX, setUserX] = useState('');
  const [userY, setUserY] = useState('');

  const [selectedRest, setSelectedRest] = useState(DEMO_RESTAURANTS[0]);
  const [phase, setPhase] = useState('idle'); // idle | dispatching | assigned | failed
  const [logs, setLogs] = useState([]);
  const [riders, setRiders] = useState([]);
  const [tryingRiderId, setTryingRiderId] = useState(null);
  const [assignedRider, setAssignedRider] = useState(null);
  const [eta, setEta] = useState(null);
  const logEndRef = useRef(null);
  const eventSourceRef = useRef(null);

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Load initial riders
  useEffect(() => {
    // Only init after setup is complete to show riders fresh
    if (!setupComplete) return;

    fetch(`${API}/api/init`, { method: 'POST' })
      .then(() => fetch(`${API}/api/riders`))
      .then(r => r.json())
      .then(data => {
        setRiders(Object.values(data.riders).map(r => ({ ...r, status: r.status })));
      })
      .catch(() => { });
  }, [setupComplete]);

  const addLog = useCallback((level, msg) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev, { level, msg, time, id: Date.now() + Math.random() }]);
  }, []);

  const placeOrder = async () => {
    if (phase === 'dispatching') return;

    // Close any existing stream
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setPhase('dispatching');
    setLogs([]);
    setAssignedRider(null);
    setTryingRiderId(null);
    setEta(null);

    // POST to create order
    let orderData;
    try {
      const res = await fetch(`${API}/api/order/place`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: userName || 'Demo Customer',
          user_x: parseFloat(userX) || 25.0,
          user_y: parseFloat(userY) || 25.0,
          restaurant: selectedRest.name,
          restaurant_x: selectedRest.x,
          restaurant_y: selectedRest.y,
          items: selectedRest.items,
          amount: selectedRest.amount,
        }),
      });
      orderData = await res.json();
    } catch (e) {
      addLog('error', '❌ Could not reach backend. Is it running on port 8000?');
      setPhase('failed');
      return;
    }

    addLog('info', `📦 Order ${orderData.order_id} queued`);

    // Open SSE stream
    const es = new EventSource(`${API}/api/order/${orderData.order_id}/stream`);
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      const event = JSON.parse(e.data);

      if (event.type === 'log') {
        addLog(event.level, event.msg);
      }

      if (event.type === 'riders_ranked') {
        setRiders(prev => {
          const updated = [...prev];
          event.riders.forEach(cr => {
            const idx = updated.findIndex(r => r.id === cr.id);
            if (idx >= 0) updated[idx] = { ...updated[idx], status: 'candidate', score: cr.score };
          });
          return updated;
        });
      }

      if (event.type === 'trying_rider') {
        setTryingRiderId(event.rider_id);
      }

      if (event.type === 'rider_response') {
        setTryingRiderId(null);
        if (event.outcome === 'rejected' || event.outcome === 'timeout') {
          setRiders(prev => prev.map(r =>
            r.id === event.rider_id ? { ...r, status: 'offline' } : r
          ));
        }
      }

      if (event.type === 'rider_assigned') {
        setAssignedRider(event.rider);
        setEta(event.eta_minutes);
        setPhase('assigned');
        setTryingRiderId(null);
        setRiders(prev => prev.map(r =>
          r.id === event.rider.id ? { ...r, status: 'busy' } : r
        ));
        es.close();
      }

      if (event.type === 'order_failed') {
        setPhase('failed');
        setTryingRiderId(null);
        es.close();
      }

      if (event.type === 'done') {
        es.close();
      }
    };

    es.onerror = () => {
      if (phase === 'dispatching') {
        addLog('error', '❌ Stream disconnected');
        setPhase('failed');
      }
      es.close();
    };
  };

  const reset = async () => {
    if (eventSourceRef.current) eventSourceRef.current.close();
    await fetch(`${API}/api/reset`, { method: 'POST' }).catch(() => { });
    setPhase('idle');
    setLogs([]);
    setAssignedRider(null);
    setTryingRiderId(null);
    setEta(null);
    // Reload riders
    const data = await fetch(`${API}/api/riders`).then(r => r.json()).catch(() => ({ riders: {} }));
    setRiders(Object.values(data.riders));
  };

  const statusLabel = { idle: 'READY', dispatching: 'DISPATCHING', assigned: 'ASSIGNED', failed: 'FAILED' };

  const handleSetupSubmit = (e) => {
    e.preventDefault();
    const x = parseFloat(userX);
    const y = parseFloat(userY);
    if (!userName.trim()) return alert('Please enter your name');
    if (isNaN(x) || x < 0 || x > 50) return alert('X coordinate must be between 0 and 50');
    if (isNaN(y) || y < 0 || y > 50) return alert('Y coordinate must be between 0 and 50');
    setSetupComplete(true);
  };

  if (!setupComplete) {
    return (
      <>
        <style>{css}</style>
        <div className="setup-screen">
          <form className="setup-card" onSubmit={handleSetupSubmit}>
            <div className="setup-title">Welcome to SwiftDispatch</div>
            <div className="setup-subtitle">Please enter your details to continue.</div>

            <div className="form-group">
              <label className="form-label">Your Name</label>
              <input className="form-input" placeholder="e.g. John Doe" value={userName} onChange={e => setUserName(e.target.value)} autoFocus />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">X Coordinate (0-50)</label>
                <input className="form-input" type="number" step="0.1" min="0" max="50" placeholder="25.0" value={userX} onChange={e => setUserX(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Y Coordinate (0-50)</label>
                <input className="form-input" type="number" step="0.1" min="0" max="50" placeholder="25.0" value={userY} onChange={e => setUserY(e.target.value)} />
              </div>
            </div>

            <button type="submit" className="setup-btn">Enter App</button>
          </form>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div className="app">
        {/* Header */}
        <header className="header">
          <div className="logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">swift<span>dispatch</span></span>
          </div>
          <div className="header-badge">
            <div className="dot-pulse" />
            Distributed Systems Demo — PBL
          </div>
        </header>

        <div className="main">
          {/* ── Left Panel ── */}
          <div className="left">
            <div className="panel-section">
              <div className="panel-title">Select Restaurant</div>
              <div className="rest-list">
                {DEMO_RESTAURANTS.map(r => (
                  <div
                    key={r.id}
                    className={`rest-card ${selectedRest?.id === r.id ? 'selected' : ''}`}
                    onClick={() => phase === 'idle' && setSelectedRest(r)}
                  >
                    <div className="rest-emoji">{r.emoji}</div>
                    <div className="rest-info">
                      <div className="rest-name">{r.name}</div>
                      <div className="rest-cuisine">{r.cuisine} · {r.items.length} items</div>
                    </div>
                    <div className="rest-amount">₹{r.amount}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rider info card */}
            {assignedRider && (
              <div className="rider-card">
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--green)', marginBottom: 10 }}>
                  ✅ Rider Assigned
                </div>
                <div className="rider-card-header">
                  <div className="rider-avatar">🏍️</div>
                  <div>
                    <div className="rider-name">{assignedRider.name}</div>
                    <div className="rider-meta">{assignedRider.phone}</div>
                  </div>
                </div>
                <div className="rider-stats">
                  <div className="rider-stat">⭐ <span>{assignedRider.rating}</span></div>
                  <div className="rider-stat">🕐 ETA <span>{eta} min</span></div>
                  <div className="rider-stat">Score <span>{assignedRider.score}</span></div>
                </div>
              </div>
            )}

            {/* Bottom actions */}
            <div style={{ padding: '12px 16px', marginTop: 'auto', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                className={`place-btn ${phase === 'dispatching' ? 'loading' : ''}`}
                onClick={phase === 'idle' || phase === 'failed' ? placeOrder : undefined}
                disabled={phase === 'dispatching' || phase === 'assigned' || !selectedRest}
              >
                {phase === 'dispatching' ? (
                  <><span className="spin">⟳</span> Dispatching...</>
                ) : phase === 'assigned' ? (
                  <>✅ Rider Assigned</>
                ) : phase === 'failed' ? (
                  <>❌ Failed — Try Again</>
                ) : (
                  <>🛵 Place Order · ₹{selectedRest?.amount || 0}</>
                )}
              </button>
              {(phase === 'assigned' || phase === 'failed') && (
                <button className="reset-btn" onClick={reset}>↺ Reset All Riders</button>
              )}
            </div>
          </div>

          {/* ── Right Panel ── */}
          <div className="right">
            {/* Grid Map */}
            <div className="grid-section">
              <div className="grid-title">
                <span>Rider Map (simulated grid)</span>
                <span className={`status-badge ${phase}`}>{statusLabel[phase]}</span>
              </div>
              <div className="grid-wrap">
                <div className="grid-canvas">
                  <GridMap
                    riders={riders}
                    selectedRestaurant={selectedRest}
                    tryingRiderId={tryingRiderId}
                    userX={parseFloat(userX) || 25.0}
                    userY={parseFloat(userY) || 25.0}
                  />
                </div>
                <div className="grid-legend">
                  <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--blue)' }} /> Idle rider</div>
                  <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--purple)' }} /> Candidate</div>
                  <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--amber)' }} /> Being contacted</div>
                  <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--red)', opacity: 0.5 }} /> Rejected/Busy</div>
                  <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--brand)', border: '2px solid var(--brand)' }} /> 🏠 You (user)</div>
                  <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', lineHeight: 1.6 }}>
                    Scoring function:<br />
                    score = 0.5·dist<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ 0.3·(1/rating)<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ 0.2·(1/idle_time)<br />
                    Lower = better
                  </div>
                </div>
              </div>
            </div>

            {/* Dispatch Log */}
            <div className="log-section">
              <div className="log-header">
                <span className="log-title">Dispatch Log — Real-time Events</span>
                {logs.length > 0 && (
                  <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
                    {logs.length} events
                  </span>
                )}
              </div>
              <div className="log-entries">
                {logs.length === 0 ? (
                  <div className="log-empty">
                    <div className="log-empty-icon">📋</div>
                    <div>Place an order to see the dispatch log</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                      Rider accept/reject/timeout will appear here in real-time
                    </div>
                  </div>
                ) : (
                  logs.map(log => (
                    <div key={log.id} className={`log-entry ${log.level}`}>
                      <span className="log-time">{log.time}</span>
                      <span className="log-msg">{log.msg}</span>
                    </div>
                  ))
                )}
                <div ref={logEndRef} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
