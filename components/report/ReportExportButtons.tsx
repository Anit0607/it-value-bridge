'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// Minimal types for the data passed from the server page
interface DelayedItem {
  title: string;
  verticalHead: string;
  currentStage: string;
  delaySource?: string | null;
  delayReason?: string | null;
  goLiveDate: string;
}

interface MissedItem {
  title: string;
  verticalHead: string;
  goLiveDate: string;
  currentStage: string;
}

interface RegulatoryItem {
  title: string;
  regulatoryBody?: string | null;
  regulatoryDueDate?: string | null;
  currentStage: string;
  isOverdue: boolean;
}

interface DeliveredItem {
  title: string;
  outcomeCategory: string;
  verticalHead: string;
  businessSponsor?: string | null;
  outcomeAchieved: string;
  targetMetric: string;
  actualMetric: string;
  actualResult: string;
  closureDate?: string | null;
}

interface Props {
  delayed: DelayedItem[];
  missed: MissedItem[];
  regulatory: RegulatoryItem[];
  delivered: DeliveredItem[];
  periodLabel: string;
}

function esc(v: string | number | boolean | null | undefined) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: string[][], headers: string[]) {
  const content = [
    headers.map(esc).join(','),
    ...rows.map(r => r.map(esc).join(',')),
  ].join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ReportExportButtons({ delayed, missed, regulatory, delivered, periodLabel }: Props) {
  const slug = periodLabel.replace(/[^a-z0-9]/gi, '-').toLowerCase();

  const exportDelayed = () =>
    downloadCsv(`delayed-items-${slug}.csv`,
      delayed.map(i => [i.title, i.verticalHead, i.currentStage, i.delaySource ?? '', i.delayReason ?? '', i.goLiveDate]),
      ['Initiative', 'Vertical Head', 'Current Stage', 'Delay Source', 'Delay Reason', 'Committed Go-Live'],
    );

  const exportMissed = () =>
    downloadCsv(`commitment-slippage-${slug}.csv`,
      missed.map(i => [i.title, i.verticalHead, i.goLiveDate, i.currentStage]),
      ['Initiative', 'Vertical Head', 'Committed Go-Live', 'Current Stage'],
    );

  const exportRegulatory = () =>
    downloadCsv(`regulatory-commitments-${slug}.csv`,
      regulatory.map(i => [i.title, i.regulatoryBody ?? '', i.regulatoryDueDate ?? '', i.currentStage, i.isOverdue ? 'Overdue' : 'On Track']),
      ['Initiative', 'Regulator / Body', 'Mandated Due Date', 'Current Stage', 'Status'],
    );

  const exportDelivered = () =>
    downloadCsv(`value-delivered-${slug}.csv`,
      delivered.map(i => [i.title, i.outcomeCategory, i.verticalHead, i.businessSponsor ?? '', i.outcomeAchieved, i.targetMetric, i.actualMetric, i.actualResult, i.closureDate ?? '']),
      ['Initiative', 'Outcome Category', 'Vertical Head', 'Business Sponsor', 'Outcome Achieved', 'Target Metric', 'Actual Metric', 'Result', 'Closure Date'],
    );

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      {delayed.length > 0 && (
        <Button variant="secondary" size="sm" icon={Download} onClick={exportDelayed}>
          Delay List
        </Button>
      )}
      {missed.length > 0 && (
        <Button variant="secondary" size="sm" icon={Download} onClick={exportMissed}>
          Slippage List
        </Button>
      )}
      {regulatory.length > 0 && (
        <Button variant="secondary" size="sm" icon={Download} onClick={exportRegulatory}>
          Regulatory List
        </Button>
      )}
      {delivered.length > 0 && (
        <Button variant="secondary" size="sm" icon={Download} onClick={exportDelivered}>
          Value Delivered
        </Button>
      )}
    </div>
  );
}
