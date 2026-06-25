import type { Metadata } from 'next';
import { Hero } from '@/components/marketing/Hero';
import { StatsBand } from '@/components/marketing/StatsBand';
import { FeatureGrid } from '@/components/marketing/FeatureGrid';
import { CTASection } from '@/components/marketing/CTASection';

export const metadata: Metadata = {
  title: 'IT Value Bridge — IT Business Value Intelligence Platform for Banking',
  description:
    'IT Business Value Intelligence Platform for banking technology teams. Track every IT initiative from BRD to business validation, surface ₹ ROI to the board, and connect delivery to outcomes — self-hosted, air-gapped, RBI-compliant.',
};

export default function LandingPage() {
  return (
    <>
      <Hero />
      <StatsBand />
      <FeatureGrid />
      <CTASection />
    </>
  );
}
