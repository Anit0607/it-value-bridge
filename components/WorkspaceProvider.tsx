'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { DEFAULT_TERMS, type Terminology } from '@/lib/terminology';
import type { WorkspaceModules } from '@/lib/queries/workspace';
import type { StageOption } from '@/lib/types';

export interface WorkspaceContextValue {
  terms: Terminology;
  modules: WorkspaceModules;
  /** The organization's lifecycle, in order. */
  stages: StageOption[];
}

/**
 * Fallback for the brief window before the server value arrives, and for any
 * client component mounted outside the app shell. Everything on, shipped
 * vocabulary, no stages — the same safe default as an unlinked account.
 */
const FALLBACK: WorkspaceContextValue = {
  terms: DEFAULT_TERMS,
  modules: { regulatory: true, dependencies: true, milestones: true },
  stages: [],
};

const WorkspaceContext = createContext<WorkspaceContextValue>(FALLBACK);

/**
 * Makes the workspace's vocabulary, enabled modules and lifecycle available to
 * client components.
 *
 * Resolved once on the server in the app layout and passed down, rather than
 * fetched per component: these values change when an administrator saves the
 * setup form, not while someone is reading a page.
 */
export function WorkspaceProvider({
  value,
  children,
}: {
  value: WorkspaceContextValue;
  children: ReactNode;
}) {
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  return useContext(WorkspaceContext);
}

/** Shorthand for a single term: `const t = useTerms(); t.initiative`. */
export function useTerms(): Terminology {
  return useContext(WorkspaceContext).terms;
}
