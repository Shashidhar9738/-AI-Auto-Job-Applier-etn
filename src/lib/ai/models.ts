import type { AiSettings } from '../types';
import { sendToBackground } from '../messaging';

/**
 * Fetch the provider's live model list from a UI surface. For custom endpoints
 * it first requests the host permission (must be the first await in a user
 * gesture). The background worker performs the actual fetch (it holds the key
 * and bypasses CORS).
 */
export async function fetchModelList(
  ai: AiSettings,
): Promise<{ ok: true; models: string[] } | { ok: false; error: string }> {
  if (!ai.apiKey) return { ok: false, error: 'Enter an API key first.' };
  if (ai.provider === 'custom' && !ai.baseUrl) {
    return { ok: false, error: 'Enter the Base URL first.' };
  }

  if (ai.provider === 'custom' && ai.baseUrl) {
    try {
      const origin = new URL(ai.baseUrl).origin + '/*';
      const granted = await chrome.permissions.request({ origins: [origin] });
      if (!granted) return { ok: false, error: 'Permission denied for that endpoint.' };
    } catch {
      return { ok: false, error: 'Invalid Base URL.' };
    }
  }

  const res = await sendToBackground({ type: 'ai/list-models', ai });
  return res.ok
    ? { ok: true, models: (res.data as string[]) ?? [] }
    : { ok: false, error: res.error };
}
