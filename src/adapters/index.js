import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

const PROVIDERS = {
  claude: {
    label: 'Claude (Anthropic)',
    envKey: 'ANTHROPIC_API_KEY',
    models: ['claude-sonnet-4-6', 'claude-opus-4-7', 'claude-haiku-4-5-20251001'],
    defaultModel: 'claude-sonnet-4-6',
  },
  openai: {
    label: 'GPT-4o (OpenAI)',
    envKey: 'OPENAI_API_KEY',
    models: ['gpt-4o', 'gpt-4o-mini', 'o3'],
    defaultModel: 'gpt-4o',
    baseURL: 'https://api.openai.com/v1',
  },
  grok: {
    label: 'Grok (xAI)',
    envKey: 'XAI_API_KEY',
    models: ['grok-4', 'grok-3', 'grok-3-mini'],
    defaultModel: 'grok-4',
    baseURL: 'https://api.x.ai/v1',
  },
};

function buildClient(provider) {
  const cfg = PROVIDERS[provider];
  if (!cfg) throw new Error(`Unknown provider: ${provider}`);

  const apiKey = process.env[cfg.envKey];
  if (!apiKey) throw new Error(`Missing ${cfg.envKey} — add it to your .env file`);

  if (provider === 'claude') {
    return { type: 'anthropic', client: new Anthropic({ apiKey }) };
  }
  return { type: 'openai', client: new OpenAI({ apiKey, baseURL: cfg.baseURL }) };
}

export async function chat({ provider = 'claude', model, system, messages }) {
  const { type, client } = buildClient(provider);
  const cfg = PROVIDERS[provider];
  const resolvedModel = model || cfg.defaultModel;

  if (type === 'anthropic') {
    const res = await client.messages.create({
      model: resolvedModel,
      max_tokens: 1024,
      system,
      messages,
    });
    return res.content[0].text;
  }

  // OpenAI-compatible (covers OpenAI + Grok)
  const res = await client.chat.completions.create({
    model: resolvedModel,
    max_tokens: 1024,
    messages: system ? [{ role: 'system', content: system }, ...messages] : messages,
  });
  return res.choices[0].message.content;
}

export function listProviders() {
  return Object.entries(PROVIDERS).map(([id, cfg]) => ({
    id,
    label: cfg.label,
    models: cfg.models,
    defaultModel: cfg.defaultModel,
    configured: !!process.env[cfg.envKey],
  }));
}
