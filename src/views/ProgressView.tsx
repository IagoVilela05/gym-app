import { useState, useMemo } from 'react';
import { BarChart2, TrendingUp, Trophy, Calendar, ChevronDown, Maximize2, X, Activity, ChevronLeft, ChevronRight, Target } from 'lucide-react';
import { AppData, WorkoutSession, MuscleGroup } from '../types';

interface Props {
  data: AppData;
}

type Period = '4w' | '8w' | '12w' | 'all';

const PERIODS: { id: Period; label: string }[] = [
  { id: '4w', label: '4 sem' },
  { id: '8w', label: '8 sem' },
  { id: '12w', label: '12 sem' },
  { id: 'all', label: 'Tudo' },
];

const MAX_VISIBLE_POINTS = 20;

function periodWeeks(p: Period): number | null {
  if (p === 'all') return null;
  return parseInt(p);
}

function formatDateShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

// Smart sampling: always keep first + last + evenly distributed intermediates
function samplePoints<T>(arr: T[], maxPoints: number): T[] {
  if (arr.length <= maxPoints) return arr;
  const result: T[] = [arr[0]];
  const step = (arr.length - 1) / (maxPoints - 1);
  for (let i = 1; i < maxPoints - 1; i++) {
    result.push(arr[Math.round(i * step)]);
  }
  result.push(arr[arr.length - 1]);
  return result;
}

function getExerciseHistory(
  sessions: WorkoutSession[],
  exerciseId: string,
  weeks: number | null
): { date: string; maxWeight: number; totalVolume: number; unit?: 'kg' | 'plates' }[] {
  const cutoff = weeks
    ? new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000)
    : null;

  return sessions
    .filter(s => {
      if (cutoff && new Date(s.startedAt) < cutoff) return false;
      return s.exercises.some(e => e.exerciseId === exerciseId);
    })
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
    .map(s => {
      const ex = s.exercises.find(e => e.exerciseId === exerciseId)!;
      const completed = ex.sets.filter(s => s.completed);
      const maxWeight = Math.max(0, ...completed.map(s => s.weight));
      const totalVolume = completed.reduce((acc, s) => acc + s.weight * s.reps, 0);
      const latestSet = completed[completed.length - 1];
      const unit = latestSet?.weightUnit ?? 'kg';
      return { date: s.startedAt, maxWeight, totalVolume, unit };
    })
    .filter(p => p.maxWeight > 0 || p.totalVolume >= 0);
}

type ChartPoint = { x: number; y: number; label: string; value: number };

// Core SVG chart — used in both compact and expanded modes
function ChartSVG({
  points,
  color,
  W,
  H,
  PAD,
  gradientId,
  showAllLabels = false,
}: {
  points: ChartPoint[];
  color: string;
  W: number;
  H: number;
  PAD: { top: number; bottom: number; left: number; right: number };
  gradientId: string;
  showAllLabels?: boolean;
}) {
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));
  const rangeY = maxY - minY || 1;

  const toX = (i: number) => PAD.left + (i / Math.max(points.length - 1, 1)) * W;
  const toY = (v: number) => PAD.top + (1 - (v - minY) / rangeY) * H;

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(p.y).toFixed(1)}`)
    .join(' ');
  const areaD = `${pathD} L ${toX(points.length - 1).toFixed(1)} ${(PAD.top + H).toFixed(1)} L ${toX(0).toFixed(1)} ${(PAD.top + H).toFixed(1)} Z`;

  const yLabels = [minY, minY + rangeY / 2, maxY].map(v => ({
    v,
    y: toY(v),
    text: v % 1 === 0 ? String(Math.round(v)) : v.toFixed(1),
  }));

  // How often to show x labels
  const labelEvery = showAllLabels ? 1 : Math.ceil(points.length / 6);

  return (
    <>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>

      {/* Grid lines + Y labels */}
      {yLabels.map(({ text, y }, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={y} x2={PAD.left + W} y2={y}
            stroke="var(--border)" strokeWidth={1} strokeDasharray="3 3" />
          <text x={PAD.left - 4} y={y + 4} textAnchor="end"
            fontSize={9} fill="var(--text-muted)">{text}</text>
        </g>
      ))}

      {/* Area fill */}
      <path d={areaD} fill={`url(#${gradientId})`} />

      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth={2.5}
        strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots + X labels */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={toX(i)} cy={toY(p.y)} r={4} fill={color} />
          <circle cx={toX(i)} cy={toY(p.y)} r={2} fill="var(--bg-surface)" />
          {(i % labelEvery === 0 || i === points.length - 1) && (
            <text x={toX(i)} y={PAD.top + H + PAD.bottom - 4} textAnchor="middle"
              fontSize={8} fill="var(--text-muted)">
              {p.label}
            </text>
          )}
          <title>{p.label}: {p.value}kg</title>
        </g>
      ))}
    </>
  );
}

