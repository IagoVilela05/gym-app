import { useState, useMemo } from 'react';
import { Search, X, Check, Plus } from 'lucide-react';
import { Exercise, MuscleGroup } from '../types';
import { generateId } from '../services/storage';

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
  exercises: Exercise[];
  selectedIds: string[];
  onConfirm: (ids: string[]) => void;
  onCreateExercise?: (ex: Exercise) => void;
  onClose: () => void;
}

export function ExercisePicker({ exercises, selectedIds, onConfirm, onCreateExercise, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<MuscleGroup | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds));

  // Create form modal state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExGroup, setNewExGroup] = useState<MuscleGroup>('Peito');

  const filtered = useMemo(() => {
    return exercises
      .filter((ex) => {
        const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter ? ex.muscleGroup === filter : true;
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [exercises, search, filter]);

  // Group exercises by muscle when no specific filter is active and no search term
  const groupedExercises = useMemo(() => {
    if (filter !== null || search.trim() !== '') return null; // use flat list when filtering/searching

    const groups: { group: MuscleGroup; label: string; exercises: typeof exercises }[] = [];
    for (const g of MUSCLE_GROUPS) {
      const inGroup = filtered.filter((ex) => ex.muscleGroup === g);
      if (inGroup.length > 0) groups.push({ group: g, label: MUSCLE_GROUP_LABELS[g], exercises: inGroup });
    }
    return groups;
  }, [filtered, filter, search]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  function openCreateModal(initialName = '') {
    setNewExName(initialName || search.trim());
    setNewExGroup(filter ?? 'Peito');
    setShowCreateForm(true);
  }

  function handleSaveNewExercise() {
    if (!newExName.trim()) return;
    const newEx: Exercise = {
      id: generateId(),
      name: newExName.trim(),
      muscleGroup: newExGroup,
      isCustom: true,
    };
    if (onCreateExercise) {
      onCreateExercise(newEx);
    }
    setSelected(prev => new Set(prev).add(newEx.id));
    setShowCreateForm(false);
    setNewExName('');
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" style={{ maxHeight: '95dvh' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>Adicionar Exercícios</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => openCreateModal()}
              style={{ gap: 4, color: 'var(--accent)', fontSize: '0.78rem' }}
            >
              <Plus size={15} />
              Criar Novo
            </button>
            <button className="btn-icon btn" onClick={onClose} aria-label="Fechar">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="search-bar" style={{ marginBottom: 14 }}>
          <Search size={16} className="search-bar-icon" />
          <input
            className="input"
            placeholder="Buscar exercício (ex: Supino Halter, Barra W)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
          />
        </div>

        {/* Muscle group chips */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 14, marginBottom: 4 }}>
          <button
            className={`muscle-chip ${filter === null ? 'active' : ''}`}
            onClick={() => setFilter(null)}
          >Todos</button>
          {MUSCLE_GROUPS.map((g) => (
            <button
              key={g}
              className={`muscle-chip ${filter === g ? 'active' : ''}`}
              onClick={() => setFilter(filter === g ? null : g)}
            >{MUSCLE_GROUP_LABELS[g]}</button>
          ))}
        </div>

        {/* Selection count */}
        {selected.size > 0 && (
          <p style={{ fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600, marginBottom: 10 }}>
            {selected.size} exercício(s) selecionado(s)
          </p>
        )}

        {/* Exercise list */}
        <div className="card" style={{ marginBottom: 16, maxHeight: '42dvh', overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 12 }}>
                Nenhum exercício encontrado{search ? ` para "${search}"` : ''}
              </p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => openCreateModal(search)}
                style={{ gap: 6, margin: '0 auto' }}
              >
                <Plus size={15} />
                Criar "{search || 'Novo Exercício'}"
              </button>
            </div>
          ) : groupedExercises ? (
            // Grouped by muscle group (when Todos + no search)
            groupedExercises.map(({ group, label, exercises: groupExs }) => (
              <div key={group}>
                <div style={{
                  padding: '8px 14px 4px',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  color: 'var(--accent)',
                  borderBottom: '1px solid var(--border)',
                }}>
                  {label}
                </div>
                {groupExs.map((ex) => {
                  const isSelected = selected.has(ex.id);
                  return (
                    <div
                      key={ex.id}
                      className="exercise-list-item"
                      onClick={() => toggle(ex.id)}
                      style={{ background: isSelected ? 'var(--accent-glow)' : undefined }}
                    >
                      <div className="info">
                        <div className="name">{ex.name}</div>
                      </div>
                      {isSelected && (
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%',
                          background: 'var(--accent)', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          <Check size={14} color="white" strokeWidth={2.5} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            // Flat alphabetical list (when a muscle filter or search is active)
            filtered.map((ex) => {
              const isSelected = selected.has(ex.id);
              return (
                <div
                  key={ex.id}
                  className="exercise-list-item"
                  onClick={() => toggle(ex.id)}
                  style={{ background: isSelected ? 'var(--accent-glow)' : undefined }}
                >
                  <div className="info">
                    <div className="name">{ex.name}</div>
                    <div className="meta">{MUSCLE_GROUP_LABELS[ex.muscleGroup]}</div>
                  </div>
                  {isSelected && (
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: 'var(--accent)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <Check size={14} color="white" strokeWidth={2.5} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <button
          className="btn btn-primary btn-full"
          onClick={() => onConfirm(Array.from(selected))}
          disabled={selected.size === 0}
          style={{ opacity: selected.size === 0 ? 0.5 : 1 }}
        >
          Adicionar {selected.size > 0 ? `(${selected.size})` : ''} Exercício(s)
        </button>
      </div>

      {/* Quick Create Exercise Sub-modal */}
      {showCreateForm && (
        <div className="modal-overlay" style={{ zIndex: 300 }} onClick={() => setShowCreateForm(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 className="modal-title" style={{ margin: 0 }}>Novo Exercício Personalizado</h3>
              <button className="btn-icon btn" onClick={() => setShowCreateForm(false)}><X size={18} /></button>
            </div>

            <div className="modal-form">
              <div className="input-group">
                <label className="input-label">Nome do Exercício</label>
                <input
                  className="input"
                  placeholder="Ex: Supino Inclinado com Halteres, Agachamento Smith..."
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

              <div className="modal-actions" style={{ marginTop: 12 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowCreateForm(false)}>
                  Cancelar
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                  disabled={!newExName.trim()}
                  onClick={handleSaveNewExercise}
                >
                  Salvar Exercício
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
