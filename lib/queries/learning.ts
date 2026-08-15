import { prisma } from '@/lib/db';
import { buildInitiativeVisibilityWhere } from '@/lib/rbac';
import { getLifecycle } from '@/lib/queries/lifecycle';
import { findStage } from '@/lib/lifecycle';
import {
  assessClaim, aggregateBy, summariseExceptions, assessReadiness,
  type LearningInitiative, type ClaimAssessment, type DimensionGroup,
  type ExceptionSummary, type LearningReadiness,
} from '@/lib/learning';

export interface LearningView {
  assessments: ClaimAssessment[];
  bySponsor: DimensionGroup[];
  byVertical: DimensionGroup[];
  byBenefitCategory: DimensionGroup[];
  byInvestmentCategory: DimensionGroup[];
  exceptions: ExceptionSummary;
  readiness: LearningReadiness;
}

const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.44;

/**
 * Assembles the learning loop for one user (docs/ROADMAP.md M6).
 *
 * Scoped through `buildInitiativeVisibilityWhere` like every other initiative
 * read — a Vertical Head must not see claim-accuracy figures for sponsors
 * outside their scope, and this is doubly true here because these numbers are
 * about named people's forecasting records.
 */
export async function getLearningView(user: {
  role: string;
  name: string;
  verticalHead?: string | null;
  organizationId?: string | null;
}): Promise<LearningView> {
  if (!user.organizationId) {
    const empty: LearningView = {
      assessments: [], bySponsor: [], byVertical: [],
      byBenefitCategory: [], byInvestmentCategory: [],
      exceptions: { outcomes: [], assessedCount: 0, reportable: false, medianAccuracy: null },
      readiness: assessReadiness([]),
    };
    return empty;
  }

  const where = buildInitiativeVisibilityWhere({ ...user, organizationId: user.organizationId });

  const [rows, lifecycle] = await Promise.all([
    prisma.initiative.findMany({
      where,
      select: {
        id: true, title: true,
        businessSponsor: true, verticalHeadName: true,
        benefitCategory: true, investmentCategory: true,
        currentStage: true,
        valueSignedOff: true,
        signedOffValueInr: true, signedOffTcoInr: true,
        valueSignOffAt: true,
        expectedGoLiveDate: true,
        benefitClaims: {
          select: {
            realizationHorizonMonths: true,
            measurements: { select: { realizedInr: true, evidenceSource: true } },
          },
        },
        valueRestatements: {
          orderBy: { restatedAt: 'asc' },
          select: { previousValueInr: true },
        },
        investmentExceptions: {
          orderBy: { approvedAt: 'desc' },
          take: 1,
          select: {
            roiAtApproval: true, thresholdAtApproval: true,
            approvedBy: true, approvedAt: true,
          },
        },
      },
    }),
    getLifecycle(user.organizationId),
  ]);

  const now = Date.now();

  const initiatives: LearningInitiative[] = rows.map(r => {
    const readings = r.benefitClaims.flatMap(c => c.measurements);
    const withValue = readings.filter(m => m.realizedInr != null);

    // The horizon is the LONGEST across this initiative's claims: an initiative
    // is not fully due until its slowest-realizing benefit has had its time.
    const horizonMonths = r.benefitClaims.length
      ? Math.max(...r.benefitClaims.map(c => c.realizationHorizonMonths))
      : null;

    // Measured from go-live, which is when the clock on a promise actually
    // starts — not from sign-off, which can precede delivery by a year.
    const monthsPastDue =
      horizonMonths == null
        ? null
        : (now - r.expectedGoLiveDate.getTime()) / MS_PER_MONTH - horizonMonths;

    return {
      id: r.id,
      title: r.title,
      sponsor: r.businessSponsor ?? '—',
      verticalHead: r.verticalHeadName ?? '—',
      benefitCategory: r.benefitCategory,
      investmentCategory: r.investmentCategory,
      promisedValueInr: r.signedOffValueInr,
      valueSignedOff: r.valueSignedOff,
      promisedTcoInr: r.signedOffTcoInr,
      realizedInr: withValue.length ? withValue.reduce((s, m) => s + (m.realizedInr ?? 0), 0) : null,
      // Every reading that carries a ₹ figure must carry a source. One
      // unsourced reading taints the initiative's whole realized total,
      // because the total is a sum that includes it.
      allRealizedSourced: withValue.length > 0 && withValue.every(m => !!m.evidenceSource?.trim()),
      monthsPastDue,
      // The FIRST restatement's `previousValueInr` is the promise as originally
      // committed — later restatements record intermediate figures.
      originalPromiseInr: r.valueRestatements[0]?.previousValueInr ?? null,
      restatementCount: r.valueRestatements.length,
      isTerminal: findStage(lifecycle, r.currentStage)?.isTerminal ?? false,
    };
  });

  const assessments = initiatives.map(assessClaim);

  const exceptionInputs = rows
    .filter(r => r.investmentExceptions.length > 0)
    .map(r => {
      const e = r.investmentExceptions[0];
      return {
        initiativeId: r.id,
        title: r.title,
        roiAtApproval: e.roiAtApproval,
        thresholdAtApproval: e.thresholdAtApproval,
        approvedBy: e.approvedBy,
        approvedAt: e.approvedAt.toISOString().slice(0, 10),
      };
    });

  return {
    assessments,
    bySponsor: aggregateBy(assessments, initiatives, 'sponsor'),
    byVertical: aggregateBy(assessments, initiatives, 'verticalHead'),
    byBenefitCategory: aggregateBy(assessments, initiatives, 'benefitCategory'),
    byInvestmentCategory: aggregateBy(assessments, initiatives, 'investmentCategory'),
    exceptions: summariseExceptions(exceptionInputs, assessments),
    readiness: assessReadiness(assessments),
  };
}
