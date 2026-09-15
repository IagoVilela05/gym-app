import { useState } from 'react';
import { X, Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { WorkoutTemplate, WorkoutExercise, Exercise } from '../types';
import { ExercisePicker } from './ExercisePicker';
import { generateId } from '../services/storage';

interface Props {
  template?: WorkoutTemplate;
  exercises: Exercise[];
  onSave: (template: WorkoutTemplate) => void;
  onCreateExercise?: (ex: Exercise) => void;
  onClose: () => void;
}

const DEFAULT_EXERCISE: Omit<WorkoutExercise, 'exerciseId' | 'order'> = {
  sets: 3,
  repsMin: 8,
  repsMax: 12,
  restSeconds: 90,
};

export function WorkoutEditor({ template, exercises, onSave, onCreateExercise, onClose }: Props) {
  const [name, setName]           = useState(template?.name ?? '');
  const [description, setDesc]    = useState(template?.description ?? '');
  const [workoutExs, setWorkoutExs] = useState<WorkoutExercise[]>(() => {
    const validIds = new Set(exercises.map((e) => e.id));
    return (template?.exercises ?? []).filter((we) => validIds.has(we.exerciseId));
  });
  const [showPicker, setShowPicker] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

  function addExercises(ids: string[]) {
    const existing = new Set(workoutExs.map((w) => w.exerciseId));
    const newOnes = ids
      .filter((id) => !existing.has(id))
      .map((id, i) => ({
        exerciseId: id,
        order: workoutExs.length + i,
        ...DEFAULT_EXERCISE,
      }));
    setWorkoutExs([...workoutExs, ...newOnes]);
    setShowPicker(false);
  }

  function moveExercise(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= workoutExs.length) return;
    const copy = [...workoutExs];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);
    setWorkoutExs(copy.map((item, i) => ({ ...item, order: i })));
  }

  function removeExercise(exerciseId: string) {
    setWorkoutExs(workoutExs.filter((w) => w.exerciseId !== exerciseId));
  }

  function updateExercise(exerciseId: string, patch: Partial<WorkoutExercise>) {
    setWorkoutExs(workoutExs.map((w) =>
      w.exerciseId === exerciseId ? { ...w, ...patch } : w
    ));
  }

  function handleSave() {
    if (!name.trim()) return;
    const now = new Date().toISOString();
    onSave({
      id: template?.id ?? generateId(),
      name: name.trim(),
      description: description.trim() || undefined,
      exercises: workoutExs.map((w, i) => ({ ...w, order: i })),
      createdAt: template?.createdAt ?? now,
      updatedAt: now,
    });
  }

  const isValid = name.trim().length > 0;

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-sheet"
          style={{ maxHeight: '96dvh' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-handle" />

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 className="modal-title" style={{ margin: 0 }}>
              {template ? 'Editar Treino' : 'Novo Treino'}
            </h2>
            <button className="btn btn-icon" onClick={onClose} aria-label="Fechar">
              <X size={20} />
            </button>
          </div>

          <div className="modal-form">
            {/* Workout name */}
            <div className="input-group">
              <label className="input-label" htmlFor="workout-name">Nome do Treino</label>
              <input
                id="workout-name"
                className="input"
                placeholder="Ex: Treino A - Peito e Tríceps"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus={!template}
              />
            </div>

            {/* Description */}
            <div className="input-group">
              <label className="input-label" htmlFor="workout-desc">Descrição (opcional)</label>
              <input
                id="workout-desc"
                className="input"
                placeholder="Ex: Foco em volume e hipertrofia"
                value={description}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>

            {/* Exercises section */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span className="input-label">Exercícios ({workoutExs.length})</span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowPicker(true)}
                  style={{ gap: 6 }}
                >
                  <Plus size={15} />
                  Adicionar
                </button>
              </div>

              {workoutExs.length === 0 ? (
                <div style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  border: '1.5px dashed var(--border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                }}>
                  Nenhum exercício adicionado.<br />
                  Toque em <strong>Adicionar</strong> para escolher.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {workoutExs.map((we, index) => {
                    const ex = exerciseMap.get(we.exerciseId);
                    if (!ex) return null;
                    const isExpanded = expandedId === we.exerciseId;

                    return (
                      <div key={we.exerciseId} className="card animate-scale-in">
                        {/* Exercise header row */}
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                          cursor: 'pointer',
                        }} onClick={() => setExpandedId(isExpanded ? null : we.exerciseId)}>
                          {/* Reorder Up/Down controls */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="btn btn-icon"
                              style={{
                                width: 24, height: 20, padding: 0,
                                opacity: index === 0 ? 0.2 : 0.8,
                                color: 'var(--text-primary)',
                              }}
                              disabled={index === 0}
                              onClick={() => moveExercise(index, 'up')}
                              title="Mover para cima"
                              aria-label="Mover para cima"
                            >
                              <ChevronUp size={15} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-icon"
                              style={{
                                width: 24, height: 20, padding: 0,
                                opacity: index === workoutExs.length - 1 ? 0.2 : 0.8,
                                color: 'var(--text-primary)',
                              }}
                              disabled={index === workoutExs.length - 1}
                              onClick={() => moveExercise(index, 'down')}
                              title="Mover para baixo"
                              aria-label="Mover para baixo"
                            >
                              <ChevronDown size={15} />
                            </button>
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.88rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {ex.name}
                              {(ex as any).isAssisted && (
                                <span style={{
                                  fontSize: '0.6rem',
                                  background: 'var(--accent-glow)',
                                  color: 'var(--accent)',
                                  border: '1px solid var(--accent)',
                                  padding: '1px 5px',
                                  borderRadius: 999,
                                  fontWeight: 600,
                                  marginLeft: 6,
                                }}>
                                  Gravíton
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                              {we.sets} séries · {we.repsMin}–{we.repsMax} reps · {we.restSeconds}s descanso
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {isExpanded
                              ? <ChevronUp size={16} color="var(--text-muted)" />
                              : <ChevronDown size={16} color="var(--text-muted)" />
                            }
                            <button
                              className="btn btn-icon"
                              style={{ width: 32, height: 32, color: 'var(--danger)' }}
                              onClick={(e) => { e.stopPropagation(); removeExercise(we.exerciseId); }}
                              aria-label={`Remover ${ex.name}`}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        {/* Expanded config */}
                        {isExpanded && (
                          <div style={{
                            padding: '0 14px 14px',
                            borderTop: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
                          }}>
                            {/* Sets */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, paddingTop: 12 }}>
                              <div className="input-group">
                                <label className="input-label">Séries</label>
                                <NumberStepper
                                  value={we.sets}
                                  min={1} max={10}
                                  onChange={(v) => updateExercise(we.exerciseId, { sets: v })}
                                />
                              </div>
                              <div className="input-group">
                                <label className="input-label">Reps Min</label>
                                <NumberStepper
                                  value={we.repsMin}
                                  min={1} max={50}
                                  onChange={(v) => updateExercise(we.exerciseId, { repsMin: Math.min(v, we.repsMax) })}
                                />
                              </div>
                              <div className="input-group">
                                <label className="input-label">Reps Max</label>
                                <NumberStepper
                                  value={we.repsMax}
                                  min={1} max={50}
                                  onChange={(v) => updateExercise(we.exerciseId, { repsMax: Math.max(v, we.repsMin) })}
                                />
                              </div>
                            </div>
                            {/* Rest */}
                            <div className="input-group">
                              <label className="input-label">Descanso</label>
                              <select
                                className="select"
                                value={we.restSeconds}
                                onChange={(e) => updateExercise(we.exerciseId, { restSeconds: Number(e.target.value) })}
                              >
                                {[30, 45, 60, 90, 120, 150, 180, 240, 300].map((s) => (
                                  <option key={s} value={s}>
                                    {s < 60 ? `${s}s` : `${s / 60}min${s % 60 ? ` ${s % 60}s` : ''}`}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="modal-actions">
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 2, opacity: isValid ? 1 : 0.5 }}
                disabled={!isValid}
                onClick={handleSave}
              >
                {template ? 'Salvar Alterações' : 'Criar Treino'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showPicker && (
        <ExercisePicker
          exercises={exercises}
          selectedIds={workoutExs.map((w) => w.exerciseId)}
          onConfirm={addExercises}
          onCreateExercise={onCreateExercise}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}

// ─── Internal NumberStepper ────────────────────────────────────────────────────

function NumberStepper({ value, min, max, onChange }: {
  value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <div className="stepper">
      <button className="stepper-btn" onClick={() => onChange(Math.max(min, value - 1))}>−</button>
      <span className="stepper-value">{value}</span>
      <button className="stepper-btn" onClick={() => onChange(Math.min(max, value + 1))}>+</button>
    </div>
  );
}
