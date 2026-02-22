import { useState, useEffect, useRef } from "react";

// ─── Simulated live data ───────────────────────────────────────────────────────
const PARIS_ZONES = [
  "Marais", "Montmartre", "Saint-Germain", "Bastille", "Oberkampf",
  "République", "Nation", "Belleville", "Pigalle", "Châtelet",
  "Opéra", "Batignolles", "Canal St-Martin", "Buttes-Chaumont",
];

const TERRASSES = [
  "Le Perchoir Marais", "Café de Flore", "Les Deux Magots",
  "Brasserie Lipp", "Chez Janou", "Le Baron Rouge",
  "Café Charlot", "Le Progrès", "Rosa Bonheur", "Pavillon Puebla",
  "La Rotonde", "Terminus Nord", "L'Entrepôt", "Le Select",
];

const QUERY_TYPES = ["TOP 20", "CARTE", "EXPOSÉES", "ANALYSE"];

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateRequest(id) {
  const type = randomFrom(QUERY_TYPES);
  const zone = randomFrom(PARIS_ZONES);
  const sun = randomInt(62, 98);
  return {
    id, type, zone,
    terrace: type === "CARTE" ? randomFrom(TERRASSES) : null,
    sun, time: new Date(),
    lat: (48.85 + (Math.random() - 0.5) * 0.12).toFixed(4),
    lng: (2.35 + (Math.random() - 0.5) * 0.15).toFixed(4),
  };
}

const INITIAL = Array.from({ length: 9 }, (_, i) => generateRequest(i + 1))
  .map((r, i) => ({ ...r, time: new Date(Date.now() - (9 - i) * 14000) }));

// ─── Type config ───────────────────────────────────────────────────────────────
const TYPE_STYLE = {
  "TOP 20":   { bg: "#fffbeb", color: "#92400e", border: "#fde68a" },
  "CARTE":    { bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0" },
  "EXPOSÉES": { bg: "#eff6ff", color: "#1e40af", border: "#bfdbfe" },
  "ANALYSE":  { bg: "#fdf4ff", color: "#6b21a8", border: "#e9d5ff" },
};

// ─── Components ───────────────────────────────────────────────────────────────
function SunBar({ value }) {
  const color = value >= 85 ? "#f59e0b" : value >= 70 ? "#fbbf24" : "#fcd34d";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, height: 3, borderRadius: 99, background: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${value}%`,
          background: `linear-gradient(90deg, #fbbf24, ${color})`,
          borderRadius: 99, transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: "'DM Mono', monospace", minWidth: 28 }}>{value}%</span>
    </div>
  );
}

function TypePill({ type }) {
  const s = TYPE_STYLE[type] || TYPE_STYLE["ANALYSE"];
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
      padding: "3px 7px", borderRadius: 6,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      fontFamily: "'DM Mono', monospace", whiteSpace: "nowrap",
    }}>{type}</span>
  );
}

