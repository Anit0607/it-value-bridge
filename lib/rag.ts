import type { Item, RAG } from './types';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function todayMs(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function daysFromNow(isoDate: string): number {
  return Math.round((new Date(isoDate).getTime() - todayMs()) / MS_PER_DAY);
}

export function daysInStage(stageStartDate: string): number {
  return Math.max(0, Math.round((todayMs() - new Date(stageStartDate).getTime()) / MS_PER_DAY));
}

export function daysSinceUpdate(lastUpdated: string): number {
  return Math.round((todayMs() - new Date(lastUpdated).getTime()) / MS_PER_DAY);
}

export function computeRAG(item: Item): RAG {
  if (item.currentStage === 'Closed') return 'Green';
  const daysToExpected = daysFromNow(item.stageExpectedDate);
  const staleDays = daysSinceUpdate(item.lastUpdated);
  if (daysToExpected < 0 || staleDays >= 7) return 'Red';
  if (daysToExpected <= 14) return 'Amber';
  return 'Green';
}

export function ragCounts(rags: RAG[]): { green: number; amber: number; red: number } {
  return {
    green: rags.filter(r => r === 'Green').length,
    amber: rags.filter(r => r === 'Amber').length,
    red: rags.filter(r => r === 'Red').length,
  };
}
