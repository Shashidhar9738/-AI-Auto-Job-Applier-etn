import { useApplications } from '@/lib/hooks';
import { PORTAL_LABELS } from '@/lib/constants';
import { deleteApplication } from '@/lib/storage';

/**
 * The manual-queue view: matched jobs saved for the user to apply to when they
 * choose, plus anything currently awaiting review after a semi-auto fill.
 */
export function Queue() {
  const apps = useApplications();
  const queued = apps.filter((a) => a.status === 'queued' || a.status === 'awaiting-review');

  if (queued.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-400">
        Nothing queued. Matched jobs in Manual Queue mode show up here.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {queued.map((a) => (
        <li key={a.id} className="card p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{a.job.title}</p>
              <p className="truncate text-xs text-slate-500">
                {a.job.company} · {PORTAL_LABELS[a.job.portal]}
                {a.match ? ` · ${a.match.score}% match` : ''}
              </p>
            </div>
            <span className="chip">{a.status === 'awaiting-review' ? 'Review' : 'Queued'}</span>
          </div>
          <div className="mt-2 flex gap-2">
            <a href={a.job.url} target="_blank" rel="noreferrer" className="btn-primary flex-1 text-xs">
              Open & apply
            </a>
            <button className="btn-ghost text-xs" onClick={() => deleteApplication(a.id)}>
              Dismiss
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
