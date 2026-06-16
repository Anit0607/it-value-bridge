interface Props {
  label: string;
  value: number | string;
  sub?: string;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'gray';
  onClick?: () => void;
}

const COLORS = {
  blue: 'border-blue-200 bg-blue-50',
  green: 'border-green-200 bg-green-50',
  amber: 'border-amber-200 bg-amber-50',
  red: 'border-red-200 bg-red-50',
  gray: 'border-gray-200 bg-gray-50',
};

const VALUE_COLORS = {
  blue: 'text-blue-700',
  green: 'text-green-700',
  amber: 'text-amber-700',
  red: 'text-red-700',
  gray: 'text-gray-700',
};

export function SummaryCard({ label, value, sub, color = 'blue', onClick }: Props) {
  return (
    <div
      className={`rounded-xl border-2 p-5 ${COLORS[color]} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="text-sm font-medium text-gray-600">{label}</div>
      <div className={`mt-1 text-3xl font-bold ${VALUE_COLORS[color]}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-gray-500">{sub}</div>}
    </div>
  );
}