// Expanded fullscreen chart modal
function ChartModal({
  allPoints,
  color,
  label,
  sampledCount,
  onClose,
}: {
  allPoints: ChartPoint[];
  color: string;
  label: string;
  sampledCount: number;
  onClose: () => void;
}) {
  const isSampled = allPoints.length > sampledCount;
  // Expanded: each point gets 44px of horizontal space minimum
  const pointW = Math.max(44, 320 / Math.max(allPoints.length - 1, 1));
  const W = (allPoints.length - 1) * pointW;
  const H = 180;
  const PAD = { top: 16, bottom: 32, left: 40, right: 20 };
  const totalWidth = PAD.left + W + PAD.right;
  const totalHeight = PAD.top + H + PAD.bottom;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(6px)',
        display: 'flex', flexDirection: 'column',
      }}
      onClick={onClose}
    >
      <div
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          padding: '0 0 env(safe-area-inset-bottom)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 20px 12px',
        }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700 }}>{label}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {allPoints.length} sessões
              {isSampled && (
                <span style={{ marginLeft: 6, color: 'var(--accent)' }}>
                  · visão completa
                </span>
              )}
            </div>
          </div>
          <button
            className="btn btn-icon"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable chart */}
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: '0 0 20px' }}>
          <svg
            viewBox={`0 0 ${totalWidth} ${totalHeight}`}
            width={Math.max(totalWidth, 360)}
            height={totalHeight}
            style={{ display: 'block' }}
          >
            <ChartSVG
              points={allPoints}
              color={color}
              W={W}
              H={H}
              PAD={PAD}
              gradientId="grad-expanded"
              showAllLabels
            />
          </svg>
        </div>

        {/* Hint */}
        <div style={{
          textAlign: 'center', fontSize: '0.72rem',
          color: 'var(--text-muted)', paddingBottom: 16,
        }}>
          ← arraste para ver todo o histórico →
        </div>
      </div>
    </div>
  );
}

