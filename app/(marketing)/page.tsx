import type { Metadata } from 'next';
import { Hero } from '@/components/marketing/Hero';
import { StatsBand } from '@/components/marketing/StatsBand';
import { FeatureGrid } from '@/components/marketing/FeatureGrid';
import { CTASection } from '@/components/marketing/CTASection';

export const metadata: Metadata = {
  title: 'IT Value Bridge — Translate IT delivery into business value',
  description:
    'Portfolio management for banking IT. Track Change Requests and Projects across Waterfall and Agile with live RAG health, PMBOK knowledge areas, and executive reporting.',
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
