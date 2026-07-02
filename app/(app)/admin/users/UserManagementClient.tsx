'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createPilotUser, type CreatePilotUserInput } from '@/lib/actions/auth';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { VERTICAL_HEADS } from '@/lib/types';
import { UserPlus, X } from 'lucide-react';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  verticalHead: string | null;
  createdAt: string;
  organizationName: string | null;
  organizationStatus: string | null;
}

interface Props {
  users: UserRow[];
}

const ROLE_TONE: Record<string, BadgeTone> = {
  ADMIN: 'danger', CIO: 'brand', PMO: 'success',
  VERTICAL_HEAD: 'warning', BUSINESS: 'violet',
};

const ORG_STATUS_TONE: Record<string, BadgeTone> = {
  PILOT: 'warning', ACTIVE: 'success', SUSPENDED: 'slate',
};

const ROLE_OPTIONS = [
  { value: 'CIO',          label: 'CIO — Executive Value Command Center' },
  { value: 'PMO',          label: 'PMO — Governance Control Tower' },
  { value: 'VERTICAL_HEAD',label: 'Vertical Head — Ownership Workspace' },
  { value: 'BUSINESS',     label: 'Business SPOC — Value Validation' },
  { value: 'ADMIN',        label: 'Admin — Platform Administration' },
];

const EMPTY: CreatePilotUserInput = {
  name: '', email: '', role: 'PMO', verticalHead: '', password: 'Demo@1234!',
};

export function UserManagementClient({ users }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreatePilotUserInput>(EMPTY);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const set = (key: keyof CreatePilotUserInput) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const handleCreate = () => {
    setError(''); setSuccess('');
    startTransition(async () => {
      const result = await createPilotUser(form);
      if (result.error) { setError(result.error); return; }
      setSuccess(`User ${form.email} created successfully.`);
      setForm(EMPTY);
      setShowForm(false);
      router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      {/* Header action */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{users.length} registered user{users.length !== 1 ? 's' : ''}</p>
        <Button variant="primary" size="sm" icon={UserPlus} onClick={() => { setShowForm(v => !v); setError(''); setSuccess(''); }}>
          {showForm ? 'Cancel' : 'Create Pilot User'}
        </Button>
      </div>

      {/* Success */}
      {success && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-2.5 text-sm font-medium text-emerald-800">
          {success}
          <button onClick={() => setSuccess('')}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-brand-800">Create Pilot User</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Full Name" required>
              <Input value={form.name} onChange={set('name')} placeholder="e.g. Suresh Patel" />
            </FormField>
            <FormField label="Email" required>
              <Input type="email" value={form.email} onChange={set('email')} placeholder="suresh@bank.com" />
            </FormField>
            <FormField label="Role" required>
              <Select value={form.role} onChange={set('role')}>
                {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </Select>
            </FormField>
            {form.role === 'VERTICAL_HEAD' && (
              <FormField label="Vertical Head Name" required hint="Used to scope initiatives to this vertical">
                <Select value={form.verticalHead ?? ''} onChange={set('verticalHead')}>
                  <option value="">Select vertical…</option>
                  {VERTICAL_HEADS.map(v => <option key={v} value={v}>{v}</option>)}
                </Select>
              </FormField>
            )}
            <FormField label="Initial Password" required hint="User should change on first login">
              <Input value={form.password} onChange={set('password')} placeholder="Min 8 characters" />
            </FormField>
          </div>
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
          <div className="flex gap-3">
            <Button variant="primary" icon={UserPlus} onClick={handleCreate} loading={isPending}>
              {isPending ? 'Creating…' : 'Create User'}
            </Button>
            <Button variant="secondary" onClick={() => { setShowForm(false); setError(''); }}>Cancel</Button>
          </div>
        </div>
      )}

      {/* User table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                {['Name', 'Email', 'Role', 'Vertical Head', 'Organization', 'Created', 'Status'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} className={`border-t border-slate-100 transition-colors hover:bg-brand-50/20 ${i % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'}`}>
                  <td className="px-4 py-3 font-semibold text-slate-800">{u.name}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge tone={ROLE_TONE[u.role] ?? 'slate'} size="sm">{u.role}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{u.verticalHead ?? '—'}</td>
                  <td className="px-4 py-3">
                    {u.organizationName ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-slate-600">{u.organizationName}</span>
                        {u.organizationStatus && (
                          <Badge tone={ORG_STATUS_TONE[u.organizationStatus] ?? 'slate'} size="sm">{u.organizationStatus}</Badge>
                        )}
                      </div>
                    ) : (
                      <Badge tone="danger" size="sm">Unassigned</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular text-xs text-slate-400">{u.createdAt}</td>
                  <td className="px-4 py-3">
                    <Badge tone="success" size="sm">Active</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
