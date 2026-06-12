const ARKOSE_CONFIG = {
  PUBLIC_KEY: 'EEA5F558-D6AC-4C03-B678-AABF639EE69A',
  BASE_URL: 'https://a-cdn.claude.ai',
  BUILD_ID: '37965111-f202-48f7-80e6-5bc6c82d268e',
  CAPI_VERSION: '4.2.2',
  SITE: 'https://claude.ai',
};

class ArkoseError extends Error {
  constructor(message, code = 'ARKOSE_ERROR') {
    super(message);
    this.name = 'ArkoseError';
    this.code = code;
  }
}

async function _arkoseHttps(options, body) {
  const res = await fetch(options.url, {
    method: options.method || 'GET',
    headers: options.headers || {},
    body: body,
  });
  const raw = await res.text();
  let json = null;
  try { json = JSON.parse(raw); } catch {}
  return {
    status: res.status,
    headers: Object.fromEntries(res.headers.entries()),
    raw,
    json,
  };
}

function _generateArkosePayload() {
  const r = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  };
  return `${r()}==${r()}==${r()}==${r()}`;
}

export async function getArkoseToken({
  publicKey = ARKOSE_CONFIG.PUBLIC_KEY,
  baseUrl = ARKOSE_CONFIG.BASE_URL,
} = {}) {
  const UA_ARK = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36';
  const esyncValue = String(Math.floor(Date.now() / 1000) - 100000);

  const params = new URLSearchParams();
  params.append('c', _generateArkosePayload());
  params.append('public_key', publicKey);
  params.append('site', ARKOSE_CONFIG.SITE);
  params.append('userbrowser', UA_ARK);
  params.append('capi_version', ARKOSE_CONFIG.CAPI_VERSION);
  params.append('capi_mode', 'lightbox');
  params.append('style_theme', 'default');
  params.append('rnd', Math.random().toString());
  const body = params.toString();

  const headers = {
    'authority': 'a-cdn.claude.ai',
    'accept': '*/*',
    'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'ark-build-id': ARKOSE_CONFIG.BUILD_ID,
    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'origin': 'https://claude.ai',
    'referer': 'https://claude.ai/',
    'sec-ch-ua': '"Chromium";v="137", "Not/A)Brand";v="24"',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"Android"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'user-agent': UA_ARK,
    'x-ark-esync-value': esyncValue,
  };

  const res = await _arkoseHttps({
    url: `${baseUrl}/fc/gt2/public_key/${publicKey}`,
    method: 'POST',
    headers,
  }, body);

  if (!res.json) throw new ArkoseError(`Invalid response: ${res.raw.slice(0, 200)}`, 'INVALID_RESPONSE');
  if (res.json.token) return res.json.token;
  if (res.json.challenge_url_cdn) {
    throw new ArkoseError(
      'Arkose requires visual challenge solving. Implement game solver or use external service (CapSolver, 2Captcha).',
      'VISUAL_CHALLENGE_REQUIRED'
    );
  }
  throw new ArkoseError('Unknown response format', 'UNKNOWN_RESPONSE');
}

const BASE_URL = 'https://claude.ai';

const API = {
  SEND_MAGIC_LINK: '/api/auth/send_magic_link',
  VERIFY_MAGIC_LINK: '/api/auth/verify_magic_link',
  LOGOUT: '/api/auth/logout',
  ORG: (orgId) => `/api/organizations/${orgId}`,
  CONVERSATIONS: (orgId) => `/api/organizations/${orgId}/chat_conversations`,
  CONVERSATION: (orgId, convId) => `/api/organizations/${orgId}/chat_conversations/${convId}`,
  COMPLETION: (orgId, convId) => `/api/organizations/${orgId}/chat_conversations/${convId}/completion`,
  UPLOAD_FILE: (orgId, convId) => `/api/organizations/${orgId}/conversations/${convId}/wiggle/upload-file`,
};

const CLIENT_SHA = 'e6d5ac949ef7d8040d371aa4d26d342f240308cb';
const CLIENT_VERSION = '1.0.0';
const CLIENT_PLATFORM = 'web_claude_ai';
const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36';

const cookies = new Map();

function setCookies(cookieHeader) {
  if (!cookieHeader) return;
  const arr = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader];
  for (const c of arr) {
    const [pair] = c.split(';');
    const idx = pair.indexOf('=');
    if (idx < 0) continue;
    const name = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1);
    if (name) cookies.set(name, val ?? '');
  }
}

