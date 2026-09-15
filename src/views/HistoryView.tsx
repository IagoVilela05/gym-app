import { useState } from 'react';
import { History, ChevronRight, ChevronLeft, Trophy, StickyNote } from 'lucide-react';
import { AppData, WorkoutSession } from '../types';

interface Props {
  data: AppData;
}

function formatDuration(seconds?: number) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}min${s > 0 ? ` ${s}s` : ''}`;
}

function formatDateShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function getWeekLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const startOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    d.setHours(0, 0, 0, 0);
    return d;
  };
  const sessionWeek = startOfWeek(d).getTime();
  const thisWeek = startOfWeek(now).getTime();
  const lastWeek = thisWeek - 7 * 24 * 60 * 60 * 1000;
  if (sessionWeek === thisWeek) return 'Esta semana';
  if (sessionWeek === lastWeek) return 'Semana passada';
  const weekStart = startOfWeek(d);
  return weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + ' – ' +
    new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

// Session Detail View
function SessionDetail({ session, data, onBack }: { session: WorkoutSession; data: AppData; onBack: () => void }) {
  const template = data.workoutTemplates.find(t => t.id === session.templateId);
  const exerciseMap = new Map(data.exercises.map(e => [e.id, e]));
  const totalSets = session.exercises.reduce((acc, e) => acc + e.sets.filter(s => s.completed).length, 0);
  const hasPR = session.exercises.some(e => e.sets.some(s => s.isPersonalRecord));

  return (
    <div className="page">
      <header className="page-header" style={{ borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-icon" onClick={onBack} aria-label="Voltar">
            <ChevronLeft size={22} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.05rem' }}>{template?.name ?? 'Treino'}</h1>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {formatDateShort(session.startedAt)} · {formatTime(session.startedAt)}
            </div>
          </div>
        </div>
      </header>

      <main className="page-content">
        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Duração', value: formatDuration(session.durationSeconds) },
            { label: 'Séries', value: `${totalSets} concluídas` },
            { label: 'Exercícios', value: `${session.exercises.length}` },
            { label: 'PRs', value: hasPR ? '🏆 Sim!' : '—' },
          ].map((stat) => (
            <div key={stat.label} className="card" style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                {stat.label}
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Exercise details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {session.exercises.map((loggedEx) => {
            const exercise = exerciseMap.get(loggedEx.exerciseId);
            const completedSets = loggedEx.sets.filter(s => s.completed);
            if (!exercise) return null;

            return (
              <div key={loggedEx.exerciseId} className="card">
                <div style={{ padding: '14px 16px 10px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 2 }}>{exercise.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{exercise.muscleGroup}</div>
                </div>

                {loggedEx.notes && (
                  <div style={{
                    margin: '0 16px 10px',
                    padding: '8px 10px',
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex', gap: 6, alignItems: 'flex-start',
                  }}>
                    <StickyNote size={13} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{loggedEx.notes}</span>
                  </div>
                )}

                <div style={{ borderTop: '1px solid var(--border)', padding: '6px 16px 12px' }}>
                  {/* Header */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '28px 1fr 1fr auto',
                    gap: 4,
                    padding: '6px 0 4px',
                  }}>
                    {['Série', 'Peso', 'Reps', ''].map((h, i) => (
                      <span key={i} style={{
                        fontSize: '0.6rem', color: 'var(--text-muted)',
                        textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600,
                        textAlign: i === 0 ? 'center' : i < 3 ? 'center' : 'right',
                      }}>{h}</span>
                    ))}
                  </div>

                  {/* Sets */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {loggedEx.sets.map((set, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '28px 1fr 1fr auto',
                          gap: 4,
                          padding: '8px 0',
                          borderRadius: 'var(--radius-sm)',
                          background: set.completed ? 'var(--success-dim)' : 'transparent',
                          opacity: set.completed ? 1 : 0.4,
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                          {idx + 1}
                        </span>
                        <span style={{ textAlign: 'center', fontSize: '0.92rem', fontWeight: 700 }}>
                          {set.weight > 0 ? `${set.weight} ${set.weightUnit === 'plates' ? 'pl' : 'kg'}` : '—'}
                        </span>
                        <span style={{ textAlign: 'center', fontSize: '0.92rem', fontWeight: 700 }}>
                          {set.reps}
                        </span>
                        <span style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                          {set.isPersonalRecord ? <Trophy size={14} color="var(--warning)" /> : ''}
                        </span>
                      </div>
                    ))}
                    {completedSets.length === 0 && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
                        Nenhuma série concluída
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

// Main HistoryView
export function HistoryView({ data }: Props) {
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);
  const templateMap = new Map(data.workoutTemplates.map((t) => [t.id, t]));
  const sessions = [...data.sessions].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  if (selectedSession) {
    return (
      <SessionDetail
        session={selectedSession}
        data={data}
        onBack={() => setSelectedSession(null)}
      />
    );
  }

  // Group by week
  const grouped: { label: string; sessions: WorkoutSession[] }[] = [];
  const seenWeeks = new Map<string, number>();
  for (const s of sessions) {
    const label = getWeekLabel(s.startedAt);
    if (!seenWeeks.has(label)) {
      seenWeeks.set(label, grouped.length);
      grouped.push({ label, sessions: [] });
    }
    grouped[seenWeeks.get(label)!].sessions.push(s);
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Histórico</h1>
        {sessions.length > 0 && (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {sessions.length === 1 ? '1 sessão registrada' : `${sessions.length} sessões registradas`}
          </div>
        )}
      </header>

      <main className="page-content">
        {sessions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <History size={30} />
            </div>
            <h3>Sem sessões registradas</h3>
            <p>Complete seu primeiro treino para que ele apareça aqui.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {grouped.map((group) => (
              <div key={group.label}>
                {/* Week label */}
                <div style={{
                  fontSize: '0.72rem', fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  marginBottom: 8, paddingLeft: 2,
                }}>
                  {group.label}
                </div>

                <div className="card">
                  {group.sessions.map((session, idx) => {
                    const template = templateMap.get(session.templateId);
                    const totalSets = session.exercises.reduce((acc, e) => acc + e.sets.filter(s => s.completed).length, 0);
                    const totalExercises = session.exercises.length;
                    const hasPR = session.exercises.some(e => e.sets.some(s => s.isPersonalRecord));

                    return (
                      <div key={session.id}>
                        {idx > 0 && <div style={{ height: 1, background: 'var(--border)', margin: '0 16px' }} />}
                        <button
                          className="exercise-list-item"
                          style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
                          onClick={() => setSelectedSession(session)}
                        >
                          <div style={{
                            width: 44, height: 44, borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-input)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, color: 'var(--accent)',
                            lineHeight: 1.2,
                          }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>
                              {new Date(session.startedAt).toLocaleDateString('pt-BR', { day: '2-digit' })}
                            </span>
                            <span style={{ fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase' }}>
                              {new Date(session.startedAt).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                            </span>
                          </div>
                          <div className="info">
                            <div className="name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {template?.name ?? 'Treino removido'}
                              {hasPR && <Trophy size={12} color="var(--warning)" />}
                            </div>
                            <div className="meta">
                              {formatTime(session.startedAt)} · {formatDuration(session.durationSeconds)}
                            </div>
                            <div className="meta" style={{ marginTop: 2 }}>
                              {totalSets} séries · {totalExercises} exercícios
                            </div>
                          </div>
                          <ChevronRight size={16} color="var(--text-muted)" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
