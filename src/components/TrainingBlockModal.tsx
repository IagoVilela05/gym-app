import { useState } from 'react';
import { X, Flame, Zap, RefreshCw, Sliders } from 'lucide-react';
import { BlockPhase, TrainingBlock } from '../types';
import { generateId } from '../services/storage';

interface Props {
  onSave: (block: TrainingBlock) => void;
  onClose: () => void;
}

interface PhaseOption {
  id: BlockPhase;
  label: string;
  description: string;
  durationWeeks: number;
  icon: React.ReactNode;
  color: string;
}

const PHASE_OPTIONS: PhaseOption[] = [
  {
    id: 'hypertrophy',
    label: 'Hipertrofia',
    description: 'Volume alto, cargas moderadas. Foco em crescimento muscular.',
    durationWeeks: 8,
    icon: <Flame size={18} />,
    color: '#f97316',
  },
  {
    id: 'strength',
    label: 'Força',
    description: 'Volume baixo, cargas máximas. Foco em ganhos neurais.',
    durationWeeks: 6,
    icon: <Zap size={18} />,
    color: '#4f8ef7',
  },
  {
    id: 'deload',
    label: 'Deload',
    description: 'Volume e intensidade reduzidos. Recuperação ativa.',
    durationWeeks: 1,
    icon: <RefreshCw size={18} />,
    color: '#34d399',
  },
  {
    id: 'custom',
    label: 'Personalizado',
    description: 'Defina o nome e a duração livremente.',
    durationWeeks: 4,
    icon: <Sliders size={18} />,
    color: '#a78bfa',
  },
];

export function TrainingBlockModal({ onSave, onClose }: Props) {
  const [selectedPhase, setSelectedPhase] = useState<BlockPhase>('hypertrophy');
  const [customName, setCustomName] = useState('');
  const [durationWeeks, setDurationWeeks] = useState(8);
  const [notes, setNotes] = useState('');
  const [deloadLastWeek, setDeloadLastWeek] = useState(true);

  const phase = PHASE_OPTIONS.find(p => p.id === selectedPhase)!;

  function handlePhaseChange(id: BlockPhase) {
    const opt = PHASE_OPTIONS.find(p => p.id === id)!;
    setSelectedPhase(id);
    setDurationWeeks(opt.durationWeeks);
    // Deload phase itself doesn't need a deload week
    if (id === 'deload') setDeloadLastWeek(false);
    else setDeloadLastWeek(true);
  }

  function handleSave() {
    const blockName = selectedPhase === 'custom'
      ? (customName.trim() || 'Bloco Personalizado')
      : phase.label;

    const block: TrainingBlock = {
      id: generateId(),
      phase: selectedPhase,
      name: blockName,
      startedAt: new Date().toISOString(),
      durationWeeks,
      notes: notes.trim() || undefined,
      deloadLastWeek: selectedPhase !== 'deload' && deloadLastWeek,
    };
    onSave(block);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div className="modal-title" style={{ margin: 0 }}>Novo Bloco de Treino</div>
          <button className="btn btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Phase selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          <div className="input-label">Fase</div>
          {PHASE_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => handlePhaseChange(opt.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px',
                background: selectedPhase === opt.id ? `${opt.color}18` : 'var(--bg-input)',
                border: `1.5px solid ${selectedPhase === opt.id ? opt.color : 'transparent'}`,
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer', textAlign: 'left', width: '100%',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ color: opt.color, flexShrink: 0 }}>{opt.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{opt.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 1 }}>{opt.description}</div>
              </div>
              {selectedPhase === opt.id && (
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: opt.color, flexShrink: 0,
                }} />
              )}
            </button>
          ))}
        </div>

        {/* Custom name */}
        {selectedPhase === 'custom' && (
          <div className="input-group" style={{ marginBottom: 16 }}>
            <label className="input-label">Nome do Bloco</label>
            <input
              className="input"
              placeholder="Ex: Pré-competição"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              maxLength={40}
            />
          </div>
        )}

        {/* Duration */}
        <div className="input-group" style={{ marginBottom: 16 }}>
          <label className="input-label">
            Duração
            <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>
              (sugerido: {phase.durationWeeks} sem)
            </span>
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="range"
              min={1} max={16} value={durationWeeks}
              onChange={e => setDurationWeeks(Number(e.target.value))}
              style={{ flex: 1, accentColor: phase.color }}
            />
            <div style={{
              minWidth: 52, textAlign: 'center',
              background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)',
              padding: '6px 10px', fontWeight: 700, fontSize: '0.9rem',
            }}>
              {durationWeeks}s
            </div>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Término previsto: {new Date(Date.now() + durationWeeks * 7 * 24 * 60 * 60 * 1000)
              .toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
          </div>
        </div>

        {/* Deload last week toggle */}
        {selectedPhase !== 'deload' && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12, padding: '12px 14px',
            background: 'var(--bg-input)', borderRadius: 'var(--radius-md)',
            marginBottom: 16,
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Semana de deload no final</div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 2 }}>
                O app avisa quando chegar a última semana do bloco
              </div>
            </div>
            <label className="toggle" style={{ flexShrink: 0 }}>
              <input
                type="checkbox"
                checked={deloadLastWeek}
                onChange={e => setDeloadLastWeek(e.target.checked)}
              />
              <span className="toggle-track" />
            </label>
          </div>
        )}

        {/* Notes */}
        <div className="input-group" style={{ marginBottom: 24 }}>
          <label className="input-label">Notas (opcional)</label>
          <textarea
            className="input"
            placeholder="Objetivos, foco, observações..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            style={{ resize: 'none', fontFamily: 'inherit' }}
          />
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave}>
            Iniciar Bloco
          </button>
        </div>
      </div>
    </div>
  );
}
