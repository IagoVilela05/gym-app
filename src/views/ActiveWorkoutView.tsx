import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft, Check, Flag,
  ChevronDown, ChevronUp, Clock, AlertCircle,
  Pause, Play, Plus, Minus, ArrowLeftRight, Search, X,
} from 'lucide-react';
import { AppData, WorkoutTemplate, WorkoutSession, LoggedExercise, LoggedSet, WorkoutDraft, MuscleGroup, Exercise } from '../types';
import { generateId, saveDraft, clearDraft, loadDraft } from '../services/storage';

interface Props {
  template: WorkoutTemplate;
  data: AppData;
  initialDraft?: WorkoutDraft | null;
  onFinish: (session: WorkoutSession, updatedTemplate?: WorkoutTemplate) => void;
  onCancel: () => void;
  onMinimize?: () => void;
  onUpdateTemplate?: (template: WorkoutTemplate) => void;
}

const MUSCLE_GROUPS: MuscleGroup[] = [
  'Peito', 'Costas', 'Ombros', 'Biceps', 'Triceps',
  'Pernas', 'Gluteos', 'Abdomen', 'Panturrilha', 'Antebraco', 'Cardio', 'Full Body',
];

const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  'Peito': 'Peito',
  'Costas': 'Costas',
  'Ombros': 'Ombros',
  'Biceps': 'Bíceps',
  'Triceps': 'Tríceps',
  'Pernas': 'Pernas',
  'Gluteos': 'Glúteos',
  'Abdomen': 'Abdômen',
  'Panturrilha': 'Panturrilha',
  'Antebraco': 'Antebraço',
  'Cardio': 'Cardio',
  'Full Body': 'Full Body',
};

// helpers

function getLatestExerciseSetsAcrossSessions(
  data: AppData,
  exerciseId: string
): LoggedSet[] {
  const past = [...data.sessions]
    .filter((s) => s.finishedAt)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  for (const s of past) {
    const found = s.exercises.find((e) => e.exerciseId === exerciseId);
    if (found) {
      const completed = found.sets.filter((st) => st.completed);
      if (completed.length > 0) return completed;
    }
  }
  return [];
}

function getBestSet(sets: LoggedSet[]): { weight: number; reps: number; weightUnit?: 'kg' | 'plates' } | null {
  const completed = sets.filter((s) => s.completed);
  if (!completed.length) return null;
  return completed.reduce((a, b) => (b.weight > a.weight ? b : a));
}

