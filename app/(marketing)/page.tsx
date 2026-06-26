import type { Metadata } from 'next';
import { Hero } from '@/components/marketing/Hero';
import { PainSection } from '@/components/marketing/PainSection';
import { WhyNowSection } from '@/components/marketing/WhyNowSection';
import { StatsBand } from '@/components/marketing/StatsBand';
import { AudienceSection } from '@/components/marketing/AudienceSection';
import { FeatureGrid } from '@/components/marketing/FeatureGrid';
import { CTASection } from '@/components/marketing/CTASection';

export const metadata: Metadata = {
  title: 'IT Value Bridge — IT Business Value Intelligence Platform for Banking',
  description:
    'IT Value Bridge helps banking IT leaders convert project delivery, CR progress, RAG risks, and business outcomes into board-ready value intelligence. Self-hosted, air-gapped, RBI-compliant.',
};

export default function LandingPage() {
  return (
    <>
      <Hero />
      <PainSection />
      <WhyNowSection />
      <StatsBand />
      <AudienceSection />
      <FeatureGrid />
      <CTASection />
    </>
  );
}
