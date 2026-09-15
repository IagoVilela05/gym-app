import { useState } from 'react';
import { Settings, Moon, Sun, Clock, Trash2, AlertCircle, Dumbbell, Plus, X, Pencil } from 'lucide-react';
import { AppData, AppSettings, Theme, MuscleGroup, Exercise } from '../types';
import { saveExercises, generateId } from '../services/storage';

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

interface Props {
  data: AppData;
  onUpdate: (data: AppData) => void;
  onReset: (mode: 'history' | 'full') => void;
}

const THEMES: { id: Theme; label: string; desc: string; bg: string; cardBg: string; accent: string }[] = [
  {
    id: 'obsidian',
    label: 'Stealth Obsidian',
    desc: 'Escuro · Preto & azul aço',
    bg: '#0d0d0f',
    cardBg: '#1e1e24',
    accent: '#4f8ef7',
  },
  {
    id: 'crimson',
    label: 'Titanium Crimson',
    desc: 'Escuro · Grafite & coral',
    bg: '#0f0e10',
    cardBg: '#201d20',
    accent: '#e11d48',
  },
  {
    id: 'light',
    label: 'Nordic Light',
    desc: 'Claro · Nevoeiro & azul real',
    bg: '#f8fafc',
    cardBg: '#ffffff',
    accent: '#2563eb',
  },
];

const REST_OPTIONS = [
  { value: 30,  label: '30 segundos' },
  { value: 45,  label: '45 segundos' },
  { value: 60,  label: '1 minuto' },
  { value: 90,  label: '1 min 30s (padrão)' },
  { value: 120, label: '2 minutos' },
  { value: 150, label: '2 min 30s' },
  { value: 180, label: '3 minutos' },
  { value: 240, label: '4 minutos' },
  { value: 300, label: '5 minutos' },
];

