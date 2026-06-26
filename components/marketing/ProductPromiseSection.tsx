'use client';

import { Reveal } from './Reveal';

const QUESTIONS = [
  {
    n: '01',
    question: 'What is being delivered?',
    answer:
      'Every CR and project — title, stage, methodology, vertical, and go-live date — visible in one IT Value Portfolio across the entire organization.',
    accent: 'border-brand-400',
    nColor: 'text-brand-200',
  },
  {
    n: '02',
    question: 'Where is it stuck?',
    answer:
      'Delivery Risk Intelligence surfaces overdue stages, stale updates, and RAG health automatically — no manual flags, no waiting for the next status meeting.',
    accent: 'border-rose-400',
    nColor: 'text-rose-200',
  },
  {
    n: '03',
    question: 'Who owns the delay or risk?',
    answer:
      'Accountability & Bottleneck Mapping attributes every delay to IT, Business, Vendor, or External — with the owner, reason, and days slipped on record.',
    accent: 'border-amber-400',
    nColor: 'text-amber-200',
  },
  {
    n: '04',
    question: 'What business value will it create — or has it created?',
    answer:
      'The Leadership Value Summary shows projected ₹ ROI, signed-off value, and realized benefit by initiative, category, OKR, and vertical — board-ready, not a status update.',
    accent: 'border-emerald-400',
    nColor: 'text-emerald-200',
  },
];

export function ProductPromiseSection() {
  return (
    <section id="value-intelligence" className="border-b border-slate-200 bg-navy-900 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-400">
            The product promise
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Every IT initiative must answer four leadership questions.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-400">
            IT Value Bridge is designed around them.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {QUESTIONS.map((q, i) => (
            <Reveal key={q.n} delay={i * 0.08}>
              <div className={`flex h-full flex-col gap-4 rounded-xl border-l-4 bg-white/5 p-6 ring-1 ring-white/10 ${q.accent}`}>
                <span className={`font-mono text-5xl font-bold leading-none ${q.nColor}`}>
                  {q.n}
                </span>
                <h3 className="text-lg font-semibold leading-snug text-white">{q.question}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{q.answer}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
