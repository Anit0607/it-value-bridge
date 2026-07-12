// Single source of truth for executive-facing KPI/term definitions.
// Keep wording identical wherever a term appears so leadership sees one meaning, not several.

export const KPI_DEFINITIONS = {
  activeItems: 'Initiatives currently in flight (not yet Closed) across all verticals.',
  deliveredProjects: 'Initiatives moved to Closed stage within the selected period.',
  onTrack: 'Initiatives with Green RAG status — progressing as planned with no material risk.',
  atRisk: 'Initiatives with Amber RAG status — facing risk that could delay or reduce expected value if left unaddressed.',
  valueAtRisk: 'Active initiatives with Red RAG status where expected business value may be delayed, reduced, or blocked.',
  commitmentSlippage: 'Initiatives committed for the selected period but not closed by the period end.',
  regulatoryWatch: 'Initiatives with externally-mandated regulatory deadlines that require close monitoring.',
  governanceLifecycleView: 'Snapshot of how initiatives are distributed across each stage of the governance/delivery lifecycle.',
  strategicProjects: 'Initiatives with formal classification = Strategic — the highest leadership-importance tier, independent of delivery type (Project/CR) and regulatory status.',
} as const;