function serializeCookies() {
  return [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

const state = {
  anonymousId: `claudeai.v1.${crypto.randomUUID()}`,
  deviceId: crypto.randomUUID(),
  activitySessionId: crypto.randomUUID(),
};

function generateTraceHeaders() {
  const hex = (n) => {
    const arr = new Uint8Array(n);
    crypto.getRandomValues(arr);
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
  };
  return {
    'traceparent': `00-0000000000000000${hex(8)}-${hex(8)}-01`,
    'tracestate': 'dd=s:1;o:rum',
    'x-datadog-origin': 'rum',
    'x-datadog-parent-id': String(Date.now()),
    'x-datadog-sampling-priority': '1',
    'x-datadog-trace-id': String(Date.now()),
  };
}

function buildHeaders(extra = {}) {
  const h = {
    'authority': 'claude.ai',
    'accept': '*/*',
    'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'anthropic-anonymous-id': state.anonymousId,
    'anthropic-client-platform': CLIENT_PLATFORM,
    'anthropic-client-sha': CLIENT_SHA,
    'anthropic-client-version': CLIENT_VERSION,
    'anthropic-device-id': state.deviceId,
    'content-type': 'application/json',
    'origin': BASE_URL,
    'referer': `${BASE_URL}/`,
    'sec-ch-ua': '"Chromium";v="137", "Not/A)Brand";v="24"',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"Android"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': UA,
    'x-activity-session-id': state.activitySessionId,
    ...generateTraceHeaders(),
  };
  const c = serializeCookies();
  if (c) h['Cookie'] = c;
  return Object.assign(h, extra);
}

class ClaudeError extends Error {
  constructor(message, code = 'UNKNOWN', data = null) {
    super(message);
    this.name = 'ClaudeError';
    this.code = code;
    this.data = data;
  }
}

async function request(method, urlPath, { body, headers: extraHeaders = {} } = {}) {
  const headers = buildHeaders(extraHeaders);
  const url = `${BASE_URL}${urlPath}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });
  const setCookieHeader = res.headers.get('set-cookie');
  if (setCookieHeader) setCookies(setCookieHeader);
  const raw = await res.text();
  let parsed;
  try { parsed = JSON.parse(raw); } catch { parsed = { raw, _status: res.status }; }
  return { ...parsed, _status: res.status };
}

async function streamRequest(urlPath, body, extraHeaders = {}) {
  const headers = buildHeaders({
    'accept': 'text/event-stream',
    'Content-Type': 'application/json',
    ...extraHeaders,
  });
  const url = `${BASE_URL}${urlPath}`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const setCookieHeader = res.headers.get('set-cookie');
  if (setCookieHeader) setCookies(setCookieHeader);
  if (res.status >= 400) {
    const errData = await res.text();
    throw new ClaudeError(`HTTP ${res.status}: ${errData.slice(0, 300)}`, `HTTP_${res.status}`);
  }
  return res.body;
}

async function parseSSE(stream, onChunk) {
  const reader = stream.getReader();
  const decoder = new TextDecoder('utf8');
  let buffer = '';
  let fullText = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (!raw || raw === '[DONE]') continue;
      let evt;
      try { evt = JSON.parse(raw); } catch { continue; }
      if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
        const text = evt.delta.text || '';
        fullText += text;
        if (onChunk) onChunk(text);
      }
      if (evt.type === 'error') {
        throw new ClaudeError(`Stream error: ${JSON.stringify(evt.error)}`, 'STREAM_ERROR');
      }
    }
  }
  return fullText;
}

export class ClaudeClient {
  constructor({ utcOffset = -420, locale = 'id-ID', model = 'claude-sonnet-4-6' } = {}) {
    this._utcOffset = utcOffset;
    this._locale = locale;
    this._model = model;
    this._authenticated = false;
    this._account = null;
    this._orgId = null;
    this._conversations = new Map();
  }

  async sendMagicLink(email) {
    const res = await request('POST', API.SEND_MAGIC_LINK, {
      body: {
        utc_offset: this._utcOffset,
        email_address: email,
        login_intent: null,
        locale: this._locale,
        return_to: null,
        source: 'claude',
      },
    });
    if (!res.sent) throw new ClaudeError('Failed to send magic link', 'SEND_FAILED', res);
    this._codeConfig = res.fallback_code_configuration;
    return res;
  }

  async verifyMagicLink(email, code) {
    const arkoseToken = await getArkoseToken();
    const res = await request('POST', API.VERIFY_MAGIC_LINK, {
      body: {
        credentials: {
          method: 'code',
          email_address: email,
          code: String(code),
        },
        locale: this._locale,
        arkose_session_token: arkoseToken,
        source: 'claude',
      },
    });
    if (!res.success) throw new ClaudeError('Verification failed', 'VERIFY_FAILED', res);
    this._authenticated = true;
    this._account = res.account;
    const chatOrg = (res.account.memberships || []).find(m =>
      m.organization.capabilities?.includes('chat')
    );
    if (chatOrg) {
      this._orgId = chatOrg.organization.uuid;
    } else if (res.account.memberships?.length > 0) {
      this._orgId = res.account.memberships[0].organization.uuid;
    }
    return {
      success: true,
      account: res.account,
      organizations: (res.account.memberships || []).map(m => ({
        id: m.organization.uuid,
        uuid: m.organization.uuid,
        name: m.organization.name,
        capabilities: m.organization.capabilities,
        role: m.role,
        rate_limit_tier: m.organization.rate_limit_tier,
        api_disabled_reason: m.organization.api_disabled_reason,
        created_at: m.created_at,
        updated_at: m.updated_at,
        settings: m.organization.settings,
      })),
      activeOrgId: this._orgId,
    };
  }

  async login(email, onCodeRequested) {
    const sendResult = await this.sendMagicLink(email);
    if (onCodeRequested) {
      onCodeRequested({
        email,
        codeLength: sendResult.fallback_code_configuration?.length || 6,
        charset: sendResult.fallback_code_configuration?.charset || 'numeric',
      });
    }
    return {
      sendResult,
      verify: (code) => this.verifyMagicLink(email, code),
    };
  }

  async loginWithCode(email, code) {
    await this.sendMagicLink(email);
    return this.verifyMagicLink(email, code);
  }

  async logout() {
    if (this._authenticated) {
      await request('POST', API.LOGOUT).catch(() => {});
    }
    this._authenticated = false;
    this._account = null;
    this._orgId = null;
    cookies.clear();
  }

  get isAuthenticated() { return this._authenticated; }
  get account() { return this._account; }
  get activeOrgId() { return this._orgId; }

  setActiveOrg(orgUuid) {
    const found = this._account?.memberships?.some(m => m.organization.uuid === orgUuid);
    if (!found) throw new ClaudeError('Organization not found in your account', 'ORG_NOT_FOUND');
    this._orgId = orgUuid;
  }

  async getOrg(orgId) {
    const id = orgId || this._orgId;
    if (!id) throw new ClaudeError('No organization selected', 'NO_ORG');
    return request('GET', API.ORG(id));
  }

  async getConversations() {
    if (!this._orgId) throw new ClaudeError('No organization selected', 'NO_ORG');
    return request('GET', API.CONVERSATIONS(this._orgId), {
      headers: { 'accept': 'application/json' },
    });
  }

  async getConversation(conversationId) {
    if (!this._orgId) throw new ClaudeError('No organization selected', 'NO_ORG');
    return request('GET', API.CONVERSATION(this._orgId, conversationId), {
      headers: { 'accept': 'application/json' },
    });
  }

  async createConversation(name = '') {
    if (!this._orgId) throw new ClaudeError('No organization selected', 'NO_ORG');
    const res = await request('POST', API.CONVERSATIONS(this._orgId), {
      body: { name, model: this._model },
      headers: { 'accept': 'application/json' },
    });
    if (!res.uuid) throw new ClaudeError('Failed to create conversation', 'CREATE_FAILED', res);
    this._conversations.set(res.uuid, { name });
    return res.uuid;
  }

  async sendMessage(conversationId, prompt, {
    onChunk,
    newConv = false,
    files = [],
    parentMsgUUID,
    thinkingMode,
  } = {}) {
    if (!this._orgId) throw new ClaudeError('No organization selected', 'NO_ORG');
    const humanUUID = crypto.randomUUID();
    const assistantUUID = crypto.randomUUID();
    const body = {
      prompt,
      timezone: 'Asia/Jakarta',
      locale: this._locale,
      model: this._model,
      personalized_styles: [{
        type: 'default', key: 'Default', name: 'Normal',
        nameKey: 'normal_style_name', prompt: 'Normal\n',
        summary: 'Default responses from Claude',
        summaryKey: 'normal_style_summary', isDefault: true,
      }],
      tools: [
        { type: 'web_search_v0', name: 'web_search' },
        { type: 'artifacts_v0', name: 'artifacts' },
        { type: 'repl_v0', name: 'repl' },
      ],
      turn_message_uuids: {
        human_message_uuid: humanUUID,
        assistant_message_uuid: assistantUUID,
      },
      attachments: [],
      files,
      sync_sources: [],
      rendering_mode: 'messages',
    };
    if (parentMsgUUID) body.parent_message_uuid = parentMsgUUID;
    if (thinkingMode) body.thinking_mode = thinkingMode;
    if (newConv) {
      body.create_conversation_params = {
        name: '', model: this._model,
        include_conversation_preferences: true,
        is_temporary: false,
      };
    }
    const stream = await streamRequest(
      API.COMPLETION(this._orgId, conversationId),
      body,
      { referer: `${BASE_URL}/chat/${conversationId}` }
    );
    const text = await parseSSE(stream, onChunk);
    return { text, assistantUUID, humanUUID };
  }

  async chat(prompt, { onChunk, files = [] } = {}) {
    const conversationId = await this.createConversation();
    const { text, assistantUUID, humanUUID } = await this.sendMessage(
      conversationId, prompt, { onChunk, newConv: true, files }
    );
    return { conversationId, text, assistantUUID, humanUUID };
  }

  async continueChat(conversationId, prompt, { onChunk, parentMsgUUID, files = [] } = {}) {
    return this.sendMessage(conversationId, prompt, { onChunk, parentMsgUUID, files });
  }
                                                            }
