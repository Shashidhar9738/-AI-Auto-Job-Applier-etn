import type { ApplicationRecord } from './types';
import { PORTAL_LABELS } from './constants';
import { csvEscape, formatDate } from './utils';

const HEADERS = [
  'Applied Date',
  'Company',
  'Role',
  'Portal',
  'Status',
  'Match %',
  'Location',
  'URL',
];

/** Serialize applications to CSV (Excel-compatible). */
export function applicationsToCsv(apps: ApplicationRecord[]): string {
  const rows = apps.map((a) =>
    [
      formatDate(a.appliedAt ?? a.createdAt),
      a.job.company,
      a.job.title,
      PORTAL_LABELS[a.job.portal],
      a.status,
      a.match?.score ?? '',
      a.job.location ?? '',
      a.job.url,
    ]
      .map(csvEscape)
      .join(','),
  );
  return [HEADERS.join(','), ...rows].join('\r\n');
}

/** Trigger a client-side download of the CSV. */
export function downloadCsv(apps: ApplicationRecord[]): void {
  const blob = new Blob([applicationsToCsv(apps)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `job-applications-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