export function SettingsView({ data, onUpdate, onReset }: Props) {
  const [confirmReset, setConfirmReset] = useState<'history' | 'full' | null>(null);

  // Custom Exercises Management
  const [showAddExModal, setShowAddExModal] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExGroup, setNewExGroup] = useState<MuscleGroup>('Peito');
  const [newExAssisted, setNewExAssisted] = useState(false);

  // Exercise Editing Management
  const [editingEx, setEditingEx] = useState<Exercise | null>(null);
  const [editExName, setEditExName] = useState('');
  const [editExGroup, setEditExGroup] = useState<MuscleGroup>('Peito');
  const [editExAssisted, setEditExAssisted] = useState(false);

  function handleOpenEditExercise(ex: Exercise) {
    setEditingEx(ex);
    setEditExName(ex.name);
    setEditExGroup(ex.muscleGroup);
    setEditExAssisted(ex.isAssisted ?? false);
  }

  function handleSaveEditExercise() {
    if (!editingEx || !editExName.trim()) return;
    const updatedExercises = data.exercises.map((e) =>
      e.id === editingEx.id
        ? { ...e, name: editExName.trim(), muscleGroup: editExGroup, isAssisted: editExAssisted }
        : e
    );
    onUpdate(saveExercises(data, updatedExercises));
    setEditingEx(null);
  }

  function handleCreateExercise() {
    if (!newExName.trim()) return;
    const newEx: Exercise = {
      id: generateId(),
      name: newExName.trim(),
      muscleGroup: newExGroup,
      isCustom: true,
      isAssisted: newExAssisted,
    };
    onUpdate(saveExercises(data, [...data.exercises, newEx]));
    setNewExName('');
    setNewExAssisted(false);
    setShowAddExModal(false);
  }

  function handleDeleteExercise(id: string) {
    onUpdate(saveExercises(data, data.exercises.filter(e => e.id !== id)));
  }

  function updateSettings(patch: Partial<AppSettings>) {
    const settings = { ...data.settings, ...patch };
    onUpdate({ ...data, settings });
  }

  const { theme, defaultRestSeconds } = data.settings;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Configurações</h1>
      </header>

      <main className="page-content">

        {/* Theme selector */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            {theme === 'light' ? <Sun size={16} color="var(--warning)" /> : <Moon size={16} color="var(--text-muted)" />}
            <span className="input-label">Tema Visual</span>
          </div>
          <div className="theme-grid">
            {THEMES.map((t) => (
              <button
                key={t.id}
                className={`theme-option ${theme === t.id ? 'active' : ''}`}
                id={`btn-theme-${t.id}`}
                onClick={() => updateSettings({ theme: t.id })}
              >
                {/* Preview swatch */}
                <div
                  className="theme-preview"
                  style={{ background: t.bg }}
                >
                  <div
                    className="theme-preview-bar"
                    style={{ height: 28, background: t.accent, borderRadius: 4 }}
                  />
                  <div
                    className="theme-preview-bar"
                    style={{ height: 18, background: t.cardBg, border: '1px solid rgba(128,128,128,0.2)', borderRadius: 4 }}
                  />
                  <div
                    className="theme-preview-bar"
                    style={{ height: 22, background: t.cardBg, border: '1px solid rgba(128,128,128,0.2)', borderRadius: 4 }}
                  />
                </div>
                <div>
                  <div className="theme-option-label">{t.label}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{t.desc}</div>
                </div>
                {theme === t.id && (
                  <div style={{
                    position: 'absolute',
                    top: 10, right: 10,
                    width: 8, height: 8,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                  }} />
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Default rest time */}
        <section>
          <div className="card">
            <div className="settings-row">
              <div className="settings-row-info">
                <Clock size={16} color="var(--text-muted)" style={{ display: 'inline', marginRight: 6 }} />
                <span className="settings-row-label">Descanso Padrão</span>
                <div className="settings-row-desc">Tempo entre séries ao iniciar um novo treino</div>
              </div>
            </div>
            <hr className="divider" />
            <div style={{ padding: '4px 16px 12px' }}>
              <select
                className="select"
                id="select-default-rest"
                value={defaultRestSeconds}
                onChange={(e) => updateSettings({ defaultRestSeconds: Number(e.target.value) })}
              >
                {REST_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Exercise Library */}
        <section>
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.9rem' }}>
                  <Dumbbell size={16} color="var(--accent)" />
                  Biblioteca de Exercícios ({data.exercises.length})
                </div>
                <div className="settings-row-desc" style={{ marginTop: 2 }}>
                  Adicione variações ou remova exercícios que não usa
                </div>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowAddExModal(true)}
                style={{ gap: 4, padding: '6px 12px', fontSize: '0.78rem' }}
              >
                <Plus size={14} />
                Novo
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: '40dvh', overflowY: 'auto' }}>
              {[...data.exercises]
                .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                .map((ex) => (
                <div key={ex.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '7px 10px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{ex.name}</span>
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
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{MUSCLE_GROUP_LABELS[ex.muscleGroup]}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <button
                      className="btn btn-icon"
                      style={{ color: 'var(--accent)', width: 28, height: 28 }}
                      onClick={() => handleOpenEditExercise(ex)}
                      title="Editar exercício"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="btn btn-icon"
                      style={{ color: 'var(--danger)', width: 28, height: 28 }}
                      onClick={() => handleDeleteExercise(ex.id)}
                      title="Excluir exercício"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* App info */}
        <section>
          <div className="card">
            <div className="settings-row">
              <div className="settings-row-info">
                <div className="settings-row-label">GymProg</div>
                <div className="settings-row-desc">Versão 1.0 — Fase 1 · Dados armazenados localmente no dispositivo</div>
              </div>
              <Settings size={18} color="var(--text-muted)" />
            </div>
          </div>
        </section>

        {/* Data & Privacy */}
        <section>
          <div className="card">
            <div style={{ padding: '14px 16px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <Trash2 size={15} color="var(--text-muted)" />
                <span className="settings-row-label">Dados e Privacidade</span>
              </div>
              <div className="settings-row-desc">Todas as informações ficam salvas localmente no dispositivo.</div>
            </div>
            <hr className="divider" />
            <button
              className="settings-row"
              id="btn-clear-history"
              style={{ width: '100%', cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left' }}
              onClick={() => setConfirmReset('history')}
            >
              <div className="settings-row-info">
                <div className="settings-row-label" style={{ color: 'var(--warning)' }}>Apagar histórico de sessões</div>
                <div className="settings-row-desc">Remove todos os treinos realizados. Fichas e exercícios são mantidos.</div>
              </div>
            </button>
            <hr className="divider" />
            <button
              className="settings-row"
              id="btn-full-reset"
              style={{ width: '100%', cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left' }}
              onClick={() => setConfirmReset('full')}
            >
              <div className="settings-row-info">
                <div className="settings-row-label" style={{ color: 'var(--danger)' }}>Redefinir tudo (Factory Reset)</div>
                <div className="settings-row-desc">Apaga todos os dados: histórico, fichas, exercícios personalizados e configurações.</div>
              </div>
            </button>
          </div>
        </section>

        {/* Reset confirmation modal */}
        {confirmReset && (
          <div className="modal-overlay" onClick={() => setConfirmReset(null)}>
            <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="modal-handle" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <AlertCircle size={20} color="var(--danger)" />
                <h2 className="modal-title" style={{ margin: 0 }}>
                  {confirmReset === 'history' ? 'Apagar Histórico?' : 'Redefinir Tudo?'}
                </h2>
              </div>
              <p style={{ marginBottom: 24 }}>
                {confirmReset === 'history'
                  ? 'Todos os treinos realizados serão removidos permanentemente. Suas fichas e exercícios serão mantidos.'
                  : 'TODOS os dados do aplicativo serão apagados: histórico, fichas personalizadas, exercícios e configurações. Esta ação não pode ser desfeita.'}
              </p>
              <div className="modal-actions">
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setConfirmReset(null)}>Cancelar</button>
                <button
                  className="btn btn-danger"
                  style={{ flex: 1 }}
                  id={`btn-confirm-reset-${confirmReset}`}
                  onClick={() => { onReset(confirmReset); setConfirmReset(null); }}
                >
                  {confirmReset === 'history' ? 'Apagar Histórico' : 'Redefinir Tudo'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Custom Exercise Modal */}
        {showAddExModal && (
          <div className="modal-overlay" onClick={() => setShowAddExModal(false)}>
            <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="modal-handle" />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 className="modal-title" style={{ margin: 0 }}>Novo Exercício Personalizado</h3>
                <button className="btn-icon btn" onClick={() => setShowAddExModal(false)}><X size={18} /></button>
              </div>

              <div className="modal-form">
                <div className="input-group">
                  <label className="input-label">Nome do Exercício</label>
                  <input
                    className="input"
                    placeholder="Ex: Supino Inclinado com Halteres, Paralelas no Gravíton..."
                    value={newExName}
                    onChange={(e) => setNewExName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Grupo Muscular</label>
                  <select
                    className="select"
                    value={newExGroup}
                    onChange={(e) => setNewExGroup(e.target.value as MuscleGroup)}
                  >
                    {MUSCLE_GROUPS.map((g) => (
                      <option key={g} value={g}>{MUSCLE_GROUP_LABELS[g]}</option>
                    ))}
                  </select>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.8rem', marginTop: 4 }}>
                  <input
                    type="checkbox"
                    checked={newExAssisted}
                    onChange={(e) => setNewExAssisted(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                  <span>Exercício assistido (Gravíton / menos peso = mais difícil)</span>
                </label>

                <div className="modal-actions" style={{ marginTop: 16 }}>
                  <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowAddExModal(false)}>
                    Cancelar
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 2 }}
                    disabled={!newExName.trim()}
                    onClick={handleCreateExercise}
                  >
                    Salvar Exercício
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Exercise Modal */}
        {editingEx && (
          <div className="modal-overlay" onClick={() => setEditingEx(null)}>
            <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="modal-handle" />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 className="modal-title" style={{ margin: 0 }}>Editar Exercício</h3>
                <button className="btn-icon btn" onClick={() => setEditingEx(null)}><X size={18} /></button>
              </div>

              <div className="modal-form">
                <div className="input-group">
                  <label className="input-label">Nome do Exercício</label>
                  <input
                    className="input"
                    value={editExName}
                    onChange={(e) => setEditExName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Grupo Muscular</label>
                  <select
                    className="select"
                    value={editExGroup}
                    onChange={(e) => setEditExGroup(e.target.value as MuscleGroup)}
                  >
                    {MUSCLE_GROUPS.map((g) => (
                      <option key={g} value={g}>{MUSCLE_GROUP_LABELS[g]}</option>
                    ))}
                  </select>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.8rem', marginTop: 4 }}>
                  <input
                    type="checkbox"
                    checked={editExAssisted}
                    onChange={(e) => setEditExAssisted(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                  <span>Exercício assistido (Gravíton / menos peso = mais difícil)</span>
                </label>

                <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  💡 O histórico de treinos e recordes anteriores referentes a este exercício serão mantidos intactos.
                </div>

                <div className="modal-actions" style={{ marginTop: 16 }}>
                  <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setEditingEx(null)}>
                    Cancelar
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 2 }}
                    disabled={!editExName.trim()}
                    onClick={handleSaveEditExercise}
                  >
                    Salvar Alterações
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
