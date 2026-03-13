import { useState, useRef, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────
//  SUPABASE CONFIG — paste your values here
// ─────────────────────────────────────────────
const SUPABASE_URL = "https://pbsyajkyyaferzhpssun.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBic3lhamt5eWFmZXJ6aHBzc3VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MzczMjIsImV4cCI6MjA4OTAxMzMyMn0.fou8_AvTEPSdycN9B3g20553-ixT2-P6kZ7uiZNHMcg";

const sb = (path, opts = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    mode: "cors",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: opts.prefer || "return=representation",
      ...opts.headers,
    },
    ...opts,
  }).then(async (r) => {
    const text = await r.text();
    const json = text ? JSON.parse(text) : null;
    if (!r.ok) throw new Error(json?.message || json?.error || `HTTP ${r.status}`);
    return json;
  }).catch((err) => {
    if (err.message === "Failed to fetch" || err.message === "Load failed" || err.name === "TypeError") {
      throw new Error("NETWORK_ERROR");
    }
    throw err;
  });

const dbGet = (table, query = "") => sb(`${table}?${query}`);
const dbPost = (table, body) => sb(table, { method: "POST", body: JSON.stringify(body) });
const dbPatch = (table, query, body) => sb(`${table}?${query}`, { method: "PATCH", body: JSON.stringify(body), headers: { Prefer: "return=representation" } });
const dbDelete = (table, query) => sb(`${table}?${query}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });

// ─────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────
const C = {
  bg: "#FFF9F0", card: "#FFFFFF", primary: "#FF6B35", secondary: "#4ECDC4",
  accent: "#FFE66D", purple: "#A855F7", green: "#22C55E", pink: "#F472B6",
  red: "#EF4444", text: "#1A1A2E", muted: "#6B7280", border: "#F0E6D6",
  blue: "#3B82F6",
};
const MEMBER_COLORS = ["#FF6B35", "#4ECDC4", "#A855F7", "#F472B6", "#22C55E", "#FBBF24"];
const DEFAULT_CHORES = [
  { name: "Wash dishes", difficulty: "medium", points: 15 },
  { name: "Vacuum living room", difficulty: "medium", points: 20 },
  { name: "Take out trash", difficulty: "easy", points: 10 },
  { name: "Clean bathroom", difficulty: "hard", points: 35 },
  { name: "Cook dinner", difficulty: "hard", points: 40 },
  { name: "Do laundry", difficulty: "medium", points: 25 },
  { name: "Mop floors", difficulty: "hard", points: 30 },
  { name: "Feed pets", difficulty: "easy", points: 8 },
];
const DEFAULT_REWARDS = [
  { name: "Extra screen time (1hr)", cost: 50, emoji: "📱", custom: false },
  { name: "Choose dinner tonight", cost: 80, emoji: "🍕", custom: false },
  { name: "Skip one chore", cost: 100, emoji: "🎉", custom: false },
  { name: "Movie night pick", cost: 120, emoji: "🎬", custom: false },
  { name: "$5 allowance bonus", cost: 200, emoji: "💰", custom: false },
  { name: "Sleep-over permission", cost: 300, emoji: "🌙", custom: false },
];
const DIFF = { easy: { color: "#22C55E", label: "Easy" }, medium: { color: "#FBBF24", label: "Medium" }, hard: { color: "#EF4444", label: "Hard" } };
const PENALTY_PRESETS = [
  { label: "Arguing / back-talk", pts: 10, emoji: "🗣️" },
  { label: "Not listening", pts: 15, emoji: "🙉" },
  { label: "Breaking rules", pts: 20, emoji: "🚫" },
  { label: "Hurting someone", pts: 30, emoji: "😢" },
  { label: "Custom", pts: 0, emoji: "✏️" },
];
const EVENT_TYPES = [
  { label: "Birthday", emoji: "🎂", color: "#F472B6" },
  { label: "Anniversary", emoji: "💍", color: "#A855F7" },
  { label: "Holiday", emoji: "🎉", color: "#FF6B35" },
  { label: "School Event", emoji: "🏫", color: "#3B82F6" },
  { label: "Family Trip", emoji: "✈️", color: "#22C55E" },
  { label: "Other", emoji: "📅", color: "#6B7280" },
];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
// Simple password hash (not cryptographic – for demo only)
const hashPwd = (s) => btoa(unescape(encodeURIComponent(s + "_cc_salt")));

// ─────────────────────────────────────────────
//  STATUS BADGE
// ─────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    approved: { bg: "#D1FAE5", color: "#065F46", label: "✅ Approved" },
    rejected: { bg: "#FEE2E2", color: "#991B1B", label: "❌ Rejected" },
    pending:  { bg: "#FEF3C7", color: "#92400E", label: "⏳ Pending" },
    penalty:  { bg: "#FEE2E2", color: "#991B1B", label: "⚠️ Penalty" },
  }[status] || {};
  return <span style={{ background: cfg.bg, color: cfg.color, padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 800 }}>{cfg.label}</span>;
}

// ─────────────────────────────────────────────
//  SHARED STYLES
// ─────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Fredoka+One&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  button { cursor: pointer; border: none; font-family: inherit; }
  input, select, textarea { font-family: inherit; }
  .tab-btn { padding: 8px 8px; border-radius: 30px; font-weight: 800; font-size: 11px; transition: all 0.2s; background: transparent; color: rgba(255,255,255,0.75); }
  .tab-btn.active { background: white; color: #FF6B35; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
  .card { background: white; border-radius: 20px; padding: 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.07); border: 2px solid #F0E6D6; }
  .btn-primary { background: #FF6B35; color: white; padding: 12px 24px; border-radius: 30px; font-weight: 800; font-size: 15px; transition: transform 0.15s; }
  .btn-primary:hover { transform: scale(1.03); }
  .btn-green { background: #22C55E; color: white; padding: 10px 18px; border-radius: 30px; font-weight: 800; font-size: 14px; }
  .btn-red { background: #EF4444; color: white; padding: 10px 18px; border-radius: 30px; font-weight: 800; font-size: 14px; }
  .btn-purple { background: #A855F7; color: white; padding: 10px 18px; border-radius: 30px; font-weight: 800; font-size: 14px; }
  .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 16px; }
  .modal { background: white; border-radius: 24px; padding: 28px; width: 100%; max-width: 440px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); max-height: 88vh; overflow-y: auto; }
  input[type=text], input[type=number], input[type=date], select, textarea { width: 100%; padding: 12px 16px; border: 2px solid #F0E6D6; border-radius: 14px; font-size: 15px; outline: none; margin-top: 6px; transition: border 0.2s; }
  input:focus, select:focus, textarea:focus { border-color: #FF6B35; }
  .diff-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 800; color: white; }
  .notif { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #1A1A2E; color: white; padding: 12px 24px; border-radius: 30px; font-weight: 800; z-index: 999; white-space: nowrap; animation: slideDown 0.3s ease; }
  @keyframes slideDown { from { opacity: 0; top: 0; } to { opacity: 1; top: 20px; } }
  .hover-lift { transition: transform 0.15s; } .hover-lift:hover { transform: translateY(-2px); }
  .row-hover:hover { background: #FFF5EE; }
  .badge-pill { display: inline-flex; align-items: center; justify-content: center; background: #EF4444; color: white; font-size: 10px; font-weight: 900; border-radius: 50%; width: 16px; height: 16px; margin-left: 3px; vertical-align: middle; }
  .photo-upload-box { border: 2px dashed #F0E6D6; border-radius: 14px; padding: 20px; text-align: center; cursor: pointer; transition: border 0.2s; margin-top: 8px; }
  .photo-upload-box:hover { border-color: #FF6B35; background: #FFF5EE; }
  .preset-btn { padding: 10px 14px; border-radius: 14px; border: 2px solid #F0E6D6; background: white; font-weight: 700; font-size: 13px; text-align: left; transition: all 0.15s; width: 100%; }
  .preset-btn.selected { border-color: #EF4444; background: #FEF2F2; }
  .cal-day { aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding-top: 4px; border-radius: 10px; cursor: pointer; transition: background 0.15s; font-size: 13px; font-weight: 700; }
  .cal-day:hover { background: #FFF5EE; }
  .cal-day.today { background: #FF6B35; color: white; }
  .reward-card { border-radius: 20px; padding: 16px; border: 2px solid #F0E6D6; background: white; text-align: center; cursor: pointer; transition: transform 0.15s; }
  .reward-card:hover { transform: scale(1.03); }
  .reward-card.custom-reward { border-color: #A855F7; background: #FAFAFF; }
  label { display: block; font-weight: 800; font-size: 14px; margin-top: 14px; }
  label:first-child { margin-top: 0; }
  .spinner { display: inline-block; width: 18px; height: 18px; border: 3px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

// ─────────────────────────────────────────────
//  AUTH WRAPPER
// ─────────────────────────────────────────────
export default function FamilyChoreTracker() {
  const [authMode, setAuthMode] = useState("login");
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("cc_user")); } catch { return null; }
  });
  const [authForm, setAuthForm] = useState({ email: "", password: "", confirm: "", familyLabel: "" });
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConf, setShowConf] = useState(false);

  const persistUser = (u) => { sessionStorage.setItem("cc_user", JSON.stringify(u)); setCurrentUser(u); };

  const handleRegister = async () => {
    setAuthError("");
    if (!authForm.familyLabel.trim()) return setAuthError("Please enter your family or house name.");
    if (!isValidEmail(authForm.email)) return setAuthError("Please enter a valid email address.");
    if (authForm.password.length < 6) return setAuthError("Password must be at least 6 characters.");
    if (authForm.password !== authForm.confirm) return setAuthError("Passwords do not match.");
    setAuthLoading(true);
    try {
      const existing = await dbGet("families", `email=eq.${encodeURIComponent(authForm.email.trim().toLowerCase())}&select=id`);
      if (existing?.length > 0) { setAuthLoading(false); return setAuthError("An account with this email already exists."); }
      const rows = await dbPost("families", { email: authForm.email.trim().toLowerCase(), password_hash: hashPwd(authForm.password), family_name: authForm.familyLabel.trim() });
      const fam = rows[0];
      // seed default chores & rewards
      await Promise.all([
        ...DEFAULT_CHORES.map(c => dbPost("chores", { ...c, family_id: fam.id })),
        ...DEFAULT_REWARDS.map(r => dbPost("rewards", { ...r, family_id: fam.id })),
      ]);
      persistUser({ id: fam.id, email: fam.email, familyName: fam.family_name });
    } catch (e) {
      if (e.message === "NETWORK_ERROR") {
        setAuthError("Cannot reach Supabase. Go to your Supabase dashboard → Settings → API → and add this site's origin to the allowed list. Or try opening the app in a new browser tab.");
      } else {
        setAuthError(e.message || "Registration failed.");
      }
    }
    setAuthLoading(false);
  };

  const handleLogin = async () => {
    setAuthError("");
    if (!isValidEmail(authForm.email)) return setAuthError("Please enter a valid email address.");
    if (!authForm.password) return setAuthError("Please enter your password.");
    setAuthLoading(true);
    try {
      const rows = await dbGet("families", `email=eq.${encodeURIComponent(authForm.email.trim().toLowerCase())}&select=id,email,family_name,password_hash`);
      if (!rows?.length || rows[0].password_hash !== hashPwd(authForm.password)) {
        setAuthLoading(false); return setAuthError("Incorrect email or password.");
      }
      const fam = rows[0];
      persistUser({ id: fam.id, email: fam.email, familyName: fam.family_name });
    } catch (e) {
      if (e.message === "NETWORK_ERROR") {
        setAuthError("Cannot reach Supabase. Please follow the CORS fix steps shown below.");
      } else {
        setAuthError(e.message || "Login failed.");
      }
    }
    setAuthLoading(false);
  };

  const handleLogout = () => { sessionStorage.removeItem("cc_user"); setCurrentUser(null); setAuthForm({ email: "", password: "", confirm: "", familyLabel: "" }); setAuthError(""); setAuthMode("login"); };

  if (currentUser) return <AppMain currentUser={currentUser} onLogout={handleLogout} onFamilyNameChange={(n) => setCurrentUser(u => ({ ...u, familyName: n }))} />;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #FF6B35 0%, #FF8C5A 40%, #FFB347 100%)", fontFamily: "'Nunito', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <style>{STYLES}</style>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>🏠</div>
          <h1 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 36, color: "white" }}>ChoreChamps</h1>
          <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 15, marginTop: 6 }}>Your family's chore & rewards tracker</p>
        </div>

        <div style={{ background: "white", borderRadius: 28, padding: 32, boxShadow: "0 24px 60px rgba(0,0,0,0.2)" }}>
          {/* Toggle */}
          <div style={{ display: "flex", background: "#F3F4F6", borderRadius: 30, padding: 4, marginBottom: 28 }}>
            {["login","register"].map(m => (
              <button key={m} onClick={() => { setAuthMode(m); setAuthError(""); }} style={{ flex: 1, padding: "10px", borderRadius: 26, fontWeight: 800, fontSize: 14, background: authMode === m ? "#FF6B35" : "transparent", color: authMode === m ? "white" : "#6B7280", boxShadow: authMode === m ? "0 4px 12px rgba(255,107,53,0.35)" : "none", transition: "all 0.2s" }}>
                {m === "login" ? "🔑 Log In" : "✨ Register"}
              </button>
            ))}
          </div>

          {authMode === "register" && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontWeight: 800, fontSize: 13, color: "#374151", marginBottom: 6 }}>🏠 Family / House Name</label>
              <input type="text" placeholder="e.g. The Smiths, Casa Garcia…" value={authForm.familyLabel} onChange={e => setAuthForm(f => ({ ...f, familyLabel: e.target.value }))} style={{ width: "100%", padding: "13px 16px", border: "2px solid #E5E7EB", borderRadius: 14, fontSize: 15, outline: "none" }} onFocus={e => e.target.style.borderColor="#FF6B35"} onBlur={e => e.target.style.borderColor="#E5E7EB"} />
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontWeight: 800, fontSize: 13, color: "#374151", marginBottom: 6 }}>📧 Email Address</label>
            <input type="text" placeholder="you@example.com" value={authForm.email} onChange={e => setAuthForm(f => ({ ...f, email: e.target.value }))} onKeyDown={e => e.key === "Enter" && (authMode === "login" ? handleLogin() : handleRegister())} style={{ width: "100%", padding: "13px 16px", border: "2px solid #E5E7EB", borderRadius: 14, fontSize: 15, outline: "none" }} onFocus={e => e.target.style.borderColor="#FF6B35"} onBlur={e => { e.target.style.borderColor = authForm.email && !isValidEmail(authForm.email) ? "#EF4444" : "#E5E7EB"; }} />
            {authForm.email && !isValidEmail(authForm.email) && <p style={{ fontSize: 12, color: "#EF4444", marginTop: 4, fontWeight: 700 }}>⚠ Enter a valid email</p>}
          </div>

          <div style={{ marginBottom: authMode === "register" ? 16 : 20 }}>
            <label style={{ display: "block", fontWeight: 800, fontSize: 13, color: "#374151", marginBottom: 6 }}>🔒 Password {authMode === "register" && <span style={{ fontWeight: 400, color: "#9CA3AF" }}>(min 6 chars)</span>}</label>
            <div style={{ position: "relative" }}>
              <input type={showPwd ? "text" : "password"} placeholder="Enter password" value={authForm.password} onChange={e => setAuthForm(f => ({ ...f, password: e.target.value }))} onKeyDown={e => e.key === "Enter" && (authMode === "login" ? handleLogin() : handleRegister())} style={{ width: "100%", padding: "13px 48px 13px 16px", border: "2px solid #E5E7EB", borderRadius: 14, fontSize: 15, outline: "none" }} onFocus={e => e.target.style.borderColor="#FF6B35"} onBlur={e => e.target.style.borderColor="#E5E7EB"} />
              <button onClick={() => setShowPwd(p => !p)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", fontSize: 18, color: "#9CA3AF" }}>{showPwd ? "🙈" : "👁️"}</button>
            </div>
            {authMode === "register" && authForm.password && (
              <div style={{ marginTop: 6, display: "flex", gap: 4, alignItems: "center" }}>
                {[1,2,3,4].map(i => <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: authForm.password.length >= i*2 ? (authForm.password.length >= 8 ? "#22C55E" : "#FBBF24") : "#E5E7EB" }} />)}
                <span style={{ fontSize: 11, fontWeight: 800, color: authForm.password.length >= 8 ? "#22C55E" : "#FBBF24", marginLeft: 6 }}>{authForm.password.length >= 8 ? "Strong" : "Weak"}</span>
              </div>
            )}
          </div>

          {authMode === "register" && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontWeight: 800, fontSize: 13, color: "#374151", marginBottom: 6 }}>🔒 Confirm Password</label>
              <div style={{ position: "relative" }}>
                <input type={showConf ? "text" : "password"} placeholder="Re-enter password" value={authForm.confirm} onChange={e => setAuthForm(f => ({ ...f, confirm: e.target.value }))} onKeyDown={e => e.key === "Enter" && handleRegister()} style={{ width: "100%", padding: "13px 48px 13px 16px", border: `2px solid ${authForm.confirm && authForm.confirm !== authForm.password ? "#EF4444" : "#E5E7EB"}`, borderRadius: 14, fontSize: 15, outline: "none" }} onFocus={e => e.target.style.borderColor="#FF6B35"} onBlur={e => e.target.style.borderColor = authForm.confirm && authForm.confirm !== authForm.password ? "#EF4444" : "#E5E7EB"} />
                <button onClick={() => setShowConf(p => !p)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", fontSize: 18, color: "#9CA3AF" }}>{showConf ? "🙈" : "👁️"}</button>
              </div>
              {authForm.confirm && authForm.confirm !== authForm.password && <p style={{ fontSize: 12, color: "#EF4444", marginTop: 4, fontWeight: 700 }}>⚠ Passwords don't match</p>}
              {authForm.confirm && authForm.confirm === authForm.password && <p style={{ fontSize: 12, color: "#22C55E", marginTop: 4, fontWeight: 700 }}>✅ Passwords match</p>}
            </div>
          )}

          {authError && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#DC2626", fontWeight: 700 }}>⚠️ {authError}</div>}

          <button onClick={authMode === "login" ? handleLogin : handleRegister} disabled={authLoading} style={{ width: "100%", padding: "15px", borderRadius: 30, fontWeight: 900, fontSize: 16, background: authLoading ? "#E5E7EB" : "linear-gradient(135deg,#FF6B35,#FF8C5A)", color: authLoading ? "#9CA3AF" : "white", boxShadow: authLoading ? "none" : "0 6px 20px rgba(255,107,53,0.4)", transition: "all 0.2s", marginBottom: 16 }}>
            {authLoading ? <><span className="spinner" /> &nbsp;Please wait…</> : authMode === "login" ? "🔑 Log In" : "🎉 Create Account"}
          </button>

          <p style={{ textAlign: "center", fontSize: 13, color: "#6B7280" }}>
            {authMode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthError(""); }} style={{ background: "none", color: "#FF6B35", fontWeight: 800, fontSize: 13, textDecoration: "underline" }}>
              {authMode === "login" ? "Register here" : "Log in"}
            </button>
          </p>
        </div>
        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 20 }}>☁️ Powered by Supabase · Data synced across devices</p>

        {/* CORS fix guide */}
        <div style={{ marginTop: 20, background: "rgba(0,0,0,0.25)", borderRadius: 18, padding: "18px 20px" }}>
          <p style={{ color: "white", fontWeight: 800, fontSize: 13, marginBottom: 10 }}>⚠️ Getting a "Load Failed" error? Fix it in 2 steps:</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              "1. Go to supabase.com → your project → Settings → API",
              "2. Under 'Allowed Origins' (CORS) add: * (or the URL of this page)",
              "3. Save and refresh this page",
            ].map((s, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 12px", color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: 600 }}>{s}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  MAIN APP
// ─────────────────────────────────────────────
function AppMain({ currentUser, onLogout, onFamilyNameChange }) {
  const fid = currentUser.id;

  // ── State ──
  const [tab, setTab] = useState("dashboard");
  const [members, setMembers] = useState([]);
  const [chores, setChores] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [rewardRequests, setRewardRequests] = useState([]);
  const [pending, setPending] = useState([]);
  const [log, setLog] = useState([]);
  const [calEvents, setCalEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState("");

  const [familyName, setFamilyName] = useState(currentUser.familyName);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(currentUser.familyName);

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showEventDetail, setShowEventDetail] = useState(null);
  const [eventForm, setEventForm] = useState({ title: "", date: "", type: "Birthday", recurring: false });

  const [showRequestReward, setShowRequestReward] = useState(false);
  const [showReviewRequest, setShowReviewRequest] = useState(null);
  const [rewardReqForm, setRewardReqForm] = useState({ memberId: "", name: "", emoji: "🎁", reason: "" });
  const [reviewForm, setReviewForm] = useState({ points: "" });

  const [showLogChore, setShowLogChore] = useState(false);
  const [showAddChore, setShowAddChore] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showRedeemReward, setShowRedeemReward] = useState(null);
  const [showDeduct, setShowDeduct] = useState(false);
  const [showPhotoView, setShowPhotoView] = useState(null);

  const [logForm, setLogForm] = useState({ memberId: "", choreId: "", photo: null, photoPreview: null });
  const [choreForm, setChoreForm] = useState({ name: "", difficulty: "medium" });
  const [memberForm, setMemberForm] = useState({ name: "", emoji: "🧑" });
  const [deductForm, setDeductForm] = useState({ memberId: "", preset: null, customPts: "", reason: "" });

  const [aiLoading, setAiLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const fileInputRef = useRef(null);
  const nameInputRef = useRef(null);

  const [weekStart] = useState(() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toLocaleDateString(); });

  const notify = (msg) => { setNotification(msg); setTimeout(() => setNotification(null), 2800); };

  // ── Load all data ──
  const loadAll = useCallback(async () => {
    setLoading(true); setSyncError("");
    try {
      const [m, c, r, rr, p, l, ce] = await Promise.all([
        dbGet("members", `family_id=eq.${fid}&order=created_at.asc`),
        dbGet("chores", `family_id=eq.${fid}&order=created_at.asc`),
        dbGet("rewards", `family_id=eq.${fid}&order=created_at.asc`),
        dbGet("reward_requests", `family_id=eq.${fid}&order=created_at.asc`),
        dbGet("pending_chores", `family_id=eq.${fid}&status=eq.pending&order=created_at.desc`),
        dbGet("activity_log", `family_id=eq.${fid}&order=created_at.desc&limit=50`),
        dbGet("calendar_events", `family_id=eq.${fid}&order=date.asc`),
      ]);
      setMembers(m || []);
      setChores(c || []);
      setRewards(r || []);
      setRewardRequests(rr || []);
      setPending(p || []);
      setLog(l || []);
      setCalEvents(ce || []);
    } catch (e) { setSyncError("⚠️ Could not connect to database. Check your Supabase config."); }
    setLoading(false);
  }, [fid]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const sorted = [...members].sort((a, b) => b.points - a.points);
  const maxPoints = Math.max(...members.map(m => m.points), 1);
  const pendingCount = pending.length;
  const rewardReqCount = rewardRequests.filter(r => r.status === "pending").length;
  const reviewTabCount = pendingCount + rewardReqCount;

  // ── Calendar helpers ──
  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();
  const eventsForDay = (y, m, d) => {
    const ds = `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    return calEvents.filter(e => e.recurring ? new Date(e.date).getMonth() === m && new Date(e.date).getDate() === d : e.date === ds);
  };
  const upcomingEvents = () => {
    const now = new Date();
    return calEvents.map(e => {
      const ed = new Date(e.date);
      let next = new Date(now.getFullYear(), ed.getMonth(), ed.getDate());
      if (e.recurring && next < now) next.setFullYear(now.getFullYear() + 1);
      return { ...e, daysAway: Math.ceil((next - now) / 86400000), nextDate: next };
    }).sort((a,b) => a.daysAway - b.daysAway).slice(0,5);
  };
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  const calGrid = [];
  for (let i = 0; i < firstDay; i++) calGrid.push(null);
  for (let d = 1; d <= daysInMonth; d++) calGrid.push(d);

  // ── Photo ──
  const handlePhotoChange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setLogForm(f => ({ ...f, photo: ev.target.result, photoPreview: ev.target.result }));
    reader.readAsDataURL(file);
  };

  // ── Family name ──
  const saveFamilyName = async (name) => {
    await dbPatch("families", `id=eq.${fid}`, { family_name: name });
    setFamilyName(name); onFamilyNameChange(name); notify("✏️ Family name updated!");
  };

  // ── Submit chore ──
  const handleSubmitChore = async () => {
    const member = members.find(m => m.id === logForm.memberId);
    const chore = chores.find(c => c.id === logForm.choreId);
    if (!member || !chore) return;
    try {
      const rows = await dbPost("pending_chores", { family_id: fid, member_id: member.id, member_name: member.name, member_emoji: member.emoji, member_color: member.color, chore_name: chore.name, points: chore.points, photo: logForm.photo || null, status: "pending" });
      setPending(prev => [{ ...rows[0] }, ...prev]);
      notify(`📬 ${member.name}'s chore sent for approval!`);
      setShowLogChore(false); setLogForm({ memberId: "", choreId: "", photo: null, photoPreview: null });
    } catch (e) { notify("❌ Error submitting chore"); }
  };

  const handleApprove = async (entry) => {
    try {
      await dbPatch("pending_chores", `id=eq.${entry.id}`, { status: "approved" });
      await dbPatch("members", `id=eq.${entry.member_id}`, { points: (members.find(m => m.id === entry.member_id)?.points || 0) + entry.points });
      const logRow = await dbPost("activity_log", { family_id: fid, member_name: entry.member_name, member_emoji: entry.member_emoji, member_color: entry.member_color, chore: entry.chore_name, points: entry.points, photo: entry.photo || null, status: "approved" });
      setMembers(prev => prev.map(m => m.id === entry.member_id ? { ...m, points: m.points + entry.points } : m));
      setPending(prev => prev.filter(p => p.id !== entry.id));
      setLog(prev => [logRow[0], ...prev]);
      notify(`✅ Approved! +${entry.points} pts for ${entry.member_name}`);
    } catch (e) { notify("❌ Error approving chore"); }
  };

  const handleReject = async (entry) => {
    try {
      await dbPatch("pending_chores", `id=eq.${entry.id}`, { status: "rejected" });
      const logRow = await dbPost("activity_log", { family_id: fid, member_name: entry.member_name, member_emoji: entry.member_emoji, member_color: entry.member_color, chore: entry.chore_name, points: entry.points, photo: entry.photo || null, status: "rejected" });
      setPending(prev => prev.filter(p => p.id !== entry.id));
      setLog(prev => [logRow[0], ...prev]);
      notify(`❌ ${entry.member_name}'s chore rejected`);
    } catch (e) { notify("❌ Error rejecting chore"); }
  };

  // ── Deduct ──
  const handleDeduct = async () => {
    const member = members.find(m => m.id === deductForm.memberId);
    if (!member) return;
    const pts = deductForm.preset?.label === "Custom" ? parseInt(deductForm.customPts) || 0 : deductForm.preset?.pts || 0;
    if (pts <= 0) return;
    const reason = deductForm.preset?.label === "Custom" ? deductForm.reason : deductForm.preset?.label;
    try {
      const newPts = Math.max(0, member.points - pts);
      await dbPatch("members", `id=eq.${member.id}`, { points: newPts });
      const logRow = await dbPost("activity_log", { family_id: fid, member_name: member.name, member_emoji: member.emoji, member_color: member.color, chore: `⚠️ Penalty: ${reason}`, points: -pts, status: "penalty" });
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, points: newPts } : m));
      setLog(prev => [logRow[0], ...prev]);
      notify(`⚠️ -${pts} pts from ${member.name}`);
      setShowDeduct(false); setDeductForm({ memberId: "", preset: null, customPts: "", reason: "" });
    } catch (e) { notify("❌ Error deducting points"); }
  };

  // ── Reward request ──
  const handleSubmitRewardRequest = async () => {
    const member = members.find(m => m.id === rewardReqForm.memberId);
    if (!member || !rewardReqForm.name.trim()) return;
    try {
      const rows = await dbPost("reward_requests", { family_id: fid, member_id: member.id, member_name: member.name, member_emoji: member.emoji, member_color: member.color, name: rewardReqForm.name, req_emoji: rewardReqForm.emoji, reason: rewardReqForm.reason, status: "pending" });
      setRewardRequests(prev => [...prev, rows[0]]);
      notify(`🙋 ${member.name}'s reward request submitted!`);
      setShowRequestReward(false); setRewardReqForm({ memberId: "", name: "", emoji: "🎁", reason: "" });
    } catch (e) { notify("❌ Error submitting request"); }
  };

  const handlePublishReward = async () => {
    const pts = parseInt(reviewForm.points);
    if (!pts || pts <= 0) return;
    try {
      await dbPatch("reward_requests", `id=eq.${showReviewRequest.id}`, { status: "approved", points: pts });
      const newReward = await dbPost("rewards", { family_id: fid, name: showReviewRequest.name, cost: pts, emoji: showReviewRequest.req_emoji, custom: true, requested_by: showReviewRequest.member_name });
      setRewardRequests(prev => prev.map(r => r.id === showReviewRequest.id ? { ...r, status: "approved", points: pts } : r));
      setRewards(prev => [...prev, newReward[0]]);
      notify(`🎁 "${showReviewRequest.name}" published for ${pts} pts!`);
      setShowReviewRequest(null); setReviewForm({ points: "" });
    } catch (e) { notify("❌ Error publishing reward"); }
  };

  const handleRejectRequest = async (req) => {
    try {
      await dbPatch("reward_requests", `id=eq.${req.id}`, { status: "rejected" });
      setRewardRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: "rejected" } : r));
      notify("❌ Reward request rejected"); setShowReviewRequest(null);
    } catch (e) { notify("❌ Error rejecting request"); }
  };

  // ── Redeem reward ──
  const handleRedeem = async (member, reward) => {
    if (member.points < reward.cost) { notify("Not enough points!"); return; }
    try {
      const newPts = member.points - reward.cost;
      await dbPatch("members", `id=eq.${member.id}`, { points: newPts, redeemed: (member.redeemed || 0) + reward.cost });
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, points: newPts, redeemed: (m.redeemed || 0) + reward.cost } : m));
      setShowRedeemReward(null); notify(`${member.name} redeemed: ${reward.name} ${reward.emoji}`);
    } catch (e) { notify("❌ Error redeeming reward"); }
  };

  // ── Add chore ──
  const handleAISuggestPoints = async () => {
    if (!choreForm.name.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 100, messages: [{ role: "user", content: `Family chore app. Chore: "${choreForm.name}", difficulty: "${choreForm.difficulty}". Suggest a fair point value (integer, 5-50). Reply with ONLY the number.` }] }) });
      const data = await res.json();
      const pts = parseInt(data.content[0].text.trim());
      if (!isNaN(pts)) { setChoreForm(f => ({ ...f, suggestedPoints: pts })); notify(`AI suggests ${pts} pts! ✨`); }
    } catch { notify("AI unavailable"); }
    setAiLoading(false);
  };

  const handleAddChore = async () => {
    if (!choreForm.name.trim()) return;
    const pts = choreForm.suggestedPoints || (choreForm.difficulty === "easy" ? 10 : choreForm.difficulty === "medium" ? 20 : 35);
    try {
      const rows = await dbPost("chores", { family_id: fid, name: choreForm.name, difficulty: choreForm.difficulty, points: pts });
      setChores(prev => [...prev, rows[0]]);
      notify(`"${choreForm.name}" added! (${pts} pts)`);
      setShowAddChore(false); setChoreForm({ name: "", difficulty: "medium" });
    } catch (e) { notify("❌ Error adding chore"); }
  };

  const handleDeleteChore = async (id) => {
    try { await dbDelete("chores", `id=eq.${id}`); setChores(prev => prev.filter(c => c.id !== id)); } catch { notify("❌ Error deleting chore"); }
  };

  // ── Add member ──
  const handleAddMember = async () => {
    if (!memberForm.name.trim()) return;
    try {
      const rows = await dbPost("members", { family_id: fid, name: memberForm.name, emoji: memberForm.emoji, color: MEMBER_COLORS[members.length % MEMBER_COLORS.length], points: 0, redeemed: 0 });
      setMembers(prev => [...prev, rows[0]]);
      notify(`Welcome, ${memberForm.name}! 👋`);
      setShowAddMember(false); setMemberForm({ name: "", emoji: "🧑" });
    } catch (e) { notify("❌ Error adding member"); }
  };

  // ── Add calendar event ──
  const handleAddEvent = async () => {
    if (!eventForm.title.trim() || !eventForm.date) return;
    const type = EVENT_TYPES.find(t => t.label === eventForm.type);
    try {
      const rows = await dbPost("calendar_events", { family_id: fid, title: eventForm.title, date: eventForm.date, type: eventForm.type, emoji: type.emoji, color: type.color, recurring: eventForm.recurring });
      setCalEvents(prev => [...prev, rows[0]]);
      notify(`📅 "${eventForm.title}" added!`);
      setShowAddEvent(false); setEventForm({ title: "", date: "", type: "Birthday", recurring: false }); setSelectedDay(null);
    } catch (e) { notify("❌ Error adding event"); }
  };

  const handleDeleteEvent = async (id) => {
    try { await dbDelete("calendar_events", `id=eq.${id}`); setCalEvents(prev => prev.filter(e => e.id !== id)); } catch { notify("❌ Error deleting event"); }
  };

  // ── Weekly reset ──
  const handleWeeklyReset = async () => {
    if (!window.confirm("Reset all points for a new week?")) return;
    try {
      await Promise.all(members.map(m => dbPatch("members", `id=eq.${m.id}`, { points: 0, redeemed: 0 })));
      setMembers(prev => prev.map(m => ({ ...m, points: 0, redeemed: 0 })));
      setLog([]); setPending([]);
      notify("New week started! 🔄");
    } catch (e) { notify("❌ Error resetting points"); }
  };

  // ── Loading screen ──
  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Nunito', sans-serif" }}>
      <style>{STYLES}</style>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🏠</div>
      <h2 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 24, color: C.primary }}>Loading {familyName}…</h2>
      <p style={{ color: C.muted, fontSize: 14, marginTop: 8 }}>Syncing from cloud ☁️</p>
      <div style={{ marginTop: 20, width: 48, height: 48, border: `5px solid ${C.border}`, borderTopColor: C.primary, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Nunito', sans-serif", color: C.text }}>
      <style>{STYLES}</style>
      {notification && <div className="notif">{notification}</div>}
      {syncError && <div style={{ background: "#FEF2F2", color: "#DC2626", padding: "10px 20px", textAlign: "center", fontSize: 13, fontWeight: 700 }}>{syncError} <button onClick={loadAll} style={{ background: "none", color: "#DC2626", textDecoration: "underline", fontWeight: 800, marginLeft: 8 }}>Retry</button></div>}

      {/* ── Header ── */}
      <div style={{ background: C.primary, padding: "18px 16px 0", boxShadow: "0 4px 20px rgba(255,107,53,0.3)" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              {editingName ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 20 }}>🏠</span>
                  <input ref={nameInputRef} type="text" value={nameInput} onChange={e => setNameInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { saveFamilyName(nameInput.trim() || familyName); setEditingName(false); } if (e.key === "Escape") setEditingName(false); }} style={{ fontFamily: "'Fredoka One', cursive", fontSize: 20, background: "rgba(255,255,255,0.25)", border: "2px solid rgba(255,255,255,0.6)", borderRadius: 10, color: "white", padding: "2px 10px", outline: "none", width: 170 }} autoFocus />
                  <button onClick={() => { saveFamilyName(nameInput.trim() || familyName); setEditingName(false); }} style={{ background: "rgba(255,255,255,0.9)", color: C.primary, borderRadius: 8, padding: "4px 10px", fontWeight: 900, fontSize: 13 }}>✓</button>
                  <button onClick={() => setEditingName(false)} style={{ background: "rgba(255,255,255,0.2)", color: "white", borderRadius: 8, padding: "4px 10px", fontWeight: 900, fontSize: 13 }}>✕</button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => { setNameInput(familyName); setEditingName(true); }}>
                  <h1 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 24, color: "white" }}>🏠 {familyName}</h1>
                  <span style={{ fontSize: 13, background: "rgba(255,255,255,0.2)", borderRadius: 8, padding: "2px 8px", color: "rgba(255,255,255,0.85)", fontWeight: 700 }}>✏️</span>
                </div>
              )}
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, marginTop: 2 }}>Week of {weekStart} · ☁️ {currentUser.email}</p>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={handleWeeklyReset} style={{ background: "rgba(255,255,255,0.2)", color: "white", padding: "7px 11px", borderRadius: 20, fontWeight: 800, fontSize: 11, border: "2px solid rgba(255,255,255,0.4)" }}>🔄</button>
              <button onClick={() => { loadAll(); notify("☁️ Synced!"); }} style={{ background: "rgba(255,255,255,0.2)", color: "white", padding: "7px 11px", borderRadius: 20, fontWeight: 800, fontSize: 11, border: "2px solid rgba(255,255,255,0.4)" }}>↻</button>
              <button onClick={onLogout} style={{ background: "rgba(255,255,255,0.15)", color: "white", padding: "7px 11px", borderRadius: 20, fontWeight: 800, fontSize: 11, border: "2px solid rgba(255,255,255,0.3)" }}>🚪</button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 2, background: "rgba(0,0,0,0.15)", borderRadius: 40, padding: 4 }}>
            {[["dashboard","🏆 Board"],["approve","✅ Review"],["chores","📋 Chores"],["rewards","🎁 Rewards"],["calendar","📅 Cal"],["log","📝 Log"]].map(([key,label]) => (
              <button key={key} className={`tab-btn ${tab === key ? "active" : ""}`} style={{ flex: 1 }} onClick={() => setTab(key)}>
                {label}{key === "approve" && reviewTabCount > 0 && <span className="badge-pill">{reviewTabCount}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "20px 16px 80px" }}>

        {/* ══ DASHBOARD ══ */}
        {tab === "dashboard" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 22 }}>Leaderboard</h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setShowDeduct(true)} style={{ background: "#FEE2E2", color: C.red, padding: "8px 12px", borderRadius: 20, fontWeight: 800, fontSize: 12 }}>⚠️ Deduct</button>
                <button onClick={() => setShowAddMember(true)} style={{ background: C.secondary, color: "white", padding: "8px 12px", borderRadius: 20, fontWeight: 800, fontSize: 12 }}>+ Member</button>
              </div>
            </div>
            {sorted.length >= 3 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 12, marginBottom: 24, padding: "12px 0" }}>
                {[sorted[1], sorted[0], sorted[2]].map((m, i) => (
                  <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: i === 1 ? 1.2 : 1 }}>
                    <div style={{ fontSize: i===1?22:16 }}>{["🥈","🥇","🥉"][i]}</div>
                    <div style={{ fontSize: i===1?36:28, marginBottom: 4 }}>{m.emoji}</div>
                    <div style={{ fontWeight: 900, fontSize: i===1?15:13 }}>{m.name}</div>
                    <div style={{ fontWeight: 800, color: m.color, fontSize: i===1?18:14 }}>{m.points} pts</div>
                    <div style={{ width: "100%", height: [90,120,70][i], background: m.color, borderRadius: "12px 12px 0 0", marginTop: 8, opacity: 0.85 }} />
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {sorted.map((m, idx) => (
                <div key={m.id} className="card hover-lift" style={{ display: "flex", alignItems: "center", gap: 14, borderLeft: `5px solid ${m.color}` }}>
                  <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 20, color: C.muted, width: 28 }}>#{idx+1}</div>
                  <div style={{ fontSize: 28 }}>{m.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>{m.name}</div>
                    <div style={{ width: "100%", background: "#F3F4F6", borderRadius: 10, height: 8, marginTop: 6 }}>
                      <div style={{ width: `${(m.points/maxPoints)*100}%`, background: m.color, height: 8, borderRadius: 10, transition: "width 0.6s" }} />
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 22, color: m.color }}>{m.points}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>pts</div>
                  </div>
                </div>
              ))}
            </div>
            {upcomingEvents().length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 17, marginBottom: 10, color: C.muted }}>📅 Coming Up</h3>
                <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
                  {upcomingEvents().map(e => (
                    <div key={e.id} style={{ minWidth: 130, background: "white", border: `2px solid ${e.color}20`, borderTop: `4px solid ${e.color}`, borderRadius: 16, padding: "12px", flexShrink: 0 }}>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{e.emoji}</div>
                      <div style={{ fontWeight: 800, fontSize: 13 }}>{e.title}</div>
                      <div style={{ color: e.color, fontWeight: 900, fontSize: 13, marginTop: 4 }}>{e.daysAway === 0 ? "Today! 🎉" : `In ${e.daysAway}d`}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => setShowLogChore(true)} className="btn-primary" style={{ width: "100%", marginTop: 20, fontSize: 16, padding: "16px" }}>📤 Submit a Completed Chore</button>
          </div>
        )}

        {/* ══ REVIEW ══ */}
        {tab === "approve" && (
          <div>
            <h2 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 20, marginBottom: 12 }}>
              Chore Approvals {pendingCount > 0 && <span style={{ background: C.red, color: "white", fontSize: 13, borderRadius: 20, padding: "2px 10px", marginLeft: 8 }}>{pendingCount}</span>}
            </h2>
            {pending.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: 28, color: C.muted, marginBottom: 20 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div><div style={{ fontWeight: 700 }}>No chores to review!</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
                {pending.map(entry => (
                  <div key={entry.id} className="card" style={{ borderLeft: `5px solid ${entry.member_color}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <div style={{ fontSize: 28 }}>{entry.member_emoji}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 900, fontSize: 16 }}>{entry.member_name}</div>
                        <div style={{ color: C.muted, fontSize: 14 }}>{entry.chore_name}</div>
                        <div style={{ color: C.muted, fontSize: 12 }}>{new Date(entry.created_at).toLocaleString()}</div>
                      </div>
                      <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 24, color: C.green }}>+{entry.points}</div>
                    </div>
                    {entry.photo ? (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: C.muted, marginBottom: 6 }}>📸 Proof</div>
                        <img src={entry.photo} alt="proof" style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 12, cursor: "pointer", border: `2px solid ${C.border}` }} onClick={() => setShowPhotoView({ photo: entry.photo, entry: { ...entry, member: entry.member_name, chore: entry.chore_name } })} />
                      </div>
                    ) : <div style={{ marginBottom: 12, padding: "8px 14px", background: "#FFFBEB", borderRadius: 10, fontSize: 13, color: "#92400E", fontWeight: 700 }}>📷 No photo</div>}
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => handleReject(entry)} className="btn-red" style={{ flex: 1 }}>❌ Reject</button>
                      <button onClick={() => handleApprove(entry)} className="btn-green" style={{ flex: 1 }}>✅ Approve</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <h2 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 20, marginBottom: 12 }}>
              Reward Requests {rewardReqCount > 0 && <span style={{ background: C.purple, color: "white", fontSize: 13, borderRadius: 20, padding: "2px 10px", marginLeft: 8 }}>{rewardReqCount}</span>}
            </h2>
            {rewardRequests.filter(r => r.status === "pending").length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: 28, color: C.muted }}><div style={{ fontSize: 32, marginBottom: 8 }}>🎁</div><div style={{ fontWeight: 700 }}>No reward requests!</div></div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {rewardRequests.filter(r => r.status === "pending").map(req => (
                  <div key={req.id} className="card" style={{ borderLeft: `5px solid ${C.purple}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <div style={{ fontSize: 28 }}>{req.member_emoji}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 900 }}>{req.member_name} wants:</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: C.purple }}>{req.req_emoji} {req.name}</div>
                        {req.reason && <div style={{ fontSize: 13, color: C.muted }}>"{req.reason}"</div>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => handleRejectRequest(req)} className="btn-red" style={{ flex: 1 }}>❌ Reject</button>
                      <button onClick={() => { setShowReviewRequest(req); setReviewForm({ points: "" }); }} className="btn-purple" style={{ flex: 2 }}>✏️ Set Points & Publish</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ CHORES ══ */}
        {tab === "chores" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 22 }}>Chore List</h2>
              <button onClick={() => setShowAddChore(true)} className="btn-primary" style={{ fontSize: 13, padding: "10px 18px" }}>+ Add Chore</button>
            </div>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              {chores.map((c, i) => (
                <div key={c.id} className="row-hover" style={{ display: "flex", alignItems: "center", padding: "14px 20px", borderBottom: i < chores.length-1 ? `1px solid ${C.border}` : "none", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{c.name}</div>
                    <span className="diff-badge" style={{ background: DIFF[c.difficulty]?.color, marginTop: 4 }}>{DIFF[c.difficulty]?.label}</span>
                  </div>
                  <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 22, color: C.primary }}>{c.points}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>pts</div>
                  <button onClick={() => handleDeleteChore(c.id)} style={{ background: "#FEE2E2", color: C.red, borderRadius: 8, padding: "4px 10px", fontWeight: 800, fontSize: 13 }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ REWARDS ══ */}
        {tab === "rewards" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 22 }}>Reward Shop 🎁</h2>
              <button onClick={() => setShowRequestReward(true)} style={{ background: C.purple, color: "white", padding: "9px 14px", borderRadius: 20, fontWeight: 800, fontSize: 12 }}>🙋 Request</button>
            </div>
            {rewards.filter(r => r.custom).length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 17, marginBottom: 10, color: C.purple }}>✨ Custom Rewards</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {rewards.filter(r => r.custom).map(r => (
                    <div key={r.id} className="reward-card custom-reward" onClick={() => setShowRedeemReward(r)}>
                      <div style={{ fontSize: 28, marginBottom: 6 }}>{r.emoji}</div>
                      <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6 }}>{r.name}</div>
                      {r.requested_by && <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>by {r.requested_by}</div>}
                      <div style={{ background: `${C.purple}20`, borderRadius: 20, padding: "3px 12px", display: "inline-block", fontFamily: "'Fredoka One', cursive", fontSize: 17, color: C.purple }}>{r.cost} pts</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 17, marginBottom: 10 }}>🏪 Standard Rewards</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {rewards.filter(r => !r.custom).map(r => (
                <div key={r.id} className="reward-card" onClick={() => setShowRedeemReward(r)} style={{ borderTop: `4px solid ${C.accent}` }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{r.emoji}</div>
                  <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6 }}>{r.name}</div>
                  <div style={{ background: C.accent, borderRadius: 20, padding: "3px 12px", display: "inline-block", fontFamily: "'Fredoka One', cursive", fontSize: 17 }}>{r.cost} pts</div>
                </div>
              ))}
            </div>
            {rewardRequests.length > 0 && (
              <div>
                <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 17, marginBottom: 10, color: C.muted }}>📬 My Requests</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {rewardRequests.map(req => (
                    <div key={req.id} className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
                      <div style={{ fontSize: 22 }}>{req.req_emoji}</div>
                      <div style={{ flex: 1 }}><div style={{ fontWeight: 800, fontSize: 14 }}>{req.name}</div><div style={{ fontSize: 13, color: C.muted }}>by {req.member_name}</div></div>
                      <StatusBadge status={req.status} />
                      {req.status === "approved" && <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 16, color: C.green }}>{req.points} pts</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 17, marginBottom: 10, marginTop: 20 }}>💰 Balances</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {members.map(m => (
                <div key={m.id} className="card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 22 }}>{m.emoji}</div>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 800 }}>{m.name}</div><div style={{ color: C.muted, fontSize: 13 }}>Redeemed: {m.redeemed || 0} pts</div></div>
                  <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 20, color: m.color }}>{m.points} pts</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ CALENDAR ══ */}
        {tab === "calendar" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 22 }}>Family Calendar 📅</h2>
              <button onClick={() => setShowAddEvent(true)} className="btn-primary" style={{ fontSize: 13, padding: "10px 18px" }}>+ Add Date</button>
            </div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <button onClick={() => { if (calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1); }} style={{ background: "#F3F4F6", padding: "6px 14px", borderRadius: 20, fontWeight: 800, fontSize: 16 }}>‹</button>
                <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 20 }}>{MONTHS[calMonth]} {calYear}</div>
                <button onClick={() => { if (calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1); }} style={{ background: "#F3F4F6", padding: "6px 14px", borderRadius: 20, fontWeight: 800, fontSize: 16 }}>›</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
                {DAYS.map(d => <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 800, color: C.muted, padding: "4px 0" }}>{d}</div>)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
                {calGrid.map((d, i) => {
                  if (!d) return <div key={`e${i}`} />;
                  const isToday = d===today.getDate() && calMonth===today.getMonth() && calYear===today.getFullYear();
                  const dayEvents = eventsForDay(calYear, calMonth, d);
                  return (
                    <div key={d} className={`cal-day ${isToday?"today":""}`} onClick={() => { setSelectedDay(d); if (dayEvents.length>0) setShowEventDetail({day:d,events:dayEvents}); else { setEventForm(f=>({...f,date:`${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`})); setShowAddEvent(true); } }}>
                      <span style={{ fontSize: 13 }}>{d}</span>
                      <div style={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "center", marginTop: 1 }}>
                        {dayEvents.slice(0,2).map((e,ei) => <span key={ei} style={{ fontSize: 9 }}>{e.emoji}</span>)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {EVENT_TYPES.map(t => <div key={t.label} style={{ display: "flex", alignItems: "center", gap: 4, background: `${t.color}15`, borderRadius: 20, padding: "4px 10px", fontSize: 12, fontWeight: 700, color: t.color }}>{t.emoji} {t.label}</div>)}
            </div>
            <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 18, marginBottom: 12 }}>All Events</h3>
            {calEvents.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: 32, color: C.muted }}><div style={{ fontSize: 36, marginBottom: 8 }}>📅</div><div style={{ fontWeight: 700 }}>No events yet!</div></div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[...calEvents].sort((a,b) => new Date(a.date)-new Date(b.date)).map(e => (
                  <div key={e.id} className="card row-hover" style={{ display: "flex", alignItems: "center", gap: 14, borderLeft: `5px solid ${e.color}`, padding: "14px 18px" }}>
                    <div style={{ fontSize: 26 }}>{e.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>{e.title}</div>
                      <div style={{ color: C.muted, fontSize: 13 }}>{new Date(e.date).toLocaleDateString("en-US",{month:"long",day:"numeric"})}{e.recurring && <span style={{ marginLeft: 6, background: "#EDE9FE", color: C.purple, padding: "1px 8px", borderRadius: 10, fontSize: 11, fontWeight: 800 }}>Annual</span>}</div>
                    </div>
                    <button onClick={() => handleDeleteEvent(e.id)} style={{ background: "#FEE2E2", color: C.red, borderRadius: 8, padding: "4px 10px", fontWeight: 800, fontSize: 13 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ LOG ══ */}
        {tab === "log" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 22 }}>Activity Log</h2>
              <button onClick={() => setShowLogChore(true)} className="btn-primary" style={{ fontSize: 13, padding: "10px 18px" }}>+ Submit</button>
            </div>
            {log.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: 40, color: C.muted }}><div style={{ fontSize: 40, marginBottom: 12 }}>📋</div><div style={{ fontWeight: 700 }}>No activity yet!</div></div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                {log.map((entry, i) => (
                  <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: i<log.length-1?`1px solid ${C.border}`:"none" }}>
                    <div style={{ fontSize: 24 }}>{entry.member_emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800 }}>{entry.member_name}</div>
                      <div style={{ color: C.muted, fontSize: 13 }}>{entry.chore}</div>
                      <div style={{ marginTop: 4 }}><StatusBadge status={entry.status} /></div>
                    </div>
                    {entry.photo && <img src={entry.photo} alt="proof" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 10, cursor: "pointer" }} onClick={() => setShowPhotoView({ photo: entry.photo, entry: { ...entry, member: entry.member_name } })} />}
                    <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 18, color: entry.points>0?C.green:C.red }}>{entry.points>0?"+":""}{entry.points}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ════ MODAL: Submit Chore ════ */}
      {showLogChore && (
        <div className="modal-bg" onClick={() => setShowLogChore(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 22, marginBottom: 20 }}>📤 Submit a Chore</h3>
            <label>Family Member</label>
            <select value={logForm.memberId} onChange={e => setLogForm(f => ({ ...f, memberId: e.target.value }))}>
              <option value="">Choose member…</option>{members.map(m => <option key={m.id} value={m.id}>{m.emoji} {m.name}</option>)}
            </select>
            <label>Chore Completed</label>
            <select value={logForm.choreId} onChange={e => setLogForm(f => ({ ...f, choreId: e.target.value }))}>
              <option value="">Choose chore…</option>{chores.map(c => <option key={c.id} value={c.id}>{c.name} (+{c.points} pts)</option>)}
            </select>
            <label>📸 Photo Proof <span style={{ fontWeight: 400, color: C.muted, fontSize: 12 }}>(optional)</span></label>
            <input type="file" accept="image/*" ref={fileInputRef} style={{ display: "none" }} onChange={handlePhotoChange} />
            {logForm.photoPreview ? (
              <div style={{ position: "relative", marginTop: 8 }}>
                <img src={logForm.photoPreview} alt="preview" style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 12, border: `2px solid ${C.green}` }} />
                <button onClick={() => setLogForm(f => ({ ...f, photo: null, photoPreview: null }))} style={{ position: "absolute", top: 8, right: 8, background: C.red, color: "white", borderRadius: "50%", width: 26, height: 26, fontSize: 13, fontWeight: 900 }}>✕</button>
              </div>
            ) : (
              <div className="photo-upload-box" onClick={() => fileInputRef.current?.click()}>
                <div style={{ fontSize: 26, marginBottom: 4 }}>📷</div>
                <div style={{ fontWeight: 700, color: C.muted, fontSize: 14 }}>Tap to upload photo proof</div>
              </div>
            )}
            <div style={{ background: "#FEF9EC", borderRadius: 14, padding: "10px 14px", marginTop: 14, fontSize: 13, color: "#92400E", fontWeight: 700 }}>⏳ A parent will review before points are awarded.</div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={() => setShowLogChore(false)} style={{ flex: 1, padding: "12px", borderRadius: 30, fontWeight: 800, background: "#F3F4F6", color: C.text }}>Cancel</button>
              <button onClick={handleSubmitChore} className="btn-primary" style={{ flex: 2 }} disabled={!logForm.memberId || !logForm.choreId}>Submit 📬</button>
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL: Request Custom Reward ════ */}
      {showRequestReward && (
        <div className="modal-bg" onClick={() => setShowRequestReward(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 22, marginBottom: 6 }}>🙋 Request a Reward</h3>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 18 }}>Ask a parent to add a custom reward!</p>
            <label>Who's requesting?</label>
            <select value={rewardReqForm.memberId} onChange={e => setRewardReqForm(f => ({ ...f, memberId: e.target.value }))}>
              <option value="">Choose member…</option>{members.map(m => <option key={m.id} value={m.id}>{m.emoji} {m.name}</option>)}
            </select>
            <label>Reward Name</label>
            <input type="text" placeholder="e.g. New video game, Mall trip…" value={rewardReqForm.name} onChange={e => setRewardReqForm(f => ({ ...f, name: e.target.value }))} />
            <label style={{ marginBottom: 8 }}>Pick an Emoji</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              {["🎮","🎁","🍦","🎬","👟","📚","🧸","🎨","🎤","✈️","🎪","🍕"].map(e => (
                <button key={e} onClick={() => setRewardReqForm(f => ({ ...f, emoji: e }))} style={{ fontSize: 22, padding: "8px", borderRadius: 10, background: rewardReqForm.emoji===e ? C.accent : "#F3F4F6", border: rewardReqForm.emoji===e ? `2px solid ${C.primary}` : "2px solid transparent" }}>{e}</button>
              ))}
            </div>
            <label>Why do you want this? <span style={{ fontWeight: 400, color: C.muted }}>(optional)</span></label>
            <textarea placeholder="Tell your parents why…" rows={2} value={rewardReqForm.reason} onChange={e => setRewardReqForm(f => ({ ...f, reason: e.target.value }))} style={{ resize: "none" }} />
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={() => setShowRequestReward(false)} style={{ flex: 1, padding: "12px", borderRadius: 30, fontWeight: 800, background: "#F3F4F6", color: C.text }}>Cancel</button>
              <button onClick={handleSubmitRewardRequest} className="btn-purple" style={{ flex: 2, padding: "12px", borderRadius: 30, fontSize: 15 }} disabled={!rewardReqForm.memberId || !rewardReqForm.name.trim()}>Send Request 🙏</button>
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL: Review Reward Request ════ */}
      {showReviewRequest && (
        <div className="modal-bg" onClick={() => setShowReviewRequest(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 22, marginBottom: 6 }}>✏️ Review Reward Request</h3>
            <div style={{ background: "#F5F3FF", borderRadius: 16, padding: "16px", marginBottom: 20, border: `2px solid ${C.purple}30` }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>{showReviewRequest.req_emoji}</div>
              <div style={{ fontWeight: 900, fontSize: 18, color: C.purple }}>{showReviewRequest.name}</div>
              <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>by {showReviewRequest.member_emoji} {showReviewRequest.member_name}</div>
              {showReviewRequest.reason && <div style={{ marginTop: 8, fontSize: 14, fontStyle: "italic" }}>"{showReviewRequest.reason}"</div>}
            </div>
            <label>Set Point Cost</label>
            <input type="number" min="1" max="999" placeholder="e.g. 150" value={reviewForm.points} onChange={e => setReviewForm({ points: e.target.value })} />
            {reviewForm.points && <div style={{ marginTop: 10, padding: "10px 14px", background: "#F0FDF4", borderRadius: 12, fontSize: 14, fontWeight: 800, color: C.green }}>Will cost {reviewForm.points} points ✅</div>}
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={() => handleRejectRequest(showReviewRequest)} className="btn-red" style={{ flex: 1 }}>❌ Reject</button>
              <button onClick={handlePublishReward} className="btn-purple" style={{ flex: 2, padding: "12px", borderRadius: 30, fontSize: 15 }} disabled={!reviewForm.points || parseInt(reviewForm.points)<=0}>🎁 Publish Reward</button>
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL: Redeem Reward ════ */}
      {showRedeemReward && (
        <div className="modal-bg" onClick={() => setShowRedeemReward(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>{showRedeemReward.emoji}</div>
            <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 22, marginBottom: 4 }}>{showRedeemReward.name}</h3>
            <div style={{ background: showRedeemReward.custom ? `${C.purple}20` : C.accent, borderRadius: 20, padding: "6px 20px", display: "inline-block", fontFamily: "'Fredoka One', cursive", fontSize: 22, marginBottom: 20, color: showRedeemReward.custom ? C.purple : C.text }}>{showRedeemReward.cost} pts</div>
            <p style={{ color: C.muted, fontSize: 14, marginBottom: 16 }}>Who's redeeming?</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {members.map(m => (
                <button key={m.id} onClick={() => handleRedeem(m, showRedeemReward)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 14, background: m.points>=showRedeemReward.cost?"#F0FDF4":"#FEF2F2", border: `2px solid ${m.points>=showRedeemReward.cost?"#86EFAC":"#FECACA"}`, opacity: m.points>=showRedeemReward.cost?1:0.6 }}>
                  <div style={{ fontSize: 22 }}>{m.emoji}</div>
                  <div style={{ flex: 1, textAlign: "left", fontWeight: 800 }}>{m.name}</div>
                  <div style={{ fontFamily: "'Fredoka One', cursive", color: m.points>=showRedeemReward.cost?C.green:C.red }}>{m.points} pts</div>
                </button>
              ))}
            </div>
            <button onClick={() => setShowRedeemReward(null)} style={{ marginTop: 16, width: "100%", padding: "12px", borderRadius: 30, fontWeight: 800, background: "#F3F4F6", color: C.text }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ════ MODAL: Deduct Points ════ */}
      {showDeduct && (
        <div className="modal-bg" onClick={() => setShowDeduct(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 22, marginBottom: 6 }}>⚠️ Deduct Points</h3>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 18 }}>Remove points for misbehavior.</p>
            <label>Family Member</label>
            <select value={deductForm.memberId} onChange={e => setDeductForm(f => ({ ...f, memberId: e.target.value }))}>
              <option value="">Choose member…</option>{members.map(m => <option key={m.id} value={m.id}>{m.emoji} {m.name} — {m.points} pts</option>)}
            </select>
            <label style={{ marginBottom: 10 }}>Reason</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PENALTY_PRESETS.map(p => (
                <button key={p.label} className={`preset-btn ${deductForm.preset?.label===p.label?"selected":""}`} onClick={() => setDeductForm(f => ({ ...f, preset: p, customPts: "", reason: "" }))}>
                  {p.emoji} {p.label}{p.pts>0&&<span style={{ float:"right", color:C.red, fontWeight:900 }}>-{p.pts} pts</span>}
                </button>
              ))}
            </div>
            {deductForm.preset?.label==="Custom" && (
              <div style={{ marginTop: 14, padding: 14, background: "#FEF2F2", borderRadius: 14 }}>
                <label>Describe what happened</label>
                <input type="text" placeholder="e.g. Threw a tantrum" value={deductForm.reason} onChange={e => setDeductForm(f => ({ ...f, reason: e.target.value }))} />
                <label>Points to Deduct</label>
                <input type="number" min="1" max="100" placeholder="e.g. 25" value={deductForm.customPts} onChange={e => setDeductForm(f => ({ ...f, customPts: e.target.value }))} />
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={() => setShowDeduct(false)} style={{ flex: 1, padding: "12px", borderRadius: 30, fontWeight: 800, background: "#F3F4F6", color: C.text }}>Cancel</button>
              <button onClick={handleDeduct} className="btn-red" style={{ flex: 2, padding: "12px", borderRadius: 30, fontSize: 15 }} disabled={!deductForm.memberId||!deductForm.preset||(deductForm.preset.label==="Custom"&&(!deductForm.customPts||!deductForm.reason))}>Deduct ⚠️</button>
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL: Add Chore ════ */}
      {showAddChore && (
        <div className="modal-bg" onClick={() => setShowAddChore(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 22, marginBottom: 20 }}>📋 Add New Chore</h3>
            <label>Chore Name</label>
            <input type="text" placeholder="e.g. Clean the garage" value={choreForm.name} onChange={e => setChoreForm(f => ({ ...f, name: e.target.value, suggestedPoints: undefined }))} />
            <label>Difficulty</label>
            <select value={choreForm.difficulty} onChange={e => setChoreForm(f => ({ ...f, difficulty: e.target.value, suggestedPoints: undefined }))}>
              <option value="easy">Easy (5–15 pts)</option><option value="medium">Medium (15–30 pts)</option><option value="hard">Hard (30–50 pts)</option>
            </select>
            <button onClick={handleAISuggestPoints} disabled={aiLoading||!choreForm.name.trim()} style={{ width:"100%", marginTop:14, padding:"12px", borderRadius:30, fontWeight:800, fontSize:15, background:aiLoading?"#E5E7EB":C.purple, color:"white" }}>
              {aiLoading?"🤖 AI thinking…":"✨ AI Suggest Points"}
            </button>
            {choreForm.suggestedPoints && <div style={{ textAlign:"center", marginTop:12, padding:"12px", background:"#F5F3FF", borderRadius:14, fontWeight:800, color:C.purple, fontSize:18 }}>AI: {choreForm.suggestedPoints} points ⭐</div>}
            <div style={{ display:"flex", gap:10, marginTop:20 }}>
              <button onClick={() => setShowAddChore(false)} style={{ flex:1, padding:"12px", borderRadius:30, fontWeight:800, background:"#F3F4F6", color:C.text }}>Cancel</button>
              <button onClick={handleAddChore} className="btn-primary" style={{ flex:2 }} disabled={!choreForm.name.trim()}>Add Chore</button>
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL: Add Member ════ */}
      {showAddMember && (
        <div className="modal-bg" onClick={() => setShowAddMember(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 22, marginBottom: 20 }}>👋 Add Family Member</h3>
            <label>Name</label>
            <input type="text" placeholder="e.g. Jake" value={memberForm.name} onChange={e => setMemberForm(f => ({ ...f, name: e.target.value }))} />
            <label style={{ marginBottom: 8 }}>Pick an Emoji</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["👦","👧","👨","👩","🧑","👴","👵","🧒"].map(e => (
                <button key={e} onClick={() => setMemberForm(f => ({ ...f, emoji: e }))} style={{ fontSize: 26, padding: "8px", borderRadius: 12, background: memberForm.emoji===e?C.accent:"#F3F4F6", border: memberForm.emoji===e?`2px solid ${C.primary}`:"2px solid transparent" }}>{e}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button onClick={() => setShowAddMember(false)} style={{ flex: 1, padding: "12px", borderRadius: 30, fontWeight: 800, background: "#F3F4F6", color: C.text }}>Cancel</button>
              <button onClick={handleAddMember} className="btn-primary" style={{ flex: 2 }} disabled={!memberForm.name.trim()}>Add Member 🎉</button>
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL: Add Calendar Event ════ */}
      {showAddEvent && (
        <div className="modal-bg" onClick={() => setShowAddEvent(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 22, marginBottom: 20 }}>📅 Add Special Date</h3>
            <label>Event Name</label>
            <input type="text" placeholder="e.g. Dad's Birthday…" value={eventForm.title} onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))} />
            <label>Date</label>
            <input type="date" value={eventForm.date} onChange={e => setEventForm(f => ({ ...f, date: e.target.value }))} />
            <label>Event Type</label>
            <select value={eventForm.type} onChange={e => setEventForm(f => ({ ...f, type: e.target.value }))}>
              {EVENT_TYPES.map(t => <option key={t.label} value={t.label}>{t.emoji} {t.label}</option>)}
            </select>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, padding: "12px 16px", background: "#F9FAFB", borderRadius: 14 }}>
              <input type="checkbox" id="recurring" checked={eventForm.recurring} onChange={e => setEventForm(f => ({ ...f, recurring: e.target.checked }))} style={{ width: 20, height: 20, accentColor: C.purple, marginTop: 0 }} />
              <label htmlFor="recurring" style={{ margin: 0, cursor: "pointer", fontWeight: 700, fontSize: 14 }}>🔄 Repeat every year</label>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowAddEvent(false)} style={{ flex: 1, padding: "12px", borderRadius: 30, fontWeight: 800, background: "#F3F4F6", color: C.text }}>Cancel</button>
              <button onClick={handleAddEvent} className="btn-primary" style={{ flex: 2 }} disabled={!eventForm.title.trim()||!eventForm.date}>Save Date 📅</button>
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL: Event Detail ════ */}
      {showEventDetail && (
        <div className="modal-bg" onClick={() => setShowEventDetail(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 20, marginBottom: 16 }}>{MONTHS[calMonth]} {showEventDetail.day}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {showEventDetail.events.map(e => (
                <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: `${e.color}10`, borderRadius: 14, border: `2px solid ${e.color}30` }}>
                  <div style={{ fontSize: 28 }}>{e.emoji}</div>
                  <div><div style={{ fontWeight: 800, fontSize: 15 }}>{e.title}</div><div style={{ fontSize: 13, color: e.color, fontWeight: 700 }}>{e.type}{e.recurring?" · Annual":""}</div></div>
                </div>
              ))}
            </div>
            <button onClick={() => { setShowEventDetail(null); setEventForm(f => ({ ...f, date: `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(showEventDetail.day).padStart(2,"0")}` })); setShowAddEvent(true); }} style={{ width: "100%", marginTop: 16, padding: "12px", borderRadius: 30, fontWeight: 800, background: C.primary, color: "white" }}>+ Add Another</button>
            <button onClick={() => setShowEventDetail(null)} style={{ width: "100%", marginTop: 10, padding: "12px", borderRadius: 30, fontWeight: 800, background: "#F3F4F6", color: C.text }}>Close</button>
          </div>
        </div>
      )}

      {/* ════ MODAL: Full Photo ════ */}
      {showPhotoView && (
        <div className="modal-bg" onClick={() => setShowPhotoView(null)} style={{ background: "rgba(0,0,0,0.9)" }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 500, width: "100%", textAlign: "center" }}>
            <div style={{ color: "white", fontWeight: 800, fontSize: 16, marginBottom: 12 }}>{showPhotoView.entry.member_emoji} {showPhotoView.entry.member_name || showPhotoView.entry.member} — {showPhotoView.entry.chore_name || showPhotoView.entry.chore}</div>
            <img src={showPhotoView.photo} alt="proof" style={{ width: "100%", borderRadius: 20, maxHeight: "70vh", objectFit: "contain" }} />
            <button onClick={() => setShowPhotoView(null)} style={{ marginTop: 16, background: "rgba(255,255,255,0.15)", color: "white", padding: "10px 28px", borderRadius: 30, fontWeight: 800, border: "2px solid rgba(255,255,255,0.3)" }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
