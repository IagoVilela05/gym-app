import { useState } from 'react';
import { Plus, Dumbbell, MoreVertical, Edit2, Trash2, Copy, Play, Layers, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, X } from 'lucide-react';
import { AppData, WorkoutTemplate, TrainingBlock, Exercise } from '../types';
import { WorkoutEditor } from '../components/WorkoutEditor';
import { TrainingBlockModal } from '../components/TrainingBlockModal';
import { generateId, saveTrainingBlocks, saveExercises } from '../services/storage';

interface Props {
  data: AppData;
  onUpdate: (data: AppData) => void;
  onStartWorkout: (template: WorkoutTemplate) => void;
}

// ─── Block helpers ─────────────────────────────────────────────────────────────

const PHASE_LABELS: Record<string, string> = {
  hypertrophy: 'Hipertrofia',
  strength: 'Força',
  deload: 'Deload',
  custom: 'Personalizado',
};

const PHASE_COLORS: Record<string, string> = {
  hypertrophy: '#f97316',
  strength: '#4f8ef7',
  deload: '#34d399',
  custom: '#a78bfa',
};

function getBlockWeekInfo(block: TrainingBlock) {
  const start = new Date(block.startedAt).getTime();
  const now = Date.now();
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weekElapsed = Math.floor((now - start) / msPerWeek) + 1;
  const currentWeek = Math.min(weekElapsed, block.durationWeeks);
  const isLastWeek = currentWeek === block.durationWeeks;
  const isOverdue = weekElapsed > block.durationWeeks;
  const progress = Math.min(currentWeek / block.durationWeeks, 1);
  const endDate = new Date(start + block.durationWeeks * msPerWeek);
  return { currentWeek, isLastWeek, isOverdue, progress, endDate };
}

// ─── Active Block Card ─────────────────────────────────────────────────────────

function ActiveBlockCard({
  block,
  onEnd,
}: {
  block: TrainingBlock;
  onEnd: () => void;
}) {
  const { currentWeek, isLastWeek, isOverdue, progress, endDate } = getBlockWeekInfo(block);
  const color = PHASE_COLORS[block.phase] ?? '#4f8ef7';
  const isDeloadWeek = block.deloadLastWeek && isLastWeek && block.phase !== 'deload';

  return (
    <div style={{
      borderRadius: 'var(--radius-md)',
      border: `1.5px solid ${isDeloadWeek ? 'rgba(52,211,153,0.4)' : `${color}40`}`,
      background: isDeloadWeek ? 'rgba(52,211,153,0.06)' : `${color}0d`,
      padding: '14px 16px',
      marginBottom: 4,
    }}>
      {/* Deload / Overdue alert */}
      {isDeloadWeek && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 10px', marginBottom: 10,
          background: 'rgba(52,211,153,0.12)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.78rem', fontWeight: 600, color: '#34d399',
        }}>
          <CheckCircle2 size={14} />
          Semana de deload — reduza o volume e a intensidade
        </div>
      )}
      {isOverdue && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 10px', marginBottom: 10,
          background: 'rgba(251,191,36,0.1)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.78rem', fontWeight: 600, color: 'var(--warning)',
        }}>
          <AlertTriangle size={14} />
          Bloco encerrado — inicie um novo bloco
        </div>
      )}

      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              padding: '2px 8px', borderRadius: 999,
              background: `${color}25`, color,
              fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              {PHASE_LABELS[block.phase]}
            </div>
            {!isOverdue && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Sem. {currentWeek}/{block.durationWeeks}
              </span>
            )}
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: 4 }}>{block.name}</div>
        </div>
        <button
          onClick={onEnd}
          style={{
            fontSize: '0.7rem', color: 'var(--text-muted)',
            background: 'none', border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-sm)', padding: '4px 10px', cursor: 'pointer',
          }}
        >
          Encerrar
        </button>
      </div>

      {/* Progress bar */}
      {!isOverdue && (
        <div>
          <div style={{
            height: 6, borderRadius: 999,
            background: 'var(--bg-input)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 999,
              width: `${progress * 100}%`,
              background: isDeloadWeek ? '#34d399' : color,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
            Término previsto: {endDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </div>
        </div>
      )}

      {block.notes && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>
          {block.notes}
        </div>
      )}
    </div>
  );
}

// ─── Past Block Item ───────────────────────────────────────────────────────────

function PastBlockItem({ block }: { block: TrainingBlock }) {
  const color = PHASE_COLORS[block.phase] ?? '#4f8ef7';
  const start = new Date(block.startedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const end = block.endedAt
    ? new Date(block.endedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    : '—';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px',
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: color, flexShrink: 0,
      }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{block.name}</div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          {start} → {end} · {block.durationWeeks} sem
        </div>
      </div>
    </div>
  );
}

