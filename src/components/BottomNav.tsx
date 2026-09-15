import { Dumbbell, History, BarChart2, Settings } from 'lucide-react';
import type { View } from '../App';

interface Props {
  current: View;
  onChange: (v: View) => void;
}

const TABS: { view: View; label: string; Icon: typeof Dumbbell }[] = [
  { view: 'workouts', label: 'Treinos',  Icon: Dumbbell  },
  { view: 'history',  label: 'Histórico', Icon: History   },
  { view: 'progress', label: 'Progresso', Icon: BarChart2 },
  { view: 'settings', label: 'Config.',   Icon: Settings  },
];

export function BottomNav({ current, onChange }: Props) {
  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {TABS.map(({ view, label, Icon }) => (
        <button
          key={view}
          className={`nav-item ${current === view ? 'active' : ''}`}
          onClick={() => onChange(view)}
          aria-label={label}
          aria-current={current === view ? 'page' : undefined}
        >
          <span className="nav-item-icon">
            <Icon size={22} strokeWidth={current === view ? 2.2 : 1.8} />
          </span>
          {label}
        </button>
      ))}
    </nav>
  );
}