function useElapsed(time) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 15000);
    return () => clearInterval(t);
  }, []);
  const s = Math.floor((Date.now() - time) / 1000);
  if (s < 10) return "maintenant";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h`;
}

function RequestRow({ req, isNew }) {
  const elapsed = useElapsed(req.time);
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "140px 1fr 52px",
      alignItems: "center", gap: 12,
      padding: "11px 16px",
      borderBottom: "1px solid rgba(0,0,0,0.05)",
      background: isNew ? "rgba(251,191,36,0.07)" : "transparent",
      animation: isNew ? "fadeSlide 0.4s cubic-bezier(0.16,1,0.3,1)" : "none",
      transition: "background 2s ease",
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        <TypePill type={req.type} />
        <div style={{
          fontSize: 12, color: "#374151", fontFamily: "'DM Sans', sans-serif",
          fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{req.terrace || req.zone}</div>
        <div style={{ fontSize: 10, color: "#9ca3af", fontFamily: "'DM Mono', monospace" }}>
          {req.lat}°N · {req.lng}°E
        </div>
      </div>

      <SunBar value={req.sun} />

      <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "'DM Mono', monospace", textAlign: "right" }}>
        {elapsed}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LiveRequestsPanel() {
  const [requests, setRequests] = useState(INITIAL);
  const [newIds, setNewIds] = useState(new Set());
  const [total, setTotal] = useState(INITIAL.length);
  const [rps, setRps] = useState(0);
  const [clock, setClock] = useState(new Date());
  const nextId = useRef(INITIAL.length + 1);
  const rpsRef = useRef([]);

  // Streaming requests
  useEffect(() => {
    let cancelled = false;
    function scheduleNext() {
      const delay = randomInt(1800, 5000);
      setTimeout(() => {
        if (cancelled) return;
        const req = generateRequest(nextId.current++);
        setRequests(prev => [req, ...prev.slice(0, 49)]);
        setNewIds(s => new Set([...s, req.id]));
        setTotal(n => n + 1);
        rpsRef.current.push(Date.now());
        setTimeout(() => setNewIds(s => { const ns = new Set(s); ns.delete(req.id); return ns; }), 2200);
        scheduleNext();
      }, delay);
    }
    scheduleNext();
    return () => { cancelled = true; };
  }, []);

  // RPS meter
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      rpsRef.current = rpsRef.current.filter(ts => now - ts < 60000);
      setRps(+(rpsRef.current.length / 60).toFixed(1));
    }, 2000);
    return () => clearInterval(t);
  }, []);

  // Clock
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeStr = clock.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const byType = QUERY_TYPES.map(type => ({ type, count: requests.filter(r => r.type === type).length }));
  const avgSun = Math.round(requests.reduce((s, r) => s + r.sun, 0) / requests.length);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes livePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #f3f4f6; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
      `}</style>

      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        background: "#f9f7f4", fontFamily: "'DM Sans', sans-serif", color: "#111827",
      }}>

        {/* ── Header ──────────────────────────────────────────────── */}
        <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "16px 20px 14px" }}>
          
          {/* Brand row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, boxShadow: "0 0 0 3px #fef3c7",
              }}>☀</div>
              <div>
                <div style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 16, fontWeight: 900, letterSpacing: "0.02em",
                  color: "#1c1917", lineHeight: 1.1,
                }}>TERRASSES SOLEIL</div>
                <div style={{
                  fontSize: 9, color: "#9ca3af", letterSpacing: "0.12em",
                  fontFamily: "'DM Mono', monospace",
                }}>REQUÊTES EN DIRECT · PARIS</div>
              </div>
            </div>
            <div style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 20, fontWeight: 500, color: "#f59e0b",
            }}>{timeStr}</div>
          </div>

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
            {[
              { label: "TOTAL", value: total.toLocaleString("fr"), sub: "requêtes" },
              { label: "ACTIF", value: requests.length, sub: "en mémoire" },
              { label: "DÉBIT", value: `${rps}/s`, sub: "moy. 1 min" },
              { label: "SOLEIL", value: `${avgSun}%`, sub: "score moyen" },
            ].map(s => (
              <div key={s.label} style={{
                background: "#f9f7f4", border: "1px solid #e5e7eb",
                borderRadius: 10, padding: "8px 10px", textAlign: "center",
              }}>
                <div style={{
                  fontSize: 19, fontWeight: 800,
                  fontFamily: "'Playfair Display', serif", color: "#1c1917", lineHeight: 1,
                }}>{s.value}</div>
                <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 3, letterSpacing: "0.06em" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Type bar ────────────────────────────────────────────── */}
        <div style={{ display: "flex", background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
          {byType.map(({ type, count }, i) => {
            const s = TYPE_STYLE[type];
            return (
              <div key={type} style={{
                flex: 1, padding: "8px 4px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                borderRight: i < byType.length - 1 ? "1px solid #f3f4f6" : "none",
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: s.color, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>{type}</span>
                <span style={{ fontSize: 17, fontWeight: 800, color: "#1c1917", fontFamily: "'Playfair Display', serif" }}>{count}</span>
              </div>
            );
          })}
        </div>

        {/* ── Column headers ──────────────────────────────────────── */}
        <div style={{
          display: "grid", gridTemplateColumns: "140px 1fr 52px",
          gap: 12, padding: "7px 16px",
          borderBottom: "1px solid #e5e7eb", background: "#f9f7f4",
        }}>
          {["REQUÊTE", "EXPOSITION SOLAIRE", ""].map((h, i) => (
            <div key={i} style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
              color: "#9ca3af", fontFamily: "'DM Mono', monospace",
              textAlign: i === 2 ? "right" : "left",
            }}>{h}</div>
          ))}
        </div>

        {/* ── Feed ────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", background: "#fff" }}>
          {requests.map(req => (
            <RequestRow key={req.id} req={req} isNew={newIds.has(req.id)} />
          ))}
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div style={{
          padding: "9px 16px", background: "#f9f7f4",
          borderTop: "1px solid #e5e7eb",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%", background: "#22c55e",
            animation: "livePulse 1.4s ease-in-out infinite",
            boxShadow: "0 0 5px #22c55e",
          }} />
          <span style={{ fontSize: 10, color: "#9ca3af", letterSpacing: "0.08em", fontFamily: "'DM Mono', monospace" }}>
            FLUX EN DIRECT — ÎLE-DE-FRANCE
          </span>
          <span style={{ marginLeft: "auto", fontSize: 10, color: "#d1d5db", fontFamily: "'DM Mono', monospace" }}>
            ☀ clatasoft.github.io/terrasses-soleil
          </span>
        </div>
      </div>
    </>
  );
}
