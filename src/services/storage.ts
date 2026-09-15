import { AppData, AppSettings, Exercise, WorkoutTemplate, WorkoutSession, TrainingBlock, WorkoutDraft } from '../types';
import { DEFAULT_EXERCISES } from './defaultData';

const STORAGE_KEY = 'gymprog_data';
const DRAFT_KEY = 'gymprog_workout_draft';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'obsidian',
  defaultRestSeconds: 90,
};

function getDefaultData(): AppData {
  return {
    exercises: DEFAULT_EXERCISES,
    workoutTemplates: [],
    sessions: [],
    settings: DEFAULT_SETTINGS,
    trainingBlocks: [],
  };
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultData();
    const parsed = JSON.parse(raw) as AppData;

    // Deduplicate parsed.exercises by normalized name or ID to clean past random-ID duplicates
    const seenNames = new Set<string>();
    const deduplicatedExercises: Exercise[] = [];
    
    // Obsolete default exercises to remove if they were default
    const obsoleteNames = new Set(['serrote', 'puxada pelo pescoco']);

    for (const ex of (parsed.exercises || [])) {
      const norm = ex.name.trim().toLowerCase();
      if (obsoleteNames.has(norm) && !ex.isCustom) continue;
      if (!seenNames.has(norm)) {
        seenNames.add(norm);
        deduplicatedExercises.push(ex);
      }
    }

    // Only merge default exercises if parsed.exercises is missing (initial migration guard)
    if (!Array.isArray(parsed.exercises)) {
      for (const defEx of DEFAULT_EXERCISES) {
        const norm = defEx.name.trim().toLowerCase();
        if (!seenNames.has(norm)) {
          seenNames.add(norm);
          deduplicatedExercises.push(defEx);
        }
      }
    }

    const finalExercises = deduplicatedExercises.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    const validExIds = new Set(finalExercises.map((e) => e.id));

    // Sanitize templates so any deleted/orphaned exercises are automatically purged
    const sanitizedTemplates: WorkoutTemplate[] = (parsed.workoutTemplates || []).map((t) => ({
      ...t,
      exercises: (t.exercises || []).filter((we) => validExIds.has(we.exerciseId)),
    }));

    return {
      ...parsed,
      exercises: finalExercises,
      workoutTemplates: sanitizedTemplates,
      trainingBlocks: parsed.trainingBlocks ?? [], // migration guard
    };
  } catch {
    return getDefaultData();
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ─── Granular helpers ─────────────────────────────────────────────────────────

export function saveExercises(data: AppData, exercises: Exercise[]): AppData {
  const validExIds = new Set(exercises.map((e) => e.id));
  const sanitizedTemplates = data.workoutTemplates.map((t) => ({
    ...t,
    exercises: (t.exercises || []).filter((we) => validExIds.has(we.exerciseId)),
  }));
  const next = { ...data, exercises, workoutTemplates: sanitizedTemplates };
  saveData(next);
  return next;
}

export function saveTemplates(data: AppData, workoutTemplates: WorkoutTemplate[]): AppData {
  const next = { ...data, workoutTemplates };
  saveData(next);
  return next;
}

export function saveSessions(data: AppData, sessions: WorkoutSession[]): AppData {
  const next = { ...data, sessions };
  saveData(next);
  return next;
}

export function saveTrainingBlocks(data: AppData, trainingBlocks: TrainingBlock[]): AppData {
  const next = { ...data, trainingBlocks };
  saveData(next);
  return next;
}

export function saveSettings(data: AppData, settings: AppSettings): AppData {
  const next = { ...data, settings };
  saveData(next);
  return next;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ─── Workout Draft Persistence ─────────────────────────────────────────

export function loadDraft(): WorkoutDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WorkoutDraft;
  } catch {
    return null;
  }
}

export function saveDraft(draft: WorkoutDraft | null): void {
  try {
    if (!draft) {
      localStorage.removeItem(DRAFT_KEY);
    } else {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }
  } catch (_) {}
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch (_) {}
}
