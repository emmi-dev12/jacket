import { createHash, randomBytes } from 'crypto';
import { createServer } from 'http';
import { loadSettings, saveSettings } from './settings.js';

// Real xAI OAuth endpoints (discovered from auth.x.ai/.well-known/openid-configuration)
const XAI_AUTH_URL = 'https://auth.x.ai/oauth2/authorize';
const XAI_TOKEN_URL = 'https://auth.x.ai/oauth2/token';

// Public PKCE client — same flow used by Hermes Agent and OpenClaw.
// xAI issues a public client_id for desktop/local apps via OIDC discovery.
// No registration required — this is a public OAuth client.
const XAI_CLIENT_ID = 'jacket-ai';

// Scopes matching what Hermes Agent uses for SuperGrok access
const XAI_SCOPES = 'openid profile email offline_access grok-cli:access api:access';

// NOTE: xAI currently gates OAuth inference to SuperGrok Heavy tier only.
// Standard SuperGrok ($30/mo) returns HTTP 403. X Premium+ may also 403.
// Fallback to API key if OAuth returns 403.

function generateVerifier() {
  return randomBytes(32).toString('base64url');
}

function generateChallenge(verifier) {
  return createHash('sha256').update(verifier).digest('base64url');
}

// Spins up a temporary loopback server to catch the OAuth callback
// Returns a promise that resolves with { code, state }
function waitForCallback(port) {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, `http://127.0.0.1:${port}`);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      res.writeHead(200, { 'Content-Type': 'text/html' });
      if (error) {
        res.end(callbackPage('error', `xAI denied access: ${error}`));
        server.close();
        reject(new Error(`OAuth denied: ${error}`));
        return;
      }
      res.end(callbackPage('success', 'SuperGrok connected. You can close this tab.'));
      server.close();
      resolve({ code, state });
    });

    server.listen(port, '127.0.0.1', () => {});
    server.on('error', reject);

    // Timeout after 5 minutes
    setTimeout(() => { server.close(); reject(new Error('OAuth timeout — try again')); }, 5 * 60 * 1000);
  });
}

// Find a free port starting from 56121 (matches Hermes convention)
async function getFreePort(start = 56121) {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(start, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', () => resolve(getFreePort(start + 1)));
  });
}

// Full OAuth flow — returns access token when done
export async function runOAuthFlow() {
  const port = await getFreePort();
  const redirectUri = `http://127.0.0.1:${port}/callback`;
  const verifier = generateVerifier();
  const challenge = generateChallenge(verifier);
  const state = randomBytes(16).toString('hex');
  const nonce = randomBytes(16).toString('hex');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: XAI_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: XAI_SCOPES,
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    referrer: 'jacket-ai',
  });

  const authURL = `${XAI_AUTH_URL}?${params}`;

  // Start callback listener before opening browser
  const callbackPromise = waitForCallback(port);

  return { authURL, callbackPromise: callbackPromise.then(({ code, state: returnedState }) => {
    if (returnedState !== state) throw new Error('OAuth state mismatch — possible CSRF');
    return exchangeCode({ code, verifier, redirectUri });
  })};
}

async function exchangeCode({ code, verifier, redirectUri }) {
  const res = await fetch(XAI_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: XAI_CLIENT_ID,
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

export async function refreshAccessToken() {
  const settings = loadSettings();
  const refreshToken = settings.grokOAuth?.refreshToken;
  if (!refreshToken) throw new Error('No refresh token — reconnect Grok');

  const res = await fetch(XAI_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: XAI_CLIENT_ID,
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
  };
  saveSettings(settings);
}

export async function getValidAccessToken() {
  const settings = loadSettings();
  const oauth = settings.grokOAuth;
  if (!oauth?.accessToken) return null;
  if (oauth.expiresAt && Date.now() > oauth.expiresAt - 5 * 60 * 1000) {
    try { const r = await refreshAccessToken(); return r.access_token; }
    catch { return null; }
  }
  return oauth.accessToken;
}

export function isGrokOAuthConnected() {
  return !!loadSettings().grokOAuth?.accessToken;
}

export function disconnectGrokOAuth() {
  const settings = loadSettings();
  delete settings.grokOAuth;
  saveSettings(settings);
}

function callbackPage(status, message) {
  const color = status === 'success' ? '#F5C400' : '#FF4444';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Jacket</title>
<style>body{background:#080808;color:#F0EDE8;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px;margin:0}
.mark{font-size:36px;color:${color}}.msg{font-size:12px;color:#555;max-width:340px;text-align:center;line-height:1.6}</style></head>
<body><div class="mark">${status === 'success' ? '◆' : '✕'}</div>
<div style="font-family:monospace;font-size:14px;letter-spacing:.2em;color:${color}">JACKET</div>
<div class="msg">${message}${status === 'success' ? '<br><br>Returning to Studio...' : ''}</div>
${status === 'success' ? '<script>setTimeout(()=>window.close(),1500)</script>' : ''}
</body></html>`;
}
