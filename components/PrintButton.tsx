'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface PrintButtonProps {
  label?: string;
}

export function PrintButton({ label = 'Export as PDF' }: PrintButtonProps) {
  return (
    <Button
      variant="secondary"
      icon={Printer}
      onClick={() => window.print()}
      className="no-print"
    >
      {label}
    </Button>
  );
}