// Compact chart card (with expand button)
function LineChart({
  allPoints,
  sampledPoints,
  color,
  label,
  onExpand,
}: {
  allPoints: ChartPoint[];
  sampledPoints: ChartPoint[];
  color: string;
  label: string;
  onExpand: () => void;
}) {
  const W = 300;
  const H = 120;
  const PAD = { top: 12, bottom: 28, left: 36, right: 12 };
  const totalWidth = PAD.left + W + PAD.right;
  const totalHeight = PAD.top + H + PAD.bottom;
  const isSampled = allPoints.length > sampledPoints.length;

  if (sampledPoints.length === 0) {
    return (
      <div style={{ height: totalHeight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Sem dados suficientes</span>
      </div>
    );
  }

  return (
    <div>
      {/* Chart header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          {label}
          {isSampled && (
            <span style={{ marginLeft: 6, fontSize: '0.62rem', color: 'var(--accent)', fontWeight: 500 }}>
              ({sampledPoints.length} de {allPoints.length} sessões)
            </span>
          )}
        </div>
        <button
          onClick={onExpand}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
            gap: 4, fontSize: '0.65rem', padding: '2px 4px',
          }}
          title="Expandir gráfico"
        >
          <Maximize2 size={13} />
          expandir
        </button>
      </div>

      <svg
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        width="100%"
        style={{ display: 'block' }}
      >
        <ChartSVG
          points={sampledPoints}
          color={color}
          W={W}
          H={H}
          PAD={PAD}
          gradientId="grad-compact"
        />
      </svg>
    </div>
  );
}

// ─── General Stats View ───────────────────────────────────────────────────────

const DAYS_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function GeneralStatsView({ data }: { data: AppData }) {
  const sessions = data.sessions;
  const accentColor = useMemo(() => {
    const val = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    return val || '#4f8ef7';
  }, [data.settings.theme]);

  // Selected month for calendar navigation
  const [viewDate, setViewDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  // Muscle group distribution time range filter: 'week' (7 days) or 'month' (30 days)
  const [muscleRange, setMuscleRange] = useState<'week' | 'month'>('month');

  const trainedDays = useMemo(() => {
    const set = new Set<string>();
    for (const s of sessions) {
      const d = new Date(s.startedAt);
      set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }
    return set;
  }, [sessions]);

  function isDayTrained(y: number, m: number, d: number) {
    return trainedDays.has(`${y}-${m}-${d}`);
  }

  // ── Monthly Calendar Grid Construction ────────────────────────
  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  const monthName = viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const calendarCells = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);

    const totalDays = lastDay.getDate();
    const startWeekday = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Mon=0...Sun=6

    const cells: ({ day: number; date: Date } | null)[] = [];
    // Padding before day 1
    for (let i = 0; i < startWeekday; i++) {
      cells.push(null);
    }
    // Days of the month
    for (let d = 1; d <= totalDays; d++) {
      cells.push({ day: d, date: new Date(currentYear, currentMonth, d) });
    }
    return cells;
  }, [currentYear, currentMonth]);

  function prevMonth() {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }

  function nextMonth() {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }

  // ── Summary stats ─────────────────────────────────────────────
  const today = new Date();

  // Sessions in selected month
  const selectedMonthSessions = sessions.filter(s => {
    const d = new Date(s.startedAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  // Average per week (last 28 days)
  const last4wSessions = sessions.filter(s =>
    new Date(s.startedAt).getTime() > Date.now() - 28 * 24 * 60 * 60 * 1000
  );
  const avgPerWeek = (last4wSessions.length / 4).toFixed(1);

  // Active weeks consistency: count of weeks in last 4 weeks with >= 3 workouts
  const activeWeeksCount = useMemo(() => {
    let count = 0;
    const nowTs = Date.now();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    for (let w = 0; w < 4; w++) {
      const wStart = nowTs - (w + 1) * msPerWeek;
      const wEnd = nowTs - w * msPerWeek;
      const wSessions = sessions.filter(s => {
        const t = new Date(s.startedAt).getTime();
        return t >= wStart && t < wEnd;
      }).length;
      if (wSessions >= 3) count++;
    }
    return count;
  }, [sessions]);

  // Most frequent weekday
  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
  for (const s of sessions) {
    const wd = new Date(s.startedAt).getDay();
    const moIndex = wd === 0 ? 6 : wd - 1;
    weekdayCounts[moIndex]++;
  }
  const topDayIdx = weekdayCounts.indexOf(Math.max(...weekdayCounts));
  const topDay = sessions.length > 0 ? DAYS_SHORT[topDayIdx] : '—';

  // ── Muscle group distribution (7 days vs 30 days) ──────────────────
  const muscleCount = useMemo(() => {
    const days = muscleRange === 'week' ? 7 : 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const exerciseMap = new Map(data.exercises.map(e => [e.id, e]));
    const counts: Partial<Record<MuscleGroup, number>> = {};
    for (const s of sessions) {
      if (new Date(s.startedAt).getTime() < cutoff) continue;
      for (const ex of s.exercises) {
        const exercise = exerciseMap.get(ex.exerciseId);
        if (!exercise) continue;
        const mg = exercise.muscleGroup;
        counts[mg] = (counts[mg] ?? 0) + ex.sets.filter(s => s.completed).length;
      }
    }
    return counts;
  }, [sessions, data.exercises, muscleRange]);

  const muscleEntries = Object.entries(muscleCount)
    .sort(([, a], [, b]) => b - a) as [MuscleGroup, number][];
  const maxMuscle = muscleEntries[0]?.[1] ?? 1;

  if (sessions.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><Activity size={30} /></div>
        <h3>Sem dados ainda</h3>
        <p>Complete seu primeiro treino para ver as estatísticas gerais aqui.</p>
      </div>
    );
  }

  return (
    <>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          { icon: <Calendar size={16} color="var(--accent)" />, value: selectedMonthSessions, label: 'Sessões no mês' },
          { icon: <TrendingUp size={16} color="#34d399" />, value: avgPerWeek, label: 'Média/sem' },
          { icon: <Target size={16} color="#f97316" />, value: `${activeWeeksCount}/4`, label: 'Streak' },
          { icon: <Trophy size={16} color="var(--warning)" />, value: topDay, label: 'Dia favorito' },
        ].map(({ icon, value, label }) => (
          <div key={label} className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            {icon}
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800 }}>{value}</div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 1 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Monthly Frequency Calendar */}
      <div className="card" style={{ padding: '16px', marginBottom: 16 }}>
        {/* Month Navigation Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <button className="btn btn-icon" onClick={prevMonth} aria-label="Mês anterior" style={{ width: 32, height: 32 }}>
            <ChevronLeft size={18} />
          </button>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', textTransform: 'capitalize' }}>
            {monthName}
          </div>
          <button className="btn btn-icon" onClick={nextMonth} aria-label="Próximo mês" style={{ width: 32, height: 32 }}>
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Weekday Labels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
          {DAYS_SHORT.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day Cells Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }}>
          {calendarCells.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} style={{ height: 34 }} />;
            }
            const trained = isDayTrained(currentYear, currentMonth, cell.day);
            const isToday =
              today.getDate() === cell.day &&
              today.getMonth() === currentMonth &&
              today.getFullYear() === currentYear;

            return (
              <div
                key={cell.day}
                style={{
                  height: 34,
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: trained ? 800 : 500,
                  background: trained ? accentColor : 'var(--bg-input)',
                  color: trained ? 'var(--text-on-accent)' : 'var(--text-primary)',
                  border: isToday && !trained ? '1.5px solid var(--accent)' : 'none',
                  boxShadow: trained ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {cell.day}
              </div>
            );
          })}
        </div>
      </div>

      {/* Muscle group distribution */}
      <div className="card" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            DISTRIBUIÇÃO MUSCULAR
          </div>
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-input)', padding: 2, borderRadius: 'var(--radius-sm)' }}>
            <button
              onClick={() => setMuscleRange('week')}
              style={{
                background: muscleRange === 'week' ? 'var(--bg-card)' : 'none',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '3px 8px',
                fontSize: '0.7rem',
                fontWeight: 600,
                color: muscleRange === 'week' ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer',
                boxShadow: muscleRange === 'week' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              Semanal
            </button>
            <button
              onClick={() => setMuscleRange('month')}
              style={{
                background: muscleRange === 'month' ? 'var(--bg-card)' : 'none',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '3px 8px',
                fontSize: '0.7rem',
                fontWeight: 600,
                color: muscleRange === 'month' ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer',
                boxShadow: muscleRange === 'month' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              Mensal
            </button>
          </div>
        </div>

        {muscleEntries.length === 0 ? (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
            Nenhum treino registrado {muscleRange === 'week' ? 'nos últimos 7 dias' : 'nos últimos 30 dias'}.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {muscleEntries.map(([group, count]) => (
              <div key={group}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 3 }}>
                  <span style={{ fontWeight: 600 }}>{group}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{count} séries</span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-input)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 999,
                    width: `${(count / maxMuscle) * 100}%`,
                    background: accentColor,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main ProgressView ────────────────────────────────────────────────────────

type ProgressTab = 'general' | 'exercise';

export function ProgressView({ data }: Props) {
  const [activeTab, setActiveTab] = useState<ProgressTab>('general');

  const exercisesWithHistory = useMemo(() => {
    const ids = new Set(data.sessions.flatMap(s => s.exercises.map(e => e.exerciseId)));
    return data.exercises.filter(e => ids.has(e.id));
  }, [data]);

  const [selectedExId, setSelectedExId] = useState<string | null>(
    exercisesWithHistory[0]?.id ?? null
  );
  const [period, setPeriod] = useState<Period>('all');
  const [showExPicker, setShowExPicker] = useState(false);
  const [chartExpanded, setChartExpanded] = useState(false);

  const selectedEx = data.exercises.find(e => e.id === selectedExId);
  const weeks = periodWeeks(period);

  const history = useMemo(
    () => (selectedExId ? getExerciseHistory(data.sessions, selectedExId, weeks) : []),
    [selectedExId, data.sessions, weeks]
  );

  const isAssisted = selectedEx?.isAssisted ?? false;
  const prWeight = history.length
    ? (isAssisted
        ? Math.min(...history.map((h) => h.maxWeight))
        : Math.max(...history.map((h) => h.maxWeight)))
    : 0;
  const lastSession = history.length ? history[history.length - 1] : null;
  const sessionCount = history.length;

  // All points (full history)
  const allWeightPoints: ChartPoint[] = history.map(h => ({
    x: 0,
    y: h.maxWeight,
    label: formatDateShort(h.date),
    value: h.maxWeight,
  }));

  // Sampled points for compact view
  const sampledWeightPoints = samplePoints(allWeightPoints, MAX_VISIBLE_POINTS);

  const accentColor = useMemo(() => {
    const val = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    return val || '#4f8ef7';
  }, [data.settings.theme]);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Progresso</h1>
      </header>

      {/* Sub-tab switcher */}
      <div style={{ display: 'flex', gap: 0, padding: '0 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-base)' }}>
        {([['general', 'Geral'], ['exercise', 'Exercício']] as [ProgressTab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            style={{
              flex: 1, padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: 600,
              color: activeTab === id ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: activeTab === id ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <main className="page-content">
        {activeTab === 'general' ? (
          <GeneralStatsView data={data} />
        ) : exercisesWithHistory.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <BarChart2 size={30} />
            </div>
            <h3>Sem dados ainda</h3>
            <p>Complete ao menos um treino para visualizar sua evolução aqui.</p>
          </div>
        ) : (
          <>
            {/* Exercise selector */}
            <div style={{ marginBottom: 16, position: 'relative' }}>
              <button
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'space-between', padding: '10px 14px', gap: 8 }}
                onClick={() => setShowExPicker(p => !p)}
              >
                <div style={{ textAlign: 'left', minWidth: 0 }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Exercício
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedEx?.name ?? 'Selecione um exercício'}
                  </div>
                </div>
                <ChevronDown
                  size={16} color="var(--text-muted)"
                  style={{ flexShrink: 0, transform: showExPicker ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                />
              </button>

              {showExPicker && (
                <div className="card" style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                  maxHeight: 240, overflowY: 'auto', marginTop: 4,
                  boxShadow: 'var(--shadow-float)',
                }}>
                  {exercisesWithHistory.map((ex, i) => (
                    <div key={ex.id}>
                      {i > 0 && <div style={{ height: 1, background: 'var(--border)' }} />}
                      <button
                        style={{
                          width: '100%', padding: '11px 14px', background: 'none', border: 'none',
                          textAlign: 'left', cursor: 'pointer',
                          color: ex.id === selectedExId ? 'var(--accent)' : 'var(--text-primary)',
                          fontWeight: ex.id === selectedExId ? 700 : 400,
                          fontSize: '0.9rem',
                        }}
                        onClick={() => { setSelectedExId(ex.id); setShowExPicker(false); }}
                      >
                        {ex.name}
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 8 }}>{ex.muscleGroup}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Period filter */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
              {PERIODS.map(p => (
                <button
                  key={p.id}
                  className={`btn btn-sm ${period === p.id ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ flex: 1, fontSize: '0.78rem' }}
                  onClick={() => setPeriod(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Stats cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
              <div className="card" style={{ padding: '12px 10px', textAlign: 'center' }}>
                <Trophy size={16} color="var(--warning)" style={{ marginBottom: 4 }} />
                <div style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                  {prWeight > 0 ? `${prWeight}${history.length && history[history.length - 1].unit === 'plates' ? ' pl' : 'kg'}` : '—'}
                </div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>PR</div>
              </div>
              <div className="card" style={{ padding: '12px 10px', textAlign: 'center' }}>
                <TrendingUp size={16} color="var(--accent)" style={{ marginBottom: 4 }} />
                <div style={{ fontSize: '1.05rem', fontWeight: 800 }}>{sessionCount}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>Sessões</div>
              </div>
              <div className="card" style={{ padding: '12px 10px', textAlign: 'center' }}>
                <Calendar size={16} color="var(--text-muted)" style={{ marginBottom: 4 }} />
                <div style={{ fontSize: '0.82rem', fontWeight: 800, lineHeight: 1.2 }}>
                  {lastSession ? formatDateShort(lastSession.date) : '—'}
                </div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>Última</div>
              </div>
            </div>

            {/* Chart card */}
            <div className="card" style={{ padding: '16px' }}>
              <LineChart
                allPoints={allWeightPoints}
                sampledPoints={sampledWeightPoints}
                color={accentColor}
                label={`Carga máxima por sessão (${history.length && history[history.length - 1].unit === 'plates' ? 'placas' : 'kg'})`}
                onExpand={() => setChartExpanded(true)}
              />
            </div>

            {sessionCount < 2 && (
              <div style={{
                marginTop: 12, padding: '10px 14px',
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.78rem', color: 'var(--text-muted)',
                textAlign: 'center',
              }}>
                💡 Faça mais sessões deste exercício para ver a evolução no gráfico
              </div>
            )}
          </>
        )}
      </main>

      {/* Expanded chart modal */}
      {chartExpanded && (
        <ChartModal
          allPoints={allWeightPoints}
          color={accentColor}
          label={`${selectedEx?.name ?? 'Exercício'} — Carga máxima (${history.length && history[history.length - 1].unit === 'plates' ? 'placas' : 'kg'})`}
          sampledCount={MAX_VISIBLE_POINTS}
          onClose={() => setChartExpanded(false)}
        />
      )}
    </div>
  );
}
