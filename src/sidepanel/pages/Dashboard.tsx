import { useMemo, useState } from 'react';
import { useApplications } from '@/lib/hooks';
import { PORTAL_LABELS } from '@/lib/constants';
import { downloadCsv } from '@/lib/export';
import { deleteApplication, upsertApplication } from '@/lib/storage';
import { formatDate } from '@/lib/utils';
import type { ApplicationRecord, ApplicationStatus } from '@/lib/types';

const PIPELINE: ApplicationStatus[] = ['applied', 'viewed', 'interview', 'offer', 'rejected'];

const STATUS_STYLE: Record<string, string> = {
  applied: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  viewed: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  interview: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  offer: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  'awaiting-review': 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  skipped: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  error: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  'in-progress': 'bg-slate-100 text-slate-600 dark:bg-slate-800',
  queued: 'bg-slate-100 text-slate-600 dark:bg-slate-800',
};

const ALL_STATUSES: ApplicationStatus[] = [
  'applied', 'viewed', 'interview', 'offer', 'rejected', 'awaiting-review', 'skipped', 'error',
];

export function Dashboard() {
  const apps = useApplications();
  const [filter, setFilter] = useState<'all' | ApplicationStatus>('all');

  const visible = useMemo(
    () => apps.filter((a) => filter === 'all' || a.status === filter),
    [apps, filter],
  );

  const stats = useMemo(() => {
    const applied = apps.filter((a) => PIPELINE.includes(a.status));
    const responses = apps.filter((a) => ['viewed', 'interview', 'offer'].includes(a.status));
    const interviews = apps.filter((a) => ['interview', 'offer'].includes(a.status));
    const rate = applied.length ? Math.round((responses.length / applied.length) * 100) : 0;
    return { applied: applied.length, responseRate: rate, interviews: interviews.length };
  }, [apps]);

  const changeStatus = (rec: ApplicationRecord, status: ApplicationStatus) =>
    upsertApplication({ ...rec, status });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Kpi label="Applied" value={stats.applied} />
        <Kpi label="Response rate" value={`${stats.responseRate}%`} />
        <Kpi label="Interviews" value={stats.interviews} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <select
          className="input max-w-[55%]"
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
        >
          <option value="all">All statuses ({apps.length})</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s} ({apps.filter((a) => a.status === s).length})
            </option>
          ))}
        </select>
        <button
          className="btn-ghost text-xs"
          onClick={() => downloadCsv(apps)}
          disabled={apps.length === 0}
        >
          Export CSV
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">No applications yet.</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((a) => (
            <li key={a.id} className="card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <a
                    href={a.job.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-sm font-medium hover:text-brand-600"
                  >
                    {a.job.title}
                  </a>
                  <p className="truncate text-xs text-slate-500">
                    {a.job.company} · {PORTAL_LABELS[a.job.portal]} · {formatDate(a.appliedAt ?? a.createdAt)}
                  </p>
                </div>
                {a.match && (
                  <span className="shrink-0 rounded-md bg-brand-50 px-1.5 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-200">
                    {a.match.score}%
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <select
                  className={`rounded-md px-2 py-1 text-xs font-medium ${STATUS_STYLE[a.status] ?? ''}`}
                  value={a.status}
                  onChange={(e) => changeStatus(a, e.target.value as ApplicationStatus)}
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  className="ml-auto text-xs text-slate-400 hover:text-red-500"
                  onClick={() => deleteApplication(a.id)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-3 text-center">
      <div className="text-xl font-semibold">{value}</div>
      <div className="text-[11px] text-slate-500">{label}</div>
    </div>
  );
}
