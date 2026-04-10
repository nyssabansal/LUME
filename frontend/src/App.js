import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import { Bar } from "react-chartjs-2";
import "./App.css";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return [h, m, s].map((x) => String(x).padStart(2, "0")).join(":");
}

function fmtDur(mins) {
  if (!mins || mins <= 0) return "0m";
  if (mins < 1) return Math.round(mins * 60) + "s";
  if (mins < 60) return Math.round(mins) + "m";
  return Math.floor(mins / 60) + "h " + Math.round(mins % 60) + "m";
}

function calcFocusScore(sessions) {
  if (sessions.length < 2) return null;
  const durs = sessions.map((s) => Number(s.duration));
  const avg = durs.reduce((a, b) => a + b, 0) / durs.length;
  if (!avg) return null;
  const variance = durs.reduce((s, d) => s + Math.pow(d - avg, 2), 0) / durs.length;
  const cv = Math.sqrt(variance) / avg;
  const consistency = Math.max(0, Math.min(100, 100 - cv * 80));
  return Math.min(100, consistency * 0.8 + Math.min(20, avg * 2));
}

function getTag(duration) {
  if (duration > 25) return { label: "Deep focus", cls: "badge-deep" };
  if (duration > 10) return { label: "Good session", cls: "badge-good" };
  return { label: "Quick review", cls: "badge-quick" };
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function dateKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, accent }) {
  return (
    <div className={`metric-card${accent ? " accent" : ""}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-sub">{sub}</div>
    </div>
  );
}

function SessionRow({ session }) {
  const tag = getTag(Number(session.duration));
  return (
    <div className="session-row">
      <div style={{ display: "flex", alignItems: "center" }}>
        <div className="session-dot" />
        <div>
          <div className="session-subject">
            {session.subject}
            <span className={`session-badge ${tag.cls}`}>{tag.label}</span>
          </div>
          <div className="session-meta">
            {session.start_time} → {session.end_time || "ongoing"}
          </div>
        </div>
      </div>
      <div className="session-dur">{fmtDur(Number(session.duration))}</div>
    </div>
  );
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

function CalendarPage({ todos, setTodos }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(todayKey());
  const [input, setInput] = useState("");

  const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const MONTHS = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: daysInPrev - firstDay + 1 + i, key: null, other: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, key: dateKey(viewYear, viewMonth, d), other: false });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, key: null, other: true });
  }

  const todayStr = todayKey();
  const selectedTodos = todos[selected] || [];

  const addTodo = () => {
    if (!input.trim()) return;
    setTodos(prev => ({
      ...prev,
      [selected]: [...(prev[selected] || []), { id: Date.now(), text: input.trim(), done: false }],
    }));
    setInput("");
  };

  const toggleTodo = (id) => {
    setTodos(prev => ({
      ...prev,
      [selected]: prev[selected].map(t => t.id === id ? { ...t, done: !t.done } : t),
    }));
  };

  const deleteTodo = (id) => {
    setTodos(prev => ({
      ...prev,
      [selected]: prev[selected].filter(t => t.id !== id),
    }));
  };

  const selDate = new Date(selected + "T12:00:00");
  const selLabel = selDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Calendar <em>&</em> Tasks</h1>
        <p className="page-sub">Plan your week, track your to-dos</p>
      </div>
      <div className="calendar-layout">
        {/* Calendar grid */}
        <div className="cal-card">
          <div className="cal-nav">
            <button className="cal-arrow" onClick={prevMonth}>‹</button>
            <span className="cal-month">{MONTHS[viewMonth]} {viewYear}</span>
            <button className="cal-arrow" onClick={nextMonth}>›</button>
          </div>
          <div className="cal-grid">
            {DAYS.map(d => <div key={d} className="cal-day-label">{d}</div>)}
            {cells.map((cell, i) => {
              const hasTodos = cell.key && (todos[cell.key] || []).length > 0;
              return (
                <div
                  key={i}
                  className={[
                    "cal-day",
                    cell.other ? "other-month" : "",
                    cell.key === todayStr ? "today" : "",
                    cell.key === selected ? "selected" : "",
                    hasTodos ? "has-todos" : "",
                  ].join(" ").trim()}
                  onClick={() => cell.key && setSelected(cell.key)}
                >
                  {cell.day}
                </div>
              );
            })}
          </div>
        </div>

        {/* To-do panel */}
        <div className="todo-panel">
          <div className="todo-card">
            <div className="todo-date-heading">{selLabel}</div>
            <div className="todo-subtitle">
              {selectedTodos.length === 0
                ? "No tasks yet"
                : `${selectedTodos.filter(t => t.done).length} / ${selectedTodos.length} done`}
            </div>
            <div className="todo-input-row">
              <input
                className="todo-input"
                type="text"
                placeholder="Add a task…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTodo()}
              />
              <button className="todo-add-btn" onClick={addTodo}>+</button>
            </div>
            <div className="todo-list">
              {selectedTodos.length === 0 && (
                <p className="empty-msg">Nothing planned — enjoy the blank canvas.</p>
              )}
              {selectedTodos.map(todo => (
                <div key={todo.id} className={`todo-item${todo.done ? " done" : ""}`}>
                  <div
                    className={`todo-check${todo.done ? " checked" : ""}`}
                    onClick={() => toggleTodo(todo.id)}
                  />
                  <span className="todo-text">{todo.text}</span>
                  <button className="todo-delete" onClick={() => deleteTodo(todo.id)}>×</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tracker Page ─────────────────────────────────────────────────────────────

function TrackerPage({ sessions, setSessions }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [subject, setSubject] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [aiInsight, setAiInsight] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState(null);
  const startRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchSessions();
    return () => clearInterval(intervalRef.current);
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await axios.get("/sessions");
      setSessions(res.data);
    } catch {
      setError("Cannot reach Flask backend — make sure it's running on port 5000.");
    }
  };

  const startSession = async () => {
    setError(null);
    const now = new Date();
    try {
      const res = await axios.post("/start_session", {
        subject: subject.trim() || "General study",
        start_time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
      setSessionId(res.data.session.id);
      startRef.current = Date.now();
      setElapsed(0);
      setRunning(true);
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }, 1000);
    } catch {
      setError("Failed to start session.");
    }
  };

  const endSession = async () => {
    if (!sessionId) return;
    clearInterval(intervalRef.current);
    const endTime = new Date();
    const duration = (elapsed / 60).toFixed(2);
    try {
      await axios.post("/end_session", {
        id: sessionId,
        end_time: endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        duration: Number(duration),
      });
    } catch { setError("Failed to save session."); }
    setRunning(false);
    setElapsed(0);
    setSessionId(null);
    setSubject("");
    const res = await axios.get("/sessions");
    setSessions(res.data);
    getAIInsight(res.data);
  };

  const getAIInsight = async (all) => {
    if (!all.length) return;
    setAiLoading(true);
    setAiInsight(null);
    try {
      const res = await axios.post("/ai_insight", { sessions: all });
      setAiInsight(res.data.insight);
    } catch {
      setAiInsight(
        all.length === 1
          ? "Excellent start! Consistency beats intensity — one session at a time builds lasting habits."
          : "Great pattern! Try 25–30 minute focused blocks with short breaks for peak retention."
      );
    }
    setAiLoading(false);
  };

  const completed = sessions.filter(s => s.end_time);
  const total = completed.reduce((s, x) => s + Number(x.duration), 0);
  const avg = completed.length ? total / completed.length : 0;
  const focusScore = calcFocusScore(completed);

  const chartData = {
    labels: completed.map(s => s.subject.length > 10 ? s.subject.slice(0, 10) + "…" : s.subject),
    datasets: [{
      data: completed.map(s => parseFloat(Number(s.duration).toFixed(1))),
      backgroundColor: completed.map((_, i) =>
        i === completed.length - 1 ? "#c8a96e" : "rgba(200,169,110,0.25)"
      ),
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false }, tooltip: {
      callbacks: { label: ctx => " " + fmtDur(ctx.raw) },
      backgroundColor: "#1a1a1d",
      borderColor: "rgba(255,255,255,0.07)",
      borderWidth: 1,
      titleColor: "#9a9690",
      bodyColor: "#e8e4dc",
    }},
    scales: {
      y: { beginAtZero: true, ticks: { callback: v => fmtDur(v), color: "#5a5854", font: { size: 11 } }, grid: { color: "rgba(255,255,255,0.04)" } },
      x: { ticks: { color: "#5a5854", font: { size: 11 } }, grid: { display: false } },
    },
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Good {now.getHours() < 12 ? "morning" : now.getHours() < 17 ? "afternoon" : "evening"}, <em>scholar</em></h1>
        <p className="page-sub">{dateStr}</p>
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}

      <div className="metrics-row">
        <MetricCard label="Today" value={fmtDur(total)} sub="total study" />
        <MetricCard label="Sessions" value={completed.length} sub="completed" />
        <MetricCard label="Avg session" value={completed.length ? fmtDur(avg) : "—"} sub="per session" />
        <MetricCard label="Focus score" value={focusScore !== null ? Math.round(focusScore) + "%" : "—"} sub="consistency" accent={focusScore !== null} />
      </div>

      <div className="timer-section">
        <div className={`timer-card${running ? " running" : ""}`}>
          <div className="timer-digits">{fmt(elapsed)}</div>
          <div className="timer-status">
            {running ? `Studying · ${subject || "General study"}` : "Ready when you are"}
          </div>
          <input
            className="subject-field"
            type="text"
            placeholder="What are you studying?"
            value={subject}
            disabled={running}
            onChange={e => setSubject(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !running && startSession()}
          />
          {!running
            ? <button className="timer-btn start" onClick={startSession}>Start session</button>
            : <button className="timer-btn stop" onClick={endSession}>End session</button>
          }
        </div>

        <div className="quick-stats">
          <div className="stat-card">
            <div className="stat-title">Focus score</div>
            {focusScore !== null ? (
              <>
                <div className="focus-score-num">{Math.round(focusScore)}%</div>
                <div className="focus-bar-bg" style={{ marginTop: 10 }}>
                  <div className="focus-bar-fill" style={{ width: focusScore + "%" }} />
                </div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 6 }}>
                  {focusScore >= 80 ? "Excellent consistency" : focusScore >= 60 ? "Good rhythm" : "Building momentum"}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: "var(--text3)", fontStyle: "italic", marginTop: 8 }}>
                Complete 2+ sessions to unlock
              </div>
            )}
          </div>

          {(aiLoading || aiInsight) && (
            <div className="ai-insight-card">
              <div className="ai-label">AI Coach</div>
              <div className="ai-text" style={aiLoading ? { opacity: 0.5 } : {}}>
                {aiLoading ? "Analyzing your pattern…" : aiInsight}
              </div>
            </div>
          )}
        </div>
      </div>

      {completed.length > 0 && (
        <div className="chart-card">
          <div className="card-title">
            <span>Session history</span>
            <span style={{ color: "var(--text3)", fontSize: 12 }}>{completed.length} session{completed.length !== 1 ? "s" : ""}</span>
          </div>
          <Bar data={chartData} options={chartOptions} />
        </div>
      )}

      <div className="sessions-card">
        <div className="card-title">
          <span>Recent sessions</span>
        </div>
        {sessions.length === 0
          ? <p className="empty-msg">Your sessions will appear here.</p>
          : [...sessions].reverse().slice(0, 8).map(s => <SessionRow key={s.id} session={s} />)
        }
      </div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState("tracker");
  const [sessions, setSessions] = useState([]);
  const [todos, setTodos] = useState({});

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const navItems = [
    { id: "tracker", icon: "◷", label: "Study Tracker" },
    { id: "calendar", icon: "▦", label: "Calendar & Tasks" },
  ];

  return (
    <div className="app">
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-logo">
          <div className="logo-dot" />
          Lume
        </div>
        <div className="topbar-date">{dateStr}</div>
      </div>

      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-section">Navigation</div>
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item${page === item.id ? " active" : ""}`}
            onClick={() => setPage(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      {/* Main */}
      <div className="main">
        {page === "tracker" && <TrackerPage sessions={sessions} setSessions={setSessions} />}
        {page === "calendar" && <CalendarPage todos={todos} setTodos={setTodos} />}
      </div>
    </div>
  );
}