// ─── Training Block Section ────────────────────────────────────────────────────

function TrainingBlockSection({
  data,
  onUpdate,
}: {
  data: AppData;
  onUpdate: (d: AppData) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [showPast, setShowPast] = useState(false);

  const blocks = data.trainingBlocks ?? [];
  const activeBlock = blocks.find(b => !b.endedAt) ?? null;
  const pastBlocks = blocks.filter(b => !!b.endedAt).reverse();

  function handleNewBlock(block: TrainingBlock) {
    // End any current active block
    const now = new Date().toISOString();
    const updated = blocks.map(b =>
      b.endedAt ? b : { ...b, endedAt: now }
    );
    const next = saveTrainingBlocks(data, [...updated, block]);
    onUpdate(next);
    setShowModal(false);
  }

  function handleEndBlock() {
    const now = new Date().toISOString();
    const updated = blocks.map(b => b.endedAt ? b : { ...b, endedAt: now });
    const next = saveTrainingBlocks(data, updated);
    onUpdate(next);
  }

  return (
    <>
      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: '0.72rem', fontWeight: 700,
          color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          <Layers size={13} />
          Bloco de Treino
        </div>
        <button
          className="btn btn-ghost btn-sm"
          style={{ fontSize: '0.75rem', gap: 5, padding: '5px 10px' }}
          onClick={() => setShowModal(true)}
        >
          <Plus size={13} />
          {activeBlock ? 'Novo bloco' : 'Iniciar bloco'}
        </button>
      </div>

      {/* Active block or empty state */}
      {activeBlock ? (
        <ActiveBlockCard block={activeBlock} onEnd={handleEndBlock} />
      ) : (
        <div style={{
          padding: '12px 14px', marginBottom: 4,
          background: 'var(--bg-input)', borderRadius: 'var(--radius-md)',
          fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center',
        }}>
          Nenhum bloco ativo — inicie um para acompanhar sua periodização
        </div>
      )}

      {/* Past blocks */}
      {pastBlocks.length > 0 && (
        <div>
          <button
            onClick={() => setShowPast(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.72rem', color: 'var(--text-muted)', padding: '4px 0',
            }}
          >
            {showPast ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {pastBlocks.length} bloco{pastBlocks.length !== 1 ? 's' : ''} anterior{pastBlocks.length !== 1 ? 'es' : ''}
          </button>

          {showPast && (
            <div className="card" style={{ marginTop: 6 }}>
              {pastBlocks.map((b, i) => (
                <div key={b.id}>
                  {i > 0 && <div style={{ height: 1, background: 'var(--border)' }} />}
                  <PastBlockItem block={b} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <TrainingBlockModal
          onSave={handleNewBlock}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

// ─── Workout Preview Modal ─────────────────────────────────────────────────────

function WorkoutPreviewModal({
  template,
  data,
  onStart,
  onEdit,
  onClose,
}: {
  template: WorkoutTemplate;
  data: AppData;
  onStart: (t: WorkoutTemplate) => void;
  onEdit: (t: WorkoutTemplate) => void;
  onClose: () => void;
}) {
  const exerciseMap = new Map(data.exercises.map((e) => [e.id, e]));

  // Helper to find last performance of an exercise across all completed sessions
  function getLastExercisePerformance(exerciseId: string) {
    const sorted = [...data.sessions]
      .filter((s) => s.finishedAt)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    for (const session of sorted) {
      const ex = session.exercises.find((e) => e.exerciseId === exerciseId);
      if (ex) {
        const completedSets = ex.sets.filter((s) => s.completed);
        if (completedSets.length > 0) {
          return {
            date: session.startedAt,
            sets: completedSets,
          };
        }
      }
    }
    return null;
  }

  const totalSets = template.exercises.reduce((acc, e) => acc + e.sets, 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-sheet animate-slide-up"
        style={{ maxHeight: '92dvh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-handle" />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Visualização da Ficha
            </div>
            <h2 className="modal-title" style={{ margin: '2px 0 0', fontSize: '1.2rem' }}>
              {template.name}
            </h2>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {template.exercises.length} exercícios · {totalSets} séries no total
            </div>
          </div>
          <button className="btn btn-icon" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        {template.description && (
          <div style={{
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            background: 'var(--bg-input)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            marginBottom: 16,
          }}>
            {template.description}
          </div>
        )}

        {/* Exercise list with last performance */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2, marginBottom: 16 }}>
          {template.exercises.map((we, idx) => {
            const ex = exerciseMap.get(we.exerciseId);
            if (!ex) return null;
            const perf = getLastExercisePerformance(we.exerciseId);

            return (
              <div key={we.exerciseId} className="card" style={{ padding: '12px 14px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                        {idx + 1}.
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                        {ex.name}
                      </span>
                      {ex.isAssisted && (
                        <span style={{
                          fontSize: '0.6rem',
                          background: 'var(--accent-glow)',
                          color: 'var(--accent)',
                          border: '1px solid var(--accent)',
                          padding: '1px 5px',
                          borderRadius: 999,
                          fontWeight: 600,
                        }}>
                          Gravíton
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>
                      {ex.muscleGroup}
                    </div>
                  </div>
                </div>

                {/* Target */}
                <div style={{
                  fontSize: '0.75rem',
                  color: 'var(--accent)',
                  fontWeight: 600,
                  marginBottom: 8,
                }}>
                  Meta: {we.sets} séries · {we.repsMin}–{we.repsMax} reps · {we.restSeconds}s descanso
                </div>

                {/* Last performance */}
                <div style={{
                  background: 'var(--bg-input)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  padding: '8px 12px',
                  fontSize: '0.76rem',
                }}>
                  {perf ? (
                    <div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.66rem',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        marginBottom: 6,
                        fontWeight: 700,
                      }}>
                        <span>Última vez</span>
                        <span>{new Date(perf.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {perf.sets.map((s, sIdx) => (
                          <span
                            key={sIdx}
                            style={{
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border-strong)',
                              padding: '3px 8px',
                              borderRadius: 'var(--radius-sm)',
                              fontWeight: 700,
                              fontSize: '0.74rem',
                              color: 'var(--text-primary)',
                            }}
                          >
                            {s.weight > 0 ? `${s.weight}${s.weightUnit === 'plates' ? 'pl' : 'kg'}` : '0kg'} × {s.reps}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.73rem' }}>
                      Primeira vez — Nenhum registro de treino anterior
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', gap: 10, paddingTop: 6 }}>
          <button
            className="btn btn-ghost"
            style={{ flex: 1, gap: 6 }}
            onClick={() => {
              onClose();
              onEdit(template);
            }}
          >
            <Edit2 size={16} />
            Editar Ficha
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1.5, gap: 6 }}
            onClick={() => {
              onClose();
              onStart(template);
            }}
          >
            <Play size={16} fill="currentColor" />
            Iniciar Treino
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main WorkoutsView ─────────────────────────────────────────────────────────

export function WorkoutsView({ data, onUpdate, onStartWorkout }: Props) {
  const [viewingTemplate, setViewingTemplate] = useState<WorkoutTemplate | null>(null);
  const [editTarget, setEditTarget] = useState<WorkoutTemplate | null | 'new'>(null);
  const [menuTarget, setMenuTarget] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  function handleSave(t: WorkoutTemplate) {
    const templates = editTarget === 'new'
      ? [...data.workoutTemplates, t]
      : data.workoutTemplates.map((w) => (w.id === t.id ? t : w));
    onUpdate({ ...data, workoutTemplates: templates });
    setEditTarget(null);
  }

  function handleCreateExercise(newEx: Exercise) {
    const next = saveExercises(data, [...data.exercises, newEx]);
    onUpdate(next);
  }

  function handleDelete(id: string) {
    onUpdate({ ...data, workoutTemplates: data.workoutTemplates.filter((w) => w.id !== id) });
    setDeleteConfirm(null);
    setMenuTarget(null);
  }

  function handleDuplicate(t: WorkoutTemplate) {
    const now = new Date().toISOString();
    const copy: WorkoutTemplate = {
      ...t,
      id: generateId(),
      name: `${t.name} (Cópia)`,
      createdAt: now,
      updatedAt: now,
    };
    onUpdate({ ...data, workoutTemplates: [...data.workoutTemplates, copy] });
    setMenuTarget(null);
  }

  const templates = [...data.workoutTemplates].sort((a, b) =>
    a.name.localeCompare(b.name, 'pt-BR', { numeric: true, sensitivity: 'base' })
  );

  return (
    <div className="page">
      <header className="page-header">
        <h1>Meus Treinos</h1>
        <button
          id="btn-new-workout"
          className="btn btn-primary btn-sm"
          onClick={() => setEditTarget('new')}
          style={{ gap: 6 }}
        >
          <Plus size={16} />
          Novo
        </button>
      </header>

      <main className="page-content">
        {/* ── Training Block Section ── */}
        <TrainingBlockSection data={data} onUpdate={onUpdate} />

        <div style={{ height: 1, background: 'var(--border)' }} />

        {/* ── Workout Templates ── */}
        {templates.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Dumbbell size={30} />
            </div>
            <h3>Nenhuma ficha criada</h3>
            <p>Crie sua primeira ficha de treino para começar a registrar seus exercícios.</p>
            <button
              className="btn btn-primary"
              onClick={() => setEditTarget('new')}
              style={{ gap: 8 }}
            >
              <Plus size={18} />
              Criar Primeira Ficha
            </button>
          </div>
        ) : (
          templates.map((t) => {
            const exerciseCount = t.exercises.length;
            const totalSets = t.exercises.reduce((acc, e) => acc + e.sets, 0);
            const isMenuOpen = menuTarget === t.id;

            return (
              <div key={t.id} style={{ position: 'relative' }}>
                <div
                  className="workout-card"
                  id={`workout-card-${t.id}`}
                  onClick={() => setViewingTemplate(t)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Icon */}
                  <div className="workout-card-icon">
                    <Dumbbell size={22} />
                  </div>

                  {/* Info */}
                  <div className="workout-card-info">
                    <div className="workout-card-name">{t.name}</div>
                    <div className="workout-card-meta">
                      {exerciseCount} exercício{exerciseCount !== 1 ? 's' : ''} · {totalSets} séries
                    </div>
                    {t.description && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {t.description}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="workout-card-actions">
                    <button
                      className="btn btn-primary btn-sm"
                      id={`btn-start-${t.id}`}
                      onClick={(e) => { e.stopPropagation(); onStartWorkout(t); }}
                      style={{ gap: 5, padding: '8px 12px' }}
                      aria-label="Iniciar treino"
                    >
                      <Play size={14} />
                      Iniciar
                    </button>
                    <button
                      className="btn btn-icon"
                      id={`btn-menu-${t.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuTarget(isMenuOpen ? null : t.id);
                      }}
                      aria-label="Opções"
                    >
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </div>

                {/* Context Menu */}
                {isMenuOpen && (
                  <>
                    <div
                      style={{ position: 'fixed', inset: 0, zIndex: 49 }}
                      onClick={() => setMenuTarget(null)}
                    />
                    <div style={{
                      position: 'absolute', right: 0, top: '100%', zIndex: 50,
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-float)',
                      minWidth: 180, overflow: 'hidden',
                      animation: 'scaleIn 0.15s ease both',
                      transformOrigin: 'top right', marginTop: 4,
                    }}>
                      <button
                        className="exercise-list-item"
                        id={`btn-edit-${t.id}`}
                        style={{ width: '100%', gap: 10 }}
                        onClick={(e) => { e.stopPropagation(); setEditTarget(t); setMenuTarget(null); }}
                      >
                        <Edit2 size={16} color="var(--text-secondary)" />
                        <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Editar Ficha</span>
                      </button>
                      <button
                        className="exercise-list-item"
                        id={`btn-duplicate-${t.id}`}
                        style={{ width: '100%', gap: 10 }}
                        onClick={(e) => { e.stopPropagation(); handleDuplicate(t); }}
                      >
                        <Copy size={16} color="var(--text-secondary)" />
                        <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Duplicar</span>
                      </button>
                      <button
                        className="exercise-list-item"
                        id={`btn-delete-${t.id}`}
                        style={{ width: '100%', gap: 10, borderTop: '1px solid var(--border)' }}
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(t.id); setMenuTarget(null); }}
                      >
                        <Trash2 size={16} color="var(--danger)" />
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--danger)' }}>Excluir</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </main>

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: 'auto' }}>
            <div className="modal-handle" />
            <h2 className="modal-title">Excluir Treino?</h2>
            <p style={{ marginBottom: 24 }}>
              Esta ação não pode ser desfeita. O histórico de sessões não será afetado.
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setDeleteConfirm(null)}>
                Cancelar
              </button>
              <button
                className="btn btn-danger"
                style={{ flex: 1 }}
                id={`btn-confirm-delete-${deleteConfirm}`}
                onClick={() => handleDelete(deleteConfirm)}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workout Preview Modal */}
      {viewingTemplate && (
        <WorkoutPreviewModal
          template={viewingTemplate}
          data={data}
          onStart={(t) => {
            setViewingTemplate(null);
            onStartWorkout(t);
          }}
          onEdit={(t) => {
            setViewingTemplate(null);
            setEditTarget(t);
          }}
          onClose={() => setViewingTemplate(null)}
        />
      )}

      {/* Editor */}
      {editTarget !== null && (
        <WorkoutEditor
          template={editTarget === 'new' ? undefined : editTarget}
          exercises={data.exercises}
          onSave={handleSave}
          onCreateExercise={handleCreateExercise}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}
