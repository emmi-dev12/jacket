import { createHash, randomBytes } from 'crypto';
import { loadSettings, saveSettings } from './settings.js';

// xAI OAuth endpoints
const XAI_AUTH_URL = 'https://accounts.x.ai/oauth2/authorize';
const XAI_TOKEN_URL = 'https://accounts.x.ai/oauth2/token';
const XAI_SCOPES = 'inference:all offline_access';

// Your registered xAI OAuth app client ID.
// Register at: https://console.x.ai → OAuth Apps
// Set XAI_CLIENT_ID in .env or settings.
function getClientId() {
  return process.env.XAI_CLIENT_ID || loadSettings().xaiClientId || null;
}

// PKCE helpers — no client secret needed for public/local apps
function generateVerifier() {
  return randomBytes(32).toString('base64url');
}

function generateChallenge(verifier) {
  return createHash('sha256').update(verifier).digest('base64url');
}

// Build the authorization URL the user visits in their browser
export function buildAuthURL(port = 3141) {
  const clientId = getClientId();
  if (!clientId) throw new Error('XAI_CLIENT_ID not set — register your app at console.x.ai first');

  const verifier = generateVerifier();
  const challenge = generateChallenge(verifier);
  const state = randomBytes(16).toString('hex');
  const redirectUri = `http://localhost:${port}/auth/grok/callback`;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: XAI_SCOPES,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  return {
    url: `${XAI_AUTH_URL}?${params}`,
    verifier,
    state,
    redirectUri,
  };
}

// Exchange auth code for tokens
export async function exchangeCode({ code, verifier, redirectUri }) {
  const clientId = getClientId();
  const res = await fetch(XAI_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  const tokens = await res.json();
  storeTokens(tokens);
  return tokens;
}

// Refresh access token using refresh token
export async function refreshAccessToken() {
  const settings = loadSettings();
  const refreshToken = settings.grokOAuth?.refreshToken;
  if (!refreshToken) throw new Error('No refresh token stored — reconnect Grok');

  const clientId = getClientId();
  const res = await fetch(XAI_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) throw new Error('Token refresh failed — reconnect Grok');
  const tokens = await res.json();
  storeTokens(tokens);
  return tokens;
}

function storeTokens(tokens) {
  const settings = loadSettings();
  settings.grokOAuth = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || settings.grokOAuth?.refreshToken,
    expiresAt: Date.now() + (tokens.expires_in || 3600) * 1000,
    tokenType: tokens.token_type || 'Bearer',
  };
  saveSettings(settings);
}

// Returns a valid access token, refreshing if needed
export async function getValidAccessToken() {
  const settings = loadSettings();
  const oauth = settings.grokOAuth;
  if (!oauth?.accessToken) return null;

  // Refresh if expiring in < 5 minutes
  if (oauth.expiresAt && Date.now() > oauth.expiresAt - 5 * 60 * 1000) {
    try {
      const refreshed = await refreshAccessToken();
      return refreshed.access_token;
    } catch {
      return null; // fall through to API key
    }
  }

  return oauth.accessToken;
}

export function isGrokOAuthConnected() {
  const settings = loadSettings();
  return !!settings.grokOAuth?.accessToken;
}

export function disconnectGrokOAuth() {
  const settings = loadSettings();
  delete settings.grokOAuth;
  saveSettings(settings);
}
