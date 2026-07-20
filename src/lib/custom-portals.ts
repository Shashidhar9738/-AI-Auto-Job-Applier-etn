import type { CustomPortal } from './types';
import { getSettings, saveSettings } from './storage';
import { uid } from './utils';

/**
 * Runtime management of user-added job portals.
 *
 * MV3 flow: the extension ships an optional host permission for all HTTPS sites
 * but grants nothing by default. When the user adds a portal we (1) request the
 * host permission for just that origin, then (2) register the content script
 * for it via `chrome.scripting`. The generic adapter handles the site once
 * injected — no code change needed.
 *
 * `chrome.permissions.request` must run in a user gesture, so `addCustomPortal`
 * is called from the Settings page click handler (not the service worker).
 */

const SCRIPT_ID_PREFIX = 'custom-portal-';

/** The built content-script filename, read from the manifest so this works
 *  regardless of which bundler produced it (Vite hashes names; WASM = content.js). */
function contentScriptFile(): string {
  const cs = chrome.runtime.getManifest().content_scripts?.[0]?.js?.[0];
  if (!cs) throw new Error('No content script found in manifest.');
  return cs;
}

/** Turn a pasted URL or bare host into a valid match pattern. */
export function toMatchPattern(input: string): string {
  let raw = input.trim();
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  let host: string;
  try {
    host = new URL(raw).hostname;
  } catch {
    throw new Error(`"${input}" is not a valid URL or domain.`);
  }
  host = host.replace(/^www\./, '');
  return `https://${host}/*`;
}

export function labelFromPattern(pattern: string): string {
  const host = pattern.replace(/^https:\/\//, '').replace(/\/\*$/, '');
  return host.replace(/^\*\./, '');
}

async function registerScript(portal: CustomPortal): Promise<void> {
  const id = SCRIPT_ID_PREFIX + portal.id;
  const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [id] });
  const def: chrome.scripting.RegisteredContentScript = {
    id,
    matches: [portal.origin],
    js: [contentScriptFile()],
    runAt: 'document_idle',
  };
  if (existing.length) await chrome.scripting.updateContentScripts([def]);
  else await chrome.scripting.registerContentScripts([def]);
}

async function unregisterScript(portalId: string): Promise<void> {
  const id = SCRIPT_ID_PREFIX + portalId;
  try {
    await chrome.scripting.unregisterContentScripts({ ids: [id] });
  } catch {
    /* not registered — ignore */
  }
}

/**
 * Add a portal. Must be invoked from a user gesture (page click). Returns the
 * created portal, or throws if the user denies the permission prompt.
 */
export async function addCustomPortal(
  input: string,
  label?: string,
): Promise<CustomPortal> {
  const origin = toMatchPattern(input);
  const settings = await getSettings();

  if (settings.customPortals.some((p) => p.origin === origin)) {
    throw new Error('That portal is already added.');
  }

  const granted = await chrome.permissions.request({ origins: [origin] });
  if (!granted) throw new Error('Permission denied for that site.');

  const portal: CustomPortal = {
    id: uid('portal_'),
    label: label?.trim() || labelFromPattern(origin),
    origin,
    enabled: true,
    createdAt: Date.now(),
  };

  await registerScript(portal);
  await saveSettings({ customPortals: [...settings.customPortals, portal] });
  return portal;
}

export async function removeCustomPortal(id: string): Promise<void> {
  const settings = await getSettings();
  const portal = settings.customPortals.find((p) => p.id === id);
  await unregisterScript(id);
  if (portal) {
    // Best-effort: revoke the host permission we requested for it.
    await chrome.permissions.remove({ origins: [portal.origin] }).catch(() => void 0);
  }
  await saveSettings({
    customPortals: settings.customPortals.filter((p) => p.id !== id),
  });
}

export async function setCustomPortalEnabled(id: string, enabled: boolean): Promise<void> {
  const settings = await getSettings();
  const portals = settings.customPortals.map((p) =>
    p.id === id ? { ...p, enabled } : p,
  );
  const portal = portals.find((p) => p.id === id);
  if (portal) {
    if (enabled) await registerScript(portal);
    else await unregisterScript(id);
  }
  await saveSettings({ customPortals: portals });
}

/**
 * Re-register scripts for all enabled portals whose permission is still
 * granted. Called on service-worker startup — dynamic registrations are cleared
 * on extension update, and granted permissions persist, so this restores them.
 */
export async function syncCustomPortals(): Promise<void> {
  const { customPortals } = await getSettings();
  for (const portal of customPortals) {
    if (!portal.enabled) continue;
    const has = await chrome.permissions.contains({ origins: [portal.origin] });
    if (has) await registerScript(portal).catch(() => void 0);
  }
}
