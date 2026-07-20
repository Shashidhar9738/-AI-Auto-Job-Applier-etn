import type { AiSettings } from '../types';

/**
 * Provider-agnostic chat client. Supports Anthropic (Claude) and OpenAI.
 *
 * All calls run from the background service worker, which holds the only
 * reference to the API key. The key is read from local storage and never
 * leaves the machine except in the request to the chosen provider.
 */

export interface ChatOptions {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  /** Ask the model to return strict JSON. */
  json?: boolean;
}

export class AiError extends Error {}

export async function chat(ai: AiSettings, opts: ChatOptions): Promise<string> {
  if (!ai.apiKey) {
    throw new AiError('No API key set. Add one in Settings → AI.');
  }
  switch (ai.provider) {
    case 'anthropic':
      return callAnthropic(ai, opts);
    case 'gemini':
      // Google's OpenAI-compatible endpoint; the Gemini API key is the bearer.
      return callOpenAICompatible(ai, opts, {
        url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      });
    case 'openrouter':
      return callOpenAICompatible(ai, opts, {
        url: 'https://openrouter.ai/api/v1/chat/completions',
        // OpenRouter reads these (both optional). HTTP-Referer is allowed by
        // fetch (unlike the forbidden `Referer` header).
        headers: {
          'HTTP-Referer': chrome.runtime?.getURL?.('') ?? 'https://localhost',
          'X-Title': 'AI Auto Job Applier',
        },
      });
    case 'custom': {
      if (!ai.baseUrl) {
        throw new AiError('Set the Base URL for your custom provider in Settings → AI.');
      }
      return callOpenAICompatible(ai, opts, { url: normalizeEndpoint(ai.baseUrl) });
    }
    case 'openai':
    default:
      return callOpenAICompatible(ai, opts, {
        url: 'https://api.openai.com/v1/chat/completions',
      });
  }
}

/**
 * Accept either a full chat-completions URL or a base (e.g. ".../v1") and
 * return the full endpoint. Works for OpenAI-compatible APIs like DeepSeek
 * (https://api.deepseek.com), Groq, Together, Mistral, local Ollama, etc.
 */
function normalizeEndpoint(baseUrl: string): string {
  const url = baseUrl.trim().replace(/\/+$/, '');
  if (/\/chat\/completions$/.test(url)) return url;
  if (/\/v\d+$/.test(url)) return `${url}/chat/completions`;
  return `${url}/v1/chat/completions`;
}

async function callAnthropic(ai: AiSettings, opts: ChatOptions): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ai.apiKey,
      'anthropic-version': '2023-06-01',
      // Required for direct calls from a browser/extension context.
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: ai.model,
      max_tokens: opts.maxTokens ?? 1024,
      temperature: opts.temperature ?? 0.4,
      system:
        opts.system +
        (opts.json ? '\n\nRespond with valid JSON only. No prose, no code fences.' : ''),
      messages: [{ role: 'user', content: opts.user }],
    }),
  });
  if (!res.ok) throw new AiError(`Anthropic API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (typeof text !== 'string') throw new AiError('Unexpected Anthropic response shape.');
  return text.trim();
}

/**
 * Shared caller for OpenAI and any OpenAI-compatible gateway (OpenRouter). They
 * share the Chat Completions request/response shape; only the URL and a couple
 * of headers differ.
 */
async function callOpenAICompatible(
  ai: AiSettings,
  opts: ChatOptions,
  endpoint: { url: string; headers?: Record<string, string> },
): Promise<string> {
  const res = await fetch(endpoint.url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${ai.apiKey}`,
      ...endpoint.headers,
    },
    body: JSON.stringify({
      model: ai.model,
      max_tokens: opts.maxTokens ?? 1024,
      temperature: opts.temperature ?? 0.4,
      ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
      messages: [
        { role: 'system', content: opts.system },
        { role: 'user', content: opts.user },
      ],
    }),
  });
  if (!res.ok) throw new AiError(`API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== 'string') throw new AiError('Unexpected API response shape.');
  return text.trim();
}

/**
 * Fetch the provider's live model list. Anthropic uses its own models endpoint;
 * everything else uses the OpenAI-compatible `/models`. Returns bare model ids.
 */
export async function listModels(ai: AiSettings): Promise<string[]> {
  if (!ai.apiKey) throw new AiError('No API key set.');

  if (ai.provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/models?limit=1000', {
      headers: {
        'x-api-key': ai.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
    });
    if (!res.ok) throw new AiError(`API error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return (data?.data ?? []).map((m: { id: string }) => m.id).filter(Boolean);
  }

  const res = await fetch(modelsUrl(ai), {
    headers: { authorization: `Bearer ${ai.apiKey}` },
  });
  if (!res.ok) throw new AiError(`API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const arr: Array<{ id?: string; name?: string }> = data?.data ?? data?.models ?? [];
  return arr
    .map((m) => String(m.id ?? m.name ?? '').replace(/^models\//, ''))
    .filter(Boolean);
}

function modelsUrl(ai: AiSettings): string {
  switch (ai.provider) {
    case 'openai':
      return 'https://api.openai.com/v1/models';
    case 'gemini':
      return 'https://generativelanguage.googleapis.com/v1beta/openai/models';
    case 'openrouter':
      return 'https://openrouter.ai/api/v1/models';
    case 'custom': {
      const base = (ai.baseUrl ?? '').trim().replace(/\/+$/, '');
      if (/\/chat\/completions$/.test(base)) return base.replace(/\/chat\/completions$/, '/models');
      if (/\/v\d+$/.test(base)) return `${base}/models`;
      return `${base}/v1/models`;
    }
    default:
      throw new AiError('Model listing not supported for this provider.');
  }
}

/** Parse a model's JSON reply, tolerating stray code fences. */
export function parseJson<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Last resort: grab the first {...} or [...] block.
    const match = cleaned.match(/[{[][\s\S]*[}\]]/);
    if (match) return JSON.parse(match[0]) as T;
    throw new AiError('Model did not return valid JSON.');
  }
}
