export type MuscleGroup =
  | 'Peito'
  | 'Costas'
  | 'Ombros'
  | 'Biceps'
  | 'Triceps'
  | 'Pernas'
  | 'Gluteos'
  | 'Abdomen'
  | 'Panturrilha'
  | 'Antebraco'
  | 'Cardio'
  | 'Full Body';

export type Theme = 'obsidian' | 'crimson' | 'light';

export type BlockPhase = 'hypertrophy' | 'strength' | 'deload' | 'custom';

export interface TrainingBlock {
  id: string;
  phase: BlockPhase;
  name: string;
  startedAt: string;       // ISO date string
  durationWeeks: number;
  notes?: string;
  endedAt?: string;        // undefined = bloco ainda ativo
  deloadLastWeek: boolean; // se true: avisa na última semana
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  isCustom?: boolean;
  isAssisted?: boolean;
  notes?: string;
}

export interface WorkoutExercise {
  exerciseId: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number;
  order: number;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  description?: string;
  exercises: WorkoutExercise[];
  createdAt: string;
  updatedAt: string;
}

export interface LoggedSet {
  weight: number;
  weightUnit?: 'kg' | 'plates';
  reps: number;
  completed: boolean;
  isPersonalRecord?: boolean;
}

export interface LoggedExercise {
  exerciseId: string;
  sets: LoggedSet[];
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  templateId: string;
  startedAt: string;
  finishedAt?: string;
  durationSeconds?: number;
  exercises: LoggedExercise[];
}

export interface AppSettings {
  theme: Theme;
  defaultRestSeconds: number;
}

export interface AppData {
  exercises: Exercise[];
  workoutTemplates: WorkoutTemplate[];
  sessions: WorkoutSession[];
  settings: AppSettings;
  trainingBlocks: TrainingBlock[];
}

export interface WorkoutDraft {
  template: WorkoutTemplate;
  startedAt: string;
  startedAtMs: number;
  loggedExercises: LoggedExercise[];
  restEndsAtMs: number | null;
  restTotal: number | null;
  restPaused: boolean;
  restRemainingWhenPaused: number | null;
  updatedAt: string;
}

// Runtime sentinel so Vite/esbuild does not produce an empty module
export const __GYMPROG_TYPES_VERSION__ = '1';
