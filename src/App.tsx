import { useEffect, useState } from 'react';
import { Dumbbell, Play, Trash2 } from 'lucide-react';
import { useAppData } from './hooks/useAppData';
import { BottomNav } from './components/BottomNav';
import { ActiveWorkoutMiniBar } from './components/ActiveWorkoutMiniBar';
import { WorkoutsView } from './views/WorkoutsView';
import { HistoryView } from './views/HistoryView';
import { ProgressView } from './views/ProgressView';
import { SettingsView } from './views/SettingsView';
import { ActiveWorkoutView } from './views/ActiveWorkoutView';
import { WorkoutTemplate, WorkoutSession, WorkoutDraft } from './types';
import { saveData, loadDraft, clearDraft } from './services/storage';

export type View = 'workouts' | 'history' | 'progress' | 'settings';

export default function App() {
  const { data, update } = useAppData();
  const [view, setView] = useState<View>('workouts');
  const [activeWorkout, setActiveWorkout] = useState<WorkoutTemplate | null>(null);
  const [activeDraft, setActiveDraft] = useState<WorkoutDraft | null>(null);
  const [isWorkoutMinimized, setIsWorkoutMinimized] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<WorkoutDraft | null>(() => loadDraft());

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', data.settings.theme);
  }, [data.settings.theme]);

  function handleStartWorkout(template: WorkoutTemplate) {
    setActiveDraft(null);
    setActiveWorkout(template);
    setIsWorkoutMinimized(false);
  }

  function handleReset(mode: 'history' | 'full') {
    if (mode === 'history') {
      const next = { ...data, sessions: [] };
      saveData(next);
      update(next);
    } else {
      localStorage.clear();
      window.location.reload();
    }
  }

  function handleFinishWorkout(session: WorkoutSession, updatedTemplate?: WorkoutTemplate) {
    update((prev) => {
      const templates = updatedTemplate
        ? prev.workoutTemplates.map((t) => (t.id === updatedTemplate.id ? updatedTemplate : t))
        : prev.workoutTemplates;
      return {
        ...prev,
        workoutTemplates: templates,
        sessions: [...prev.sessions, session],
      };
    });
    setActiveWorkout(null);
    setActiveDraft(null);
    setIsWorkoutMinimized(false);
    clearDraft();
    setView('history');
  }

  function handleCancelWorkout() {
    setActiveWorkout(null);
    setActiveDraft(null);
    setIsWorkoutMinimized(false);
    clearDraft();
  }

  function handleUpdateWorkoutTemplate(updated: WorkoutTemplate) {
    update((prev) => ({
      ...prev,
      workoutTemplates: prev.workoutTemplates.map((t) => (t.id === updated.id ? updated : t)),
    }));
    setActiveWorkout(updated);
  }

  return (
    <>
      {/* If workout is active, keep ActiveWorkoutView mounted so its state is never destroyed when minimized */}
      {activeWorkout && (
        <div style={{ display: isWorkoutMinimized ? 'none' : 'block' }}>
          <ActiveWorkoutView
            template={activeWorkout}
            data={data}
            initialDraft={activeDraft}
            onFinish={handleFinishWorkout}
            onCancel={handleCancelWorkout}
            onMinimize={() => setIsWorkoutMinimized(true)}
            onUpdateTemplate={handleUpdateWorkoutTemplate}
          />
        </div>
      )}

      {/* Main App navigation and views (visible when no workout or when workout is minimized) */}
      {(!activeWorkout || isWorkoutMinimized) && (
        <>
          {view === 'workouts' && (
            <WorkoutsView
              data={data}
              onUpdate={update}
              onStartWorkout={handleStartWorkout}
            />
          )}
          {view === 'history' && (
            <HistoryView data={data} />
          )}
          {view === 'progress' && (
            <ProgressView data={data} />
          )}
          {view === 'settings' && (
            <SettingsView data={data} onUpdate={update} onReset={handleReset} />
          )}

          {/* Persistent Minimized Workout Bar */}
          {activeWorkout && isWorkoutMinimized && (
            <ActiveWorkoutMiniBar
              onExpand={() => setIsWorkoutMinimized(false)}
              onCancel={handleCancelWorkout}
            />
          )}

          <BottomNav current={view} onChange={setView} />
        </>
      )}

      {/* Unfinished Workout Resume Modal */}
      {pendingDraft && !activeWorkout && (
        <div className="modal-overlay" style={{ zIndex: 500 }}>
          <div className="modal-sheet animate-scale-in" style={{ maxWidth: 440 }}>
            <div className="modal-handle" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'var(--accent-glow)', border: '1px solid var(--accent)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Dumbbell size={22} color="var(--accent)" />
              </div>
              <div>
                <h2 className="modal-title" style={{ margin: 0, fontSize: '1.05rem' }}>Treino em Andamento</h2>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Você possui uma sessão não finalizada</div>
              </div>
            </div>

            <div style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              padding: '14px 16px',
              marginBottom: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {pendingDraft.template.name}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span>Iniciado às</span>
                <span style={{ fontWeight: 600 }}>
                  {new Date(pendingDraft.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span>Séries registradas</span>
                <span style={{ fontWeight: 700, color: 'var(--success)' }}>
                  {pendingDraft.loggedExercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.completed).length, 0)} séries
                </span>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-ghost"
                style={{ flex: 1, color: 'var(--danger)', gap: 6 }}
                onClick={() => {
                  clearDraft();
                  setPendingDraft(null);
                }}
              >
                <Trash2 size={16} />
                Descartar
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1.5, gap: 6 }}
                onClick={() => {
                  setActiveDraft(pendingDraft);
                  setActiveWorkout(pendingDraft.template);
                  setIsWorkoutMinimized(false);
                  setPendingDraft(null);
                }}
              >
                <Play size={16} fill="currentColor" />
                Continuar Treino
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
