import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { loadSettings } from '../settings.js';
import { getValidAccessToken } from '../grok-oauth.js';

const PROVIDERS = {
  claude: {
    label: 'Claude (Anthropic)',
    envKey: 'ANTHROPIC_API_KEY',
    settingsKey: 'claude',
    models: ['claude-sonnet-4-6', 'claude-opus-4-7', 'claude-haiku-4-5-20251001'],
    defaultModel: 'claude-sonnet-4-6',
  },
  openai: {
    label: 'GPT-4o (OpenAI)',
    envKey: 'OPENAI_API_KEY',
    settingsKey: 'openai',
    models: ['gpt-4o', 'gpt-4o-mini', 'o3'],
    defaultModel: 'gpt-4o',
    baseURL: 'https://api.openai.com/v1',
  },
  grok: {
    label: 'Grok (xAI)',
    envKey: 'XAI_API_KEY',
    settingsKey: 'grok',
    models: ['grok-4', 'grok-3', 'grok-3-mini'],
    defaultModel: 'grok-4',
    baseURL: 'https://api.x.ai/v1',
  },
  deepseek: {
    label: 'DeepSeek',
    envKey: 'DEEPSEEK_API_KEY',
    settingsKey: 'deepseek',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    defaultModel: 'deepseek-chat',
    baseURL: 'https://api.deepseek.com/v1',
  },
};

async function buildClient(provider) {
  const cfg = PROVIDERS[provider];
  if (!cfg) throw new Error(`Unknown provider: ${provider}`);

  if (provider === 'claude') {
    const settings = loadSettings();
    const apiKey = settings.apiKeys?.claude || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('Missing Anthropic API key — add it in Settings');
    return { type: 'anthropic', client: new Anthropic({ apiKey }) };
  }

  if (provider === 'grok') {
    // OAuth takes priority — uses user's SuperGrok/X Premium+ subscription
    const oauthToken = await getValidAccessToken();
    if (oauthToken) {
      return {
        type: 'openai',
        client: new OpenAI({ apiKey: oauthToken, baseURL: 'https://api.x.ai/v1' }),
      };
    }
    // Fall back to API key
    const settings = loadSettings();
    const apiKey = settings.apiKeys?.grok || process.env.XAI_API_KEY;
    if (!apiKey) throw new Error('Grok not connected — use "Connect SuperGrok" in Settings or add XAI_API_KEY');
    return { type: 'openai', client: new OpenAI({ apiKey, baseURL: 'https://api.x.ai/v1' }) };
  }

  // OpenAI / DeepSeek — API key only
  const settings = loadSettings();
  const apiKey = settings.apiKeys?.[cfg.settingsKey] || process.env[cfg.envKey];
  if (!apiKey) throw new Error(`Missing API key for ${cfg.label} — add it in Settings or set ${cfg.envKey} in .env`);
  return { type: 'openai', client: new OpenAI({ apiKey, baseURL: cfg.baseURL }) };
}

export async function chat({ provider = 'claude', model, system, messages }) {
  const { type, client } = await buildClient(provider);
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
