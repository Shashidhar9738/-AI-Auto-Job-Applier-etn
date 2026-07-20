import type { AiSettings } from '../types';
import { sendToBackground } from '../messaging';

/**
 * Verify an AI configuration end-to-end from a UI surface: for a custom
 * endpoint it first requests the host permission (must run in the click's user
 * gesture — keep it the first await), then asks the background worker to make a
 * tiny real request. Returns a friendly ok/error the UI can show directly.
 */
export async function testAiConnection(
  ai: AiSettings,
): Promise<{ ok: boolean; message: string }> {
  if (!ai.apiKey) return { ok: false, message: 'Enter an API key first.' };
  if (ai.provider === 'custom' && !ai.baseUrl) {
    return { ok: false, message: 'Enter the Base URL first.' };
  }

  if (ai.provider === 'custom' && ai.baseUrl) {
    try {
      const origin = new URL(ai.baseUrl).origin + '/*';
      const granted = await chrome.permissions.request({ origins: [origin] });
      if (!granted) return { ok: false, message: 'Permission denied for that endpoint.' };
    } catch {
      return { ok: false, message: 'Invalid Base URL.' };
    }
  }

  const res = await sendToBackground({ type: 'ai/test', ai });
  return res.ok
    ? { ok: true, message: 'Connection works ✓' }
    : { ok: false, message: humanizeError(res.error) };
}

/** Turn raw provider errors into a hint about the likely cause. */
function humanizeError(error: string): string {
  const e = error.toLowerCase();
  if (e.includes('401') || e.includes('authentication') || e.includes('invalid api key')) {
    return `Invalid API key. ${error}`;
  }
  if (e.includes('402') || e.includes('insufficient') || e.includes('credit') || e.includes('balance')) {
    return `Out of credits / balance on the provider. ${error}`;
  }
  if (e.includes('model') && (e.includes('not') || e.includes('400') || e.includes('404'))) {
    return `Model name not recognized — check the exact slug. ${error}`;
  }
  return error;
}
