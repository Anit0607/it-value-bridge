'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, createElement } from 'react';
import { Item, Stage, BusinessValidation, STAGES } from './types';
import { MOCK_ITEMS } from './mockData';

const STORAGE_KEY = 'it-value-bridge-items';

interface StoreContextValue {
  items: Item[];
  addItem: (item: Item) => void;
  updateItem: (updated: Item) => void;
  markStageComplete: (id: string, note: string, user: string) => void;
  saveValidation: (id: string, validation: BusinessValidation) => void;
  getItem: (id: string) => Item | undefined;
  resetToMockData: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      } else {
        setItems(MOCK_ITEMS);
      }
    } catch {
      setItems(MOCK_ITEMS);
    }
    setHydrated(true);
  }, []);

  const persist = useCallback((next: Item[]) => {
    setItems(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage full — continue in-memory
    }
  }, []);

  const addItem = useCallback(
    (item: Item) => persist([...items, item]),
    [items, persist],
  );

  const updateItem = useCallback(
    (updated: Item) => persist(items.map(i => (i.id === updated.id ? updated : i))),
    [items, persist],
  );

  const markStageComplete = useCallback(
    (id: string, note: string, user: string) => {
      const item = items.find(i => i.id === id);
      if (!item) return;
      const idx = STAGES.indexOf(item.currentStage as Stage);
      if (idx >= STAGES.length - 1) return;
      const nextStage = STAGES[idx + 1];
      const today = new Date().toISOString().slice(0, 10);
      const expectedDate = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
      const updated: Item = {
        ...item,
        currentStage: nextStage,
        stageStartDate: today,
        stageExpectedDate: expectedDate,
        lastUpdated: today,
        notes: '',
        delayed: false,
        delaySource: undefined,
        history: [
          ...item.history,
          { stage: nextStage, date: today, user, note: note || `Moved to ${nextStage}` },
        ],
      };
      persist(items.map(i => (i.id === id ? updated : i)));
    },
    [items, persist],
  );

  const saveValidation = useCallback(
    (id: string, validation: BusinessValidation) => {
      const item = items.find(i => i.id === id);
      if (!item) return;
      const today = new Date().toISOString().slice(0, 10);
      const updated: Item = { ...item, validation, lastUpdated: today };
      persist(items.map(i => (i.id === id ? updated : i)));
    },
    [items, persist],
  );

  const getItem = useCallback((id: string) => items.find(i => i.id === id), [items]);

  const resetToMockData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    persist(MOCK_ITEMS);
  }, [persist]);

  if (!hydrated) return null;

  return createElement(
    StoreContext.Provider,
    { value: { items, addItem, updateItem, markStageComplete, saveValidation, getItem, resetToMockData } },
    children,
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
