import { useEffect, useState } from 'react';
import { Dumbbell, Maximize2 } from 'lucide-react';
import { loadDraft } from '../services/storage';
import { WorkoutDraft } from '../types';

interface Props {
  onExpand: () => void;
  onCancel: () => void;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function ActiveWorkoutMiniBar({ onExpand }: Props) {
  const [draft, setDraft] = useState<WorkoutDraft | null>(() => loadDraft());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const update = () => {
      const currentDraft = loadDraft();
      setDraft(currentDraft);
      if (currentDraft) {
        setElapsed(Math.floor((Date.now() - currentDraft.startedAtMs) / 1000));
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!draft) return null;

  const completedSets = draft.loggedExercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
    0
  );
  const totalSets = draft.loggedExercises.reduce((acc, ex) => acc + ex.sets.length, 0);

  return (
    <div
      className="animate-slide-up"
      style={{
        position: 'fixed',
        bottom: 'calc(var(--nav-height) + 12px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 90,
        width: 'calc(100% - 24px)',
        maxWidth: 480,
        background: 'var(--bg-card)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1.5px solid var(--accent)',
        borderRadius: 'var(--radius-lg)',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: 'var(--shadow-float)',
        cursor: 'pointer',
      }}
      onClick={onExpand}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'var(--accent-glow)',
          border: '1px solid var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Dumbbell size={18} color="var(--accent)" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '0.88rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            color: 'var(--text-primary)',
          }}
        >
          {draft.template.name}
        </div>
        <div
          style={{
            fontSize: '0.72rem',
            color: 'var(--accent)',
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            marginTop: 1,
          }}
        >
          {formatTime(elapsed)} &nbsp;·&nbsp; {completedSets}/{totalSets} séries
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          className="btn btn-ghost btn-sm"
          style={{
            padding: '6px 12px',
            fontSize: '0.75rem',
            gap: 4,
            color: 'var(--accent)',
            fontWeight: 700,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onExpand();
          }}
        >
          <Maximize2 size={14} />
          Expandir
        </button>
      </div>
    </div>
  );
}
