import { useState, useCallback } from 'react';
import { AppData } from '../types';
import { loadData, saveData } from '../services/storage';

export function useAppData() {
  const [data, setData] = useState<AppData>(() => loadData());

  const update = useCallback((next: AppData | ((prev: AppData) => AppData)) => {
    setData((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      saveData(resolved);
      return resolved;
    });
  }, []);

  return { data, update };
}