// Strictly evaluates whether a completed set is a Personal Record
function isPersonalRecord(
  data: AppData,
  loggedExercises: LoggedExercise[],
  exerciseId: string,
  weight: number,
  reps: number,
  unit: 'kg' | 'plates' = 'kg'
): boolean {
  if (reps <= 0) return false;
  const exercise = data.exercises.find((e) => e.id === exerciseId);
  const isAssisted = exercise?.isAssisted ?? false;

  if (isAssisted) {
    if (weight < 0) return false;
    // For assisted exercises: less assistance weight = harder = PR
    // 1. Check past completed sessions with SAME unit
    for (const session of data.sessions) {
      for (const ex of session.exercises) {
        if (ex.exerciseId !== exerciseId) continue;
        for (const s of ex.sets) {
          const sUnit = s.weightUnit ?? 'kg';
          if (s.completed && sUnit === unit && s.weight <= weight && s.reps >= reps) return false;
        }
      }
    }
    // 2. Check current active session with SAME unit
    const currentEx = loggedExercises.find((e) => e.exerciseId === exerciseId);
    if (currentEx) {
      for (const s of currentEx.sets) {
        const sUnit = s.weightUnit ?? 'kg';
        if (s.completed && sUnit === unit && s.weight <= weight && s.reps >= reps) return false;
      }
    }
    return true;
  }

  if (weight <= 0) return false;

  // 1. Check past completed sessions with SAME unit
  for (const session of data.sessions) {
    for (const ex of session.exercises) {
      if (ex.exerciseId !== exerciseId) continue;
      for (const s of ex.sets) {
        const sUnit = s.weightUnit ?? 'kg';
        if (s.completed && sUnit === unit && s.weight >= weight && s.reps >= reps) return false;
      }
    }
  }

  // 2. Check already completed sets in CURRENT active session with SAME unit
  const currentEx = loggedExercises.find((e) => e.exerciseId === exerciseId);
  if (currentEx) {
    for (const s of currentEx.sets) {
      const sUnit = s.weightUnit ?? 'kg';
      if (s.completed && sUnit === unit && s.weight >= weight && s.reps >= reps) return false;
    }
  }

  return true;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Swap Exercise Modal ────────────────────────────────────────────────────────

function SwapExerciseModal({
  currentExercise,
  exercises,
  onConfirm,
  onClose,
}: {
  currentExercise: Exercise;
  exercises: Exercise[];
  onConfirm: (newExerciseId: string, isPermanent: boolean) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<MuscleGroup | 'Todos'>(currentExercise.muscleGroup);
  const [selectedExId, setSelectedExId] = useState<string | null>(null);
  const [isPermanent, setIsPermanent] = useState(false);

  const filtered = exercises
    .filter((ex) => {
      if (ex.id === currentExercise.id) return false;
      const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase().trim());
      const matchesGroup = selectedGroup === 'Todos' ? true : ex.muscleGroup === selectedGroup;
      return matchesSearch && matchesGroup;
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 600 }}>
      <div
        className="modal-sheet animate-slide-up"
        style={{ maxHeight: '92dvh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-handle" />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h2 className="modal-title" style={{ margin: 0, fontSize: '1.15rem' }}>Substituir Exercício</h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Substituindo <strong>{currentExercise.name}</strong> ({MUSCLE_GROUP_LABELS[currentExercise.muscleGroup] ?? currentExercise.muscleGroup})
            </div>
          </div>
          <button className="btn btn-icon" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            className="input"
            style={{ paddingLeft: 36, fontSize: '0.85rem' }}
            placeholder="Buscar exercício substituto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {/* Muscle group filter chips */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 8, scrollbarWidth: 'none' }}>
          <button
            type="button"
            className={`btn btn-sm ${selectedGroup === 'Todos' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '4px 10px', fontSize: '0.72rem', flexShrink: 0 }}
            onClick={() => setSelectedGroup('Todos')}
          >
            Todos
          </button>
          {MUSCLE_GROUPS.map((g) => (
            <button
              key={g}
              type="button"
              className={`btn btn-sm ${selectedGroup === g ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '4px 10px', fontSize: '0.72rem', flexShrink: 0 }}
              onClick={() => setSelectedGroup(g)}
            >
              {MUSCLE_GROUP_LABELS[g]}
            </button>
          ))}
        </div>

        {/* Exercises List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 2 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Nenhum exercício encontrado.
            </div>
          ) : (
            filtered.map((ex) => {
              const isSelected = selectedExId === ex.id;
              return (
                <div
                  key={ex.id}
                  onClick={() => setSelectedExId(ex.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: isSelected ? 'var(--accent-glow)' : 'var(--bg-input)',
                    border: isSelected ? '1.5px solid var(--accent)' : '1px solid transparent',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.86rem', color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}>
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
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {MUSCLE_GROUP_LABELS[ex.muscleGroup] ?? ex.muscleGroup}
                    </div>
                  </div>
                  {isSelected && (
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: 'var(--accent)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Check size={14} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Permanent Choice Option */}
        <label style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', background: 'var(--bg-input)',
          borderRadius: 'var(--radius-sm)', cursor: 'pointer',
          marginTop: 12, marginBottom: 8, fontSize: '0.8rem',
        }}>
          <input
            type="checkbox"
            checked={isPermanent}
            onChange={(e) => setIsPermanent(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }}
          />
          <div>
            <div style={{ fontWeight: 600 }}>Tornar substituição permanente na ficha</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Se desmarcado, a troca valerá apenas para a sessão de hoje.
            </div>
          </div>
        </label>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1.5 }}
            disabled={!selectedExId}
            onClick={() => {
              if (selectedExId) onConfirm(selectedExId, isPermanent);
            }}
          >
            Confirmar Troca
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ActiveWorkoutView ──────────────────────────────────────────────────────────

