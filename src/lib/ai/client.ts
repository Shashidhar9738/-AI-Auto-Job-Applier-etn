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
  return ai.provider === 'anthropic'
    ? callAnthropic(ai, opts)
    : callOpenAI(ai, opts);
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

async function callOpenAI(ai: AiSettings, opts: ChatOptions): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${ai.apiKey}`,
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
  if (!res.ok) throw new AiError(`OpenAI API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== 'string') throw new AiError('Unexpected OpenAI response shape.');
  return text.trim();
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
