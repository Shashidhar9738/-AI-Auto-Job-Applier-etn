import { getSettings } from '@/lib/storage';

type NotifyKind = 'high-match' | 'applied' | 'error' | 'captcha' | 'digest';

/** Show a browser notification, respecting the per-type settings toggles. */
export async function notify(
  kind: NotifyKind,
  title: string,
  message: string,
): Promise<void> {
  const { notifications: n } = await getSettings();
  const enabled: Record<NotifyKind, boolean> = {
    'high-match': n.onHighMatch,
    applied: n.onApplied,
    error: n.onError,
    captcha: n.onError,
    digest: n.dailyDigest,
  };
  if (!enabled[kind]) return;

  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('src/assets/icon-128.png'),
    title,
    message,
    priority: kind === 'error' || kind === 'captcha' ? 2 : 1,
  });
}