export function ActiveWorkoutView({ template, data, initialDraft, onFinish, onCancel, onMinimize, onUpdateTemplate }: Props) {
  const effectiveDraft = initialDraft ?? (loadDraft()?.template.id === template.id ? loadDraft() : null);
  const [currentTemplate, setCurrentTemplate] = useState<WorkoutTemplate>(effectiveDraft?.template ?? template);
  const [swapModalExIdx, setSwapModalExIdx] = useState<number | null>(null);

  const headerRef = useRef<HTMLDivElement>(null);
  const startedAt = useRef(effectiveDraft?.startedAt ?? new Date().toISOString());
  const startedAtMs = useRef(effectiveDraft?.startedAtMs ?? Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [showFloatingHeader, setShowFloatingHeader] = useState(false);

  const [loggedExercises, setLoggedExercises] = useState<LoggedExercise[]>(() =>
    effectiveDraft?.loggedExercises ?? template.exercises.map((we) => ({
      exerciseId: we.exerciseId,
      sets: Array.from({ length: we.sets }, () => ({
        weight: 0,
        reps: we.repsMin,
        completed: false,
      })),
      notes: '',
    }))
  );

  // Rest timer state using timestamps to survive screen lock/sleep
  const [restTotal, setRestTotal] = useState<number | null>(effectiveDraft?.restTotal ?? null);
  const [restRemaining, setRestRemaining] = useState<number | null>(() => {
    if (effectiveDraft?.restEndsAtMs) {
      return Math.max(0, Math.ceil((effectiveDraft.restEndsAtMs - Date.now()) / 1000));
    }
    return effectiveDraft?.restRemainingWhenPaused ?? null;
  });
  const [restPaused, setRestPaused] = useState(effectiveDraft?.restPaused ?? false);
  const restEndsAtRef = useRef<number | null>(effectiveDraft?.restEndsAtMs ?? null);

  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  const exerciseMap = new Map(data.exercises.map((e) => [e.id, e]));

  function handleSwapExercise(exIdx: number, newExerciseId: string, isPermanent: boolean) {
    const nextTemplate: WorkoutTemplate = {
      ...currentTemplate,
      exercises: currentTemplate.exercises.map((we, i) =>
        i === exIdx ? { ...we, exerciseId: newExerciseId } : we
      ),
    };
    setCurrentTemplate(nextTemplate);

    setLoggedExercises((prev) =>
      prev.map((le, i) => {
        if (i !== exIdx) return le;
        const updatedSets = le.sets.map((s) =>
          s.completed ? s : { ...s, weight: 0 }
        );
        return {
          ...le,
          exerciseId: newExerciseId,
          sets: updatedSets,
        };
      })
    );

    if (isPermanent) {
      onUpdateTemplate?.(nextTemplate);
    }

    setSwapModalExIdx(null);
  }

  // 1. Alert user before leaving/reloading page if workout is active
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Você possui um treino em andamento. Deseja realmente sair?';
      return 'Você possui um treino em andamento. Deseja realmente sair?';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // 2. Auto-save workout draft to localStorage on changes
  useEffect(() => {
    saveDraft({
      template: currentTemplate,
      startedAt: startedAt.current,
      startedAtMs: startedAtMs.current,
      loggedExercises,
      restEndsAtMs: restEndsAtRef.current,
      restTotal,
      restPaused,
      restRemainingWhenPaused: restRemaining,
      updatedAt: new Date().toISOString(),
    });
  }, [currentTemplate, loggedExercises, restTotal, restPaused, restRemaining]);

  // Floating Header — show when the main header scrolls out of view
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowFloatingHeader(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Elapsed timer calculated from wall-clock Date.now()
  useEffect(() => {
    const updateElapsed = () => {
      setElapsed(Math.floor((Date.now() - startedAtMs.current) / 1000));
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        updateElapsed();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Rest countdown tick based on Date.now() timestamp
  useEffect(() => {
    if (restRemaining === null || restPaused) return;

    const tick = () => {
      if (!restEndsAtRef.current) return;
      const rem = Math.max(0, Math.ceil((restEndsAtRef.current - Date.now()) / 1000));
      setRestRemaining(rem);
      if (rem <= 0) {
        playBeep();
        stopRest();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && restEndsAtRef.current && !restPaused) {
        tick();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restRemaining !== null, restPaused]);

  function playBeep() {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      [0, 0.25, 0.5].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = offset === 0.5 ? 1100 : 880;
        gain.gain.setValueAtTime(0.35, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.18);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.18);
      });
    } catch (_) {}
  }

  function startRest(seconds: number) {
    restEndsAtRef.current = Date.now() + seconds * 1000;
    setRestTotal(seconds);
    setRestRemaining(seconds);
    setRestPaused(false);
  }

  function toggleRestPause() {
    setRestPaused((prev) => {
      const next = !prev;
      if (!next && restRemaining !== null) {
        // Unpaused: reset restEndsAtRef timestamp
        restEndsAtRef.current = Date.now() + restRemaining * 1000;
      }
      return next;
    });
  }

  function stopRest() {
    restEndsAtRef.current = null;
    setRestRemaining(null);
    setRestTotal(null);
    setRestPaused(false);
  }

  function adjustRest(delta: number) {
    if (restRemaining === null) return;
    const newRem = Math.max(5, restRemaining + delta);
    setRestRemaining(newRem);
    if (!restPaused && restEndsAtRef.current !== null) {
      restEndsAtRef.current += delta * 1000;
    }
  }

  const updateSet = useCallback(
    (exIdx: number, setIdx: number, patch: Partial<LoggedSet>) => {
      setLoggedExercises((prev) =>
        prev.map((ex, i) => {
          if (i !== exIdx) return ex;
          return {
            ...ex,
            sets: ex.sets.map((s, j) => (j === setIdx ? { ...s, ...patch } : s)),
          };
        })
      );
    },
    []
  );

  function toggleSet(exIdx: number, setIdx: number) {
    const ex = loggedExercises[exIdx];
    const set = ex.sets[setIdx];
    const nowCompleted = !set.completed;
    const we = currentTemplate.exercises[exIdx];
    const isPR = nowCompleted
      ? isPersonalRecord(data, loggedExercises, ex.exerciseId, set.weight, set.reps, set.weightUnit ?? 'kg')
      : false;
    updateSet(exIdx, setIdx, { completed: nowCompleted, isPersonalRecord: isPR });
    if (nowCompleted) {
      startRest(we.restSeconds);
      setCurrentExIdx(exIdx);
    }
  }

  // Copy each series' respective previous set value
  function copyLastSets(exIdx: number) {
    const ex = loggedExercises[exIdx];
    const lastSets = getLatestExerciseSetsAcrossSessions(data, ex.exerciseId);
    const best = getBestSet(lastSets);
    if (!lastSets.length && !best) return;

    setLoggedExercises((prev) =>
      prev.map((e, i) => {
        if (i !== exIdx) return e;
        return {
          ...e,
          sets: e.sets.map((s, setIdx) => {
            if (s.completed) return s;
            // Use the matching previous set by index; fallback to best set
            const prevSet = lastSets[setIdx];
            const ref = prevSet?.completed ? prevSet : best;
            if (!ref) return s;
            return {
              ...s,
              weight: ref.weight,
              reps: ref.reps,
              weightUnit: ref.weightUnit ?? 'kg',
            };
          }),
        };
      })
    );
  }

  function adjustWeight(exIdx: number, setIdx: number, delta: number) {
    const set = loggedExercises[exIdx].sets[setIdx];
    const isPlates = set.weightUnit === 'plates';
    const newWeight = isPlates
      ? Math.max(0, Math.round(set.weight + delta))
      : Math.max(0, parseFloat((set.weight + delta).toFixed(1)));
    updateSet(exIdx, setIdx, { weight: newWeight });
  }

  function adjustReps(exIdx: number, setIdx: number, delta: number) {
    const current = loggedExercises[exIdx].sets[setIdx].reps;
    updateSet(exIdx, setIdx, { reps: Math.max(1, current + delta) });
  }

  function addSet(exIdx: number) {
    const we = currentTemplate.exercises[exIdx];
    setLoggedExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exIdx) return ex;
        const lastSet = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [
            ...ex.sets,
            {
              weight: lastSet?.weight ?? 0,
              weightUnit: lastSet?.weightUnit ?? 'kg',
              reps: lastSet?.reps ?? we?.repsMin ?? 10,
              completed: false,
            },
          ],
        };
      })
    );
  }

  function removeLastSet(exIdx: number) {
    setLoggedExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exIdx || ex.sets.length <= 1) return ex;
        return { ...ex, sets: ex.sets.slice(0, -1) };
      })
    );
  }

  function updateNote(exIdx: number, note: string) {
    setLoggedExercises((prev) =>
      prev.map((ex, i) => (i === exIdx ? { ...ex, notes: note } : ex))
    );
  }

  function handleCancel() {
    clearDraft();
    onCancel();
  }

  function handleFinish() {
    clearDraft();
    const now = new Date().toISOString();
    const session: WorkoutSession = {
      id: generateId(),
      templateId: currentTemplate.id,
      startedAt: startedAt.current,
      finishedAt: now,
      durationSeconds: elapsed,
      exercises: loggedExercises,
    };

    // Synchronize sets in template automatically
    const updatedTemplate: WorkoutTemplate = {
      ...currentTemplate,
      exercises: currentTemplate.exercises.map((we, i) => {
        const loggedEx = loggedExercises[i];
        if (!loggedEx) return we;
        return {
          ...we,
          sets: loggedEx.sets.length,
        };
      }),
      updatedAt: now,
    };
    onUpdateTemplate?.(updatedTemplate);

    onFinish(session, updatedTemplate);
  }

  const completedSets = loggedExercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
    0
  );
  const totalSets = loggedExercises.reduce((acc, ex) => acc + ex.sets.length, 0);

  // Timer progress 0..1
  const restProgress = restTotal && restRemaining !== null ? 1 - restRemaining / restTotal : 0;
  const TIMER_R = 22;
  const TIMER_CIRC = 2 * Math.PI * TIMER_R;

  return (
    <div className="page" style={{ paddingBottom: restRemaining !== null ? 160 : 80 }}>

      {/* Floating Suspended Header on Scroll */}
      {showFloatingHeader && (
        <div style={{
          position: 'fixed',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          width: 'calc(100% - 32px)',
          maxWidth: 480,
          background: 'var(--bg-card)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-full)',
          padding: '8px 14px 8px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: 'var(--shadow-float)',
          animation: 'slideDown 0.2s ease-out',
        }}>
          <button className="btn btn-icon" onClick={onMinimize ?? handleCancel} style={{ width: 40, height: 40, flexShrink: 0 }} aria-label="Minimizar treino">
            <ChevronLeft size={22} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentTemplate.name}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {formatTime(elapsed)} &nbsp;·&nbsp; {completedSets}/{totalSets} séries
            </div>
          </div>
          <button className="btn btn-primary btn-sm" style={{ padding: '5px 12px', fontSize: '0.75rem', borderRadius: 99 }} onClick={() => setShowFinishConfirm(true)}>
            Encerrar
          </button>
        </div>
      )}

      {/* Main Header — observed by IntersectionObserver */}
      <header ref={headerRef} style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--bg-base)',
        borderBottom: '1px solid var(--border)',
        padding: '0 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 56 }}>
          <button className="btn btn-icon" onClick={onMinimize ?? handleCancel} aria-label="Minimizar treino">
            <ChevronLeft size={22} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentTemplate.name}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
              {formatTime(elapsed)} &nbsp;·&nbsp; {completedSets}/{totalSets} séries
            </div>
          </div>
          <button className="btn btn-primary btn-sm" id="btn-finish-workout" onClick={() => setShowFinishConfirm(true)}>
            Encerrar
          </button>
        </div>
        {/* Progress bar */}
        <div style={{ height: 3, background: 'var(--border)', borderRadius: 99, margin: '0 0 10px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${totalSets > 0 ? (completedSets / totalSets) * 100 : 0}%`,
            background: 'var(--accent)',
            borderRadius: 99,
            transition: 'width 0.3s ease',
          }} />
        </div>
      </header>

      {/* Exercise Cards */}
      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {currentTemplate.exercises.map((we, exIdx) => {
          const ex = exerciseMap.get(we.exerciseId);
          if (!ex) return null;
          const loggedEx = loggedExercises[exIdx];
          const lastSets = getLatestExerciseSetsAcrossSessions(data, we.exerciseId);
          const bestLastSet = getBestSet(lastSets);
          const hasNotes = expandedNotes.has(we.exerciseId);
          const allSetsCompleted = loggedEx.sets.every((s) => s.completed);

          return (
            <div
              key={we.exerciseId}
              className="card animate-scale-in"
              id={`exercise-card-${we.exerciseId}`}
              style={{
                border: allSetsCompleted
                  ? '1px solid var(--success)'
                  : currentExIdx === exIdx
                  ? '1px solid var(--accent)'
                  : '1px solid var(--border)',
                opacity: allSetsCompleted ? 0.72 : 1,
              }}
            >
              {/* Exercise Header */}
              <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '1rem', fontWeight: 700 }}>{ex.name}</span>
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
                  <div style={{ fontSize: '0.74rem', color: 'var(--accent)', fontWeight: 600, marginTop: 2 }}>
                    {we.repsMin === we.repsMax ? `${we.repsMin} reps` : `${we.repsMin}–${we.repsMax} reps`}
                  </div>
                </div>
                {/* Best last set badge */}
                {bestLastSet ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: 'var(--bg-input)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-full)', padding: '4px 10px', flexShrink: 0,
                  }}>
                    <Clock size={11} color="var(--text-muted)" />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {bestLastSet.weight}{bestLastSet.weightUnit === 'plates' ? 'pl' : 'kg'} × {bestLastSet.reps}
                    </span>
                  </div>
                ) : (
                  <div style={{
                    fontSize: '0.68rem', color: 'var(--text-muted)',
                    padding: '4px 8px', background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-full)', flexShrink: 0,
                  }}>
                    1ª vez
                  </div>
                )}
              </div>

              {/* Action row: Copy + Trocar + Notes */}
              <div style={{ display: 'flex', gap: 8, padding: '10px 16px 12px', flexWrap: 'wrap' }}>
                {bestLastSet && (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ flex: 1, minWidth: 130, fontSize: '0.75rem' }}
                    onClick={() => copyLastSets(exIdx)}
                  >
                    Copiar cargas anteriores
                  </button>
                )}
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ gap: 4, fontSize: '0.75rem' }}
                  onClick={() => setSwapModalExIdx(exIdx)}
                  title="Substituir exercício"
                >
                  <ArrowLeftRight size={13} />
                  Trocar
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ gap: 4, fontSize: '0.75rem' }}
                  onClick={() => {
                    setExpandedNotes((prev) => {
                      const next = new Set(prev);
                      next.has(we.exerciseId) ? next.delete(we.exerciseId) : next.add(we.exerciseId);
                      return next;
                    });
                  }}
                >
                  {hasNotes ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  Notas
                </button>
              </div>

              {/* Notes */}
              {hasNotes && (
                <div style={{ padding: '0 16px 12px' }}>
                  <input
                    className="input"
                    placeholder="Ex: Banco no furo 3, pegada pronada..."
                    value={loggedEx.notes ?? ''}
                    onChange={(e) => updateNote(exIdx, e.target.value)}
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>
              )}

              <div style={{ borderTop: '1px solid var(--border)' }} />

              {/* Table section container */}
              <div style={{ padding: '0 12px 14px' }}>
                {/* Table header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '32px 1fr 68px 10px 46px 36px',
                  gap: 4,
                  padding: '8px 8px 4px',
                  alignItems: 'center',
                }}>
                  {[
                    { label: 'Série', align: 'center' as const },
                    { label: 'Anterior', align: 'center' as const },
                    { label: 'Carga', align: 'center' as const },
                    { label: '', align: 'center' as const },
                    { label: 'Reps', align: 'center' as const },
                    { label: '', align: 'center' as const },
                  ].map((col, i) => (
                    <span key={i} style={{
                      fontSize: '0.62rem',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      fontWeight: 600,
                      textAlign: col.align,
                    }}>
                      {col.label}
                    </span>
                  ))}
                </div>

                {/* Sets */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {loggedEx.sets.map((set, setIdx) => {
                    const prevSet = lastSets[setIdx];
                    const prevUnit = prevSet?.weightUnit === 'plates' ? 'pl' : 'kg';
                    const bestUnit = bestLastSet?.weightUnit === 'plates' ? 'pl' : 'kg';
                    const previousText = prevSet?.completed
                      ? `${prevSet.weight}${prevUnit}×${prevSet.reps}`
                      : bestLastSet
                      ? `${bestLastSet.weight}${bestUnit}×${bestLastSet.reps}`
                      : '—';

                    return (
                      <SetRow
                        key={setIdx}
                        setNumber={setIdx + 1}
                        set={set}
                        previousText={previousText}
                        onWeightChange={(v) => updateSet(exIdx, setIdx, { weight: v })}
                        onUnitToggle={() =>
                          updateSet(exIdx, setIdx, {
                            weightUnit: (set.weightUnit ?? 'kg') === 'kg' ? 'plates' : 'kg',
                          })
                        }
                        onRepsChange={(v) => updateSet(exIdx, setIdx, { reps: v })}
                        onAdjustWeight={(d) => adjustWeight(exIdx, setIdx, d)}
                        onAdjustReps={(d) => adjustReps(exIdx, setIdx, d)}
                        onToggle={() => toggleSet(exIdx, setIdx)}
                      />
                    );
                  })}
                </div>

                {/* Add / Remove set */}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1, fontSize: '0.75rem' }} onClick={() => addSet(exIdx)}>
                    + Série
                  </button>
                  {loggedEx.sets.length > 1 && (
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', color: 'var(--danger)' }} onClick={() => removeLastSet(exIdx)}>
                      − Série
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Bottom finish button */}
        <button
          className="btn btn-primary btn-full"
          style={{ marginTop: 8, marginBottom: 16 }}
          onClick={() => setShowFinishConfirm(true)}
        >
          <Flag size={18} />
          Encerrar Treino
        </button>
      </div>

      {/* Floating Rest Timer - two row layout */}
      {restRemaining !== null && (
        <div style={{
          position: 'fixed',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 150,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-float)',
          padding: '12px 16px',
          width: 'calc(100vw - 32px)',
          maxWidth: 400,
          animation: 'slideUp 0.2s ease',
        }}>
          {/* Row 1: circle + label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            {/* Circular progress */}
            <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
              <svg width={48} height={48} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={24} cy={24} r={TIMER_R} fill="none" stroke="var(--border)" strokeWidth={3} />
                <circle
                  cx={24} cy={24} r={TIMER_R}
                  fill="none"
                  stroke={restRemaining <= 10 ? 'var(--danger)' : 'var(--accent)'}
                  strokeWidth={3}
                  strokeDasharray={TIMER_CIRC}
                  strokeDashoffset={TIMER_CIRC * (1 - restProgress)}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.9s linear' }}
                />
              </svg>
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.72rem', fontWeight: 800,
                color: restRemaining <= 10 ? 'var(--danger)' : 'var(--text-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {formatTime(restRemaining)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Descanso
              </div>
              <div style={{ fontSize: '0.7rem', color: restPaused ? 'var(--warning)' : 'var(--text-muted)', marginTop: 1 }}>
                {restPaused ? 'Pausado' : 'Em andamento...'}
              </div>
            </div>
          </div>

          {/* Row 2: buttons spread evenly */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn btn-ghost btn-sm"
              style={{ flex: 1, fontSize: '0.75rem', padding: '6px 4px', gap: 3 }}
              onClick={() => adjustRest(-30)}
            >
              <Minus size={11} />30s
            </button>
            <button
              className="btn btn-ghost btn-sm"
              style={{ flex: 1, fontSize: '0.75rem', padding: '6px 4px', gap: 3 }}
              onClick={() => adjustRest(30)}
            >
              <Plus size={11} />30s
            </button>
            <button
              className="btn btn-ghost btn-sm"
              style={{ flex: 1.4, fontSize: '0.75rem', padding: '6px 4px', gap: 4 }}
              onClick={toggleRestPause}
              aria-label={restPaused ? 'Retomar' : 'Pausar'}
            >
              {restPaused ? <Play size={13} /> : <Pause size={13} />}
              {restPaused ? 'Retomar' : 'Pausar'}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              style={{ flex: 1, fontSize: '0.75rem', padding: '6px 4px', color: 'var(--danger)' }}
              onClick={stopRest}
              aria-label="Parar descanso"
            >
              Parar
            </button>
          </div>
        </div>
      )}

      {/* Finish Confirm Modal */}
      {showFinishConfirm && (
        <div className="modal-overlay" onClick={() => setShowFinishConfirm(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2 className="modal-title">Encerrar Treino?</h2>
            <div style={{
              background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
              padding: '14px 16px', marginBottom: 20,
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Duração</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{formatTime(elapsed)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Séries concluídas</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{completedSets}/{totalSets}</span>
              </div>
              {completedSets < totalSets && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, marginTop: 2,
                  padding: '8px 10px', background: 'rgba(251,191,36,0.08)',
                  borderRadius: 'var(--radius-sm)', border: '1px solid rgba(251,191,36,0.2)',
                }}>
                  <AlertCircle size={14} color="var(--warning)" />
                  <span style={{ fontSize: '0.75rem', color: 'var(--warning)' }}>
                    {totalSets - completedSets} série(s) pendente(s) serão descartadas.
                  </span>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowFinishConfirm(false)}>
                Voltar
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} id="btn-confirm-finish" onClick={handleFinish}>
                <Check size={16} />
                Salvar
              </button>
            </div>
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--danger)', fontSize: '0.78rem' }}
                onClick={() => {
                  setShowFinishConfirm(false);
                  handleCancel();
                }}
              >
                Descartar / Cancelar Treino
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Swap Exercise Modal */}
      {swapModalExIdx !== null && currentTemplate.exercises[swapModalExIdx] && (
        <SwapExerciseModal
          currentExercise={
            exerciseMap.get(currentTemplate.exercises[swapModalExIdx].exerciseId) ?? {
              id: currentTemplate.exercises[swapModalExIdx].exerciseId,
              name: 'Exercício',
              muscleGroup: 'Peito',
            }
          }
          exercises={data.exercises}
          onConfirm={(newExerciseId, isPermanent) =>
            handleSwapExercise(swapModalExIdx, newExerciseId, isPermanent)
          }
          onClose={() => setSwapModalExIdx(null)}
        />
      )}
    </div>
  );
}

// SetRow

interface SetRowProps {
  setNumber: number;
  set: LoggedSet;
  previousText: string;
  onWeightChange: (v: number) => void;
  onUnitToggle: () => void;
  onRepsChange: (v: number) => void;
  onAdjustWeight: (delta: number) => void;
  onAdjustReps: (delta: number) => void;
  onToggle: () => void;
}

function SetRow({
  setNumber, set, previousText,
  onWeightChange, onUnitToggle, onRepsChange,
  onAdjustWeight, onAdjustReps, onToggle,
}: SetRowProps) {
  const [activeAdj, setActiveAdj] = useState<'weight' | 'reps' | null>(null);
  const isPlates = set.weightUnit === 'plates';

  const inputStyle = {
    width: '100%',
    background: 'transparent',
    border: 'none',
    textAlign: 'center' as const,
    fontWeight: 700,
    fontSize: '0.98rem',
    color: set.completed ? 'var(--success)' : 'var(--text-primary)',
    padding: 0,
    outline: 'none',
    fontFamily: 'inherit',
    fontVariantNumeric: 'tabular-nums' as const,
  };

  return (
    <div style={{
      background: set.completed ? 'var(--success-dim)' : 'var(--bg-input)',
      borderRadius: 'var(--radius-sm)',
      border: set.completed
        ? '1px solid rgba(52,211,153,0.3)'
        : '1px solid transparent',
      overflow: 'hidden',
      transition: 'background 0.2s, border 0.2s',
    }}>
      {/* Main row: Série | Anterior | Peso+Unit | × | Reps | ✓ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '32px 1fr 68px 10px 46px 36px',
        gap: 4,
        padding: '6px 8px',
        alignItems: 'center',
      }}>
        {/* Série # */}
        <span style={{
          fontSize: '0.82rem', fontWeight: 700,
          color: set.completed ? 'var(--success)' : 'var(--text-muted)',
          textAlign: 'center',
        }}>
          {setNumber}
        </span>

        {/* Anterior */}
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          {previousText}
          {set.isPersonalRecord && <span style={{ color: 'var(--warning)', marginLeft: 4 }}>🏆</span>}
        </span>

        {/* Peso + Unit Toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 2,
          background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)',
          padding: '2px 4px', border: '1px solid var(--border)',
        }}>
          <input
            type="number"
            inputMode={isPlates ? 'numeric' : 'decimal'}
            value={set.weight === 0 ? '' : set.weight}
            placeholder="0"
            onChange={(e) => onWeightChange(parseFloat(e.target.value) || 0)}
            onFocus={() => setActiveAdj('weight')}
            onBlur={() => setTimeout(() => setActiveAdj((a) => a === 'weight' ? null : a), 200)}
            disabled={set.completed}
            style={inputStyle}
          />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onUnitToggle(); }}
            disabled={set.completed}
            style={{
              background: isPlates ? 'var(--accent)' : 'transparent',
              color: isPlates ? '#fff' : 'var(--text-muted)',
              border: isPlates ? 'none' : '1px solid var(--border)',
              borderRadius: 3,
              fontSize: '0.6rem',
              fontWeight: 800,
              padding: '1px 3px',
              cursor: set.completed ? 'default' : 'pointer',
              lineHeight: 1.1,
              flexShrink: 0,
              textTransform: 'uppercase',
            }}
            title="Alternar entre kg e placas"
          >
            {isPlates ? 'pl' : 'kg'}
          </button>
        </div>

        {/* × */}
        <span style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>×</span>

        {/* Reps */}
        <input
          type="number"
          inputMode="numeric"
          value={set.reps === 0 ? '' : set.reps}
          placeholder="0"
          onChange={(e) => onRepsChange(parseInt(e.target.value) || 1)}
          onFocus={() => setActiveAdj('reps')}
          onBlur={() => setTimeout(() => setActiveAdj((a) => a === 'reps' ? null : a), 200)}
          disabled={set.completed}
          style={inputStyle}
        />

        {/* Check */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={onToggle}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              border: set.completed ? 'none' : '2px solid var(--border-strong)',
              background: set.completed ? 'var(--success)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.18s', flexShrink: 0,
            }}
            aria-label={set.completed ? 'Desmarcar série' : 'Concluir série'}
          >
            {set.completed && <Check size={16} color="white" strokeWidth={2.5} />}
          </button>
        </div>
      </div>

      {/* Quick adjust row (shows on input focus) */}
      {activeAdj && !set.completed && (
        <div style={{
          display: 'flex', gap: 4,
          padding: '2px 8px 8px',
          justifyContent: 'center',
        }}>
          {activeAdj === 'weight' ? (
            <>
              {(isPlates
                ? [-3, -2, -1, 1, 2, 3]
                : [-5, -2.5, -1, 1, 2.5, 5]
              ).map((d) => (
                <button
                  key={d}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '0.7rem', padding: '4px 8px', minWidth: 38 }}
                  onMouseDown={(e) => { e.preventDefault(); onAdjustWeight(d); }}
                >
                  {d > 0 ? `+${d}` : d}
                </button>
              ))}
            </>
          ) : (
            <>
              {([-2, -1, 1, 2] as number[]).map((d) => (
                <button
                  key={d}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '0.7rem', padding: '4px 12px', minWidth: 44 }}
                  onMouseDown={(e) => { e.preventDefault(); onAdjustReps(d); }}
                >
                  {d > 0 ? `+${d}` : d}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
