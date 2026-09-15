import { Exercise, MuscleGroup } from '../types';

// Create stable deterministic IDs based on name to prevent duplication on reloads
const ex = (name: string, muscleGroup: MuscleGroup): Exercise => ({
  id: 'ex-' + name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
  name,
  muscleGroup,
});

export const DEFAULT_EXERCISES: Exercise[] = [
  // Peito
  ex('Supino Reto com Barra', 'Peito'),
  ex('Supino Reto com Halteres', 'Peito'),
  ex('Supino Inclinado com Halteres', 'Peito'),
  ex('Supino Inclinado com Barra', 'Peito'),
  ex('Supino Declinado', 'Peito'),
  ex('Crucifixo com Halteres', 'Peito'),
  ex('Peck Deck (Voador)', 'Peito'),
  ex('Crossover com Cabo', 'Peito'),
  ex('Flexão de Braço', 'Peito'),

  // Costas
  ex('Remada Curvada com Barra', 'Costas'),
  ex('Remada Unilateral com Halter', 'Costas'),
  ex('Remada Baixa no Cabo (Pulley)', 'Costas'),
  ex('Barra Fixa (Pull-up)', 'Costas'),
  ex('Puxada Frontal (Pulley)', 'Costas'),
  ex('Pullover com Halter', 'Costas'),
  ex('Levantamento Terra', 'Costas'),

  // Ombros
  ex('Desenvolvimento Militar com Barra', 'Ombros'),
  ex('Desenvolvimento com Halteres', 'Ombros'),
  ex('Elevação Lateral com Halteres', 'Ombros'),
  ex('Elevação Lateral no Cabo', 'Ombros'),
  ex('Elevação Frontal', 'Ombros'),
  ex('Crucifixo Invertido', 'Ombros'),
  ex('Encolhimento de Ombros (Shrug)', 'Ombros'),

  // Biceps
  ex('Rosca Direta com Barra', 'Biceps'),
  ex('Rosca Alternada com Halteres', 'Biceps'),
  ex('Rosca Concentrada', 'Biceps'),
  ex('Rosca Martelo', 'Biceps'),
  ex('Rosca Scott com Barra', 'Biceps'),
  ex('Rosca Scott com Halter', 'Biceps'),

  // Triceps
  ex('Tríceps Pulley (Corda)', 'Triceps'),
  ex('Tríceps Pulley (Barra Reta/W)', 'Triceps'),
  ex('Tríceps Testa (Skull Crusher)', 'Triceps'),
  ex('Tríceps Paralelas (Dips)', 'Triceps'),
  ex('Tríceps Coice', 'Triceps'),
  ex('Supino Fechado', 'Triceps'),

  // Pernas
  ex('Agachamento Livre com Barra', 'Pernas'),
  ex('Agachamento Smith', 'Pernas'),
  ex('Leg Press 45', 'Pernas'),
  ex('Cadeira Extensora', 'Pernas'),
  ex('Mesa Flexora', 'Pernas'),
  ex('Cadeira Flexora', 'Pernas'),
  ex('Avanço / Passada (Lunge)', 'Pernas'),
  ex('Agachamento Sumô', 'Pernas'),
  ex('Stiff com Barra / Halter', 'Pernas'),
  ex('Cadeira Adutora', 'Pernas'),

  // Gluteos
  ex('Hip Thrust (Elevação Pélvica)', 'Gluteos'),
  ex('Cadeira Abdutora', 'Gluteos'),
  ex('Glúteo no Cabo (Cross)', 'Gluteos'),

  // Abdomen
  ex('Abdominal Crunch', 'Abdomen'),
  ex('Prancha (Plank)', 'Abdomen'),
  ex('Abdominal Infra', 'Abdomen'),
  ex('Russian Twist', 'Abdomen'),
  ex('Abdominal no Pulley', 'Abdomen'),

  // Panturrilha
  ex('Panturrilha em Pé (Máquina)', 'Panturrilha'),
  ex('Panturrilha Sentado (Sóleos)', 'Panturrilha'),
  ex('Panturrilha no Leg Press / Smith', 'Panturrilha'),

  // Cardio
  ex('Corrida na Esteira', 'Cardio'),
  ex('Bicicleta Ergométrica', 'Cardio'),
  ex('Eliptico', 'Cardio'),
  ex('Corda (Jump Rope)', 'Cardio'),
];
