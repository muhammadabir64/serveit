const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mime = require('mime-types');
const chokidar = require('chokidar');
const { BrowserWindow } = require('electron');
const { settingsStore } = require('./store');

class ServerManager {
  constructor() {
    this.servers = new Map();
  }

  start({ id, folderPath, port, options = {} }) {
    if (this.servers.size >= 10 && !this.servers.has(id)) {
      throw new Error('Maximum 10 servers allowed');
    }

    const existing = this.servers.get(id);
    if (existing?.server?.listening) {
      throw new Error('Server already running');
    }

    const root = path.resolve(folderPath);
    const normalizedOptions = {
      cors: !!options.cors,
      liveReload: !!options.liveReload,
      theme: ['light', 'dark', 'system'].includes(options.theme) ? options.theme : 'system',
      auth: options.auth?.enabled
        ? {
            enabled: true,
            user: String(options.auth.user || ''),
            pass: String(options.auth.pass || ''),
          }
        : { enabled: false, user: '', pass: '' },
    };

    const liveReloadClients = new Set();
    const sockets = new Set();
    let watcher = null;
    const authToken = crypto.randomBytes(24).toString('hex');

    if (normalizedOptions.liveReload) {
      watcher = chokidar.watch(root, { ignoreInitial: true, persistent: true });
      watcher.on('all', () => {
        for (const res of liveReloadClients) {
          if (!res.writableEnded) res.write('data: reload\n\n');
        }
      });
    }

    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        this._handleRequest(req, res, {
          id,
          root,
          options: normalizedOptions,
          liveReloadClients,
          authToken,
        });
      });

      server.on('error', reject);
      server.on('connection', (socket) => {
        sockets.add(socket);
        socket.on('close', () => sockets.delete(socket));
      });

      server.listen(port, '0.0.0.0', () => {
        this.servers.set(id, {
          id,
          folderPath: root,
          port,
          server,
          options: normalizedOptions,
          watcher,
          liveReloadClients,
          sockets,
          authToken,
        });
        resolve({ port });
      });
    });
  }

  async stop(id) {
    const entry = this.servers.get(id);
    if (!entry) return { stopped: false };

    for (const res of entry.liveReloadClients || []) {
      if (!res.writableEnded) res.end();
    }

    if (entry.watcher) {
      await entry.watcher.close();
    }

    for (const socket of entry.sockets || []) {
      socket.destroy();
    }

    await new Promise((resolve) => {
      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        resolve();
      };

      entry.server.close(done);
      setTimeout(done, 1500);
    });

    this.servers.delete(id);
    return { stopped: true };
  }

  async stopAll() {
    const ids = [...this.servers.keys()];
    await Promise.all(ids.map((id) => this.stop(id)));
    return { stoppedIds: ids };
  }

  list() {
    return [...this.servers.values()].map((s) => ({
      id: s.id,
      folderPath: s.folderPath,
      port: s.port,
      name: path.basename(s.folderPath) || s.folderPath,
      options: s.options,
    }));
  }

  _sendLog(id, req, status, bytes) {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win || win.isDestroyed()) return;

    win.webContents.send('server:log', {
      serverId: id,
      time: new Date().toISOString(),
      method: req.method,
      path: req.url,
      status,
      bytes,
    });
  }

  _parsePath(req) {
    try {
      const parsed = new URL(req.url || '/', 'http://localhost');
      return {
        pathname: decodeURIComponent(parsed.pathname || '/'),
        search: parsed.search || '',
      };
    } catch {
      return { pathname: '/', search: '' };
    }
  }

  _parseCookies(cookieHeader) {
    const out = {};
    if (!cookieHeader) return out;
    cookieHeader.split(';').forEach((part) => {
      const idx = part.indexOf('=');
      if (idx === -1) return;
      const key = part.slice(0, idx).trim();
      const value = part.slice(idx + 1).trim();
      out[key] = decodeURIComponent(value);
    });
    return out;
  }

  _isAuthenticated(req, authToken) {
    const cookies = this._parseCookies(req.headers.cookie);
    return cookies.serveit_auth === authToken;
  }

  _sanitizeRedirect(redirectPath) {
    if (!redirectPath || typeof redirectPath !== 'string') return '/';
    if (!redirectPath.startsWith('/') || redirectPath.startsWith('//')) return '/';
    if (redirectPath.startsWith('/__serveit_auth')) return '/';
    return redirectPath;
  }

  _redirect(res, req, id, location, status = 302, headers = {}) {
    res.writeHead(status, { Location: location, ...headers });
    res.end();
    this._sendLog(id, req, status, 0);
  }

  _redirectToLogin(res, req, id, redirectPath, error = '') {
    const safeRedirect = this._sanitizeRedirect(redirectPath);
    const err = error ? `&error=${encodeURIComponent(error)}` : '';
    this._redirect(res, req, id, `/__serveit_auth?redirect=${encodeURIComponent(safeRedirect)}${err}`);
  }

  _handleAuthPost(req, res, context, redirectPath) {
    const { id, options, authToken } = context;
    let body = '';
    let done = false;

    req.on('data', (chunk) => {
      if (done) return;
      body += chunk;
      if (body.length > 16 * 1024) {
        done = true;
        res.writeHead(413, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Payload Too Large');
        this._sendLog(id, req, 413, 0);
      }
    });

    req.on('end', () => {
      if (done) return;
      const params = new URLSearchParams(body);
      const username = (params.get('username') || '').trim();
      const password = (params.get('password') || '').trim();
      const safeRedirect = this._sanitizeRedirect(params.get('redirect') || redirectPath || '/');

      if (!username || !password) {
        this._redirectToLogin(res, req, id, safeRedirect, 'missing');
        return;
      }

      if (username !== options.auth.user || password !== options.auth.pass) {
        this._redirectToLogin(res, req, id, safeRedirect, 'invalid');
        return;
      }

      this._redirect(res, req, id, safeRedirect, 302, {
        'Set-Cookie': `serveit_auth=${encodeURIComponent(authToken)}; HttpOnly; Path=/; SameSite=Lax`,
      });
    });

    req.on('error', () => {
      if (done) return;
      done = true;
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Bad Request');
      this._sendLog(id, req, 400, 0);
    });
  }

  _escapeHTML(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  _resolveTheme(fallback = 'system') {
    const preferred = settingsStore.get('theme');
    return ['light', 'dark', 'system'].includes(preferred) ? preferred : fallback;
  }

  _authHTML({ redirectPath, errorCode, themePref }) {
    const flash = {
      missing: 'Please enter both username and password.',
      invalid: 'Invalid username or password.',
    }[errorCode] || '';

    const safeRedirect = this._escapeHTML(redirectPath);
    const safeFlash = this._escapeHTML(flash);
    const rootClass = themePref === 'dark' ? 'dark' : themePref === 'light' ? 'light' : 'system';

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Authentication required • ServeIt</title>
  <style>
    :root {
      --bg: #f3f4f8;
      --panel: #ffffff;
      --border: #d4d9e2;
      --text: #111827;
      --muted: #6b7280;
      --primary: #2563eb;
      --danger-bg: #fee2e2;
      --danger-text: #991b1b;
      --input: #ffffff;
      --shadow: 0 16px 40px rgba(15, 23, 42, 0.2);
    }
    .dark {
      --bg: #0f172a;
      --panel: #111827;
      --border: #263244;
      --text: #e5e7eb;
      --muted: #9ca3af;
      --primary: #60a5fa;
      --danger-bg: rgba(239, 68, 68, 0.2);
      --danger-text: #fecaca;
      --input: #0b1220;
      --shadow: 0 18px 42px rgba(2, 6, 23, 0.55);
    }
    @media (prefers-color-scheme: dark) {
      .system {
        --bg: #0f172a;
        --panel: #111827;
        --border: #263244;
        --text: #e5e7eb;
        --muted: #9ca3af;
        --primary: #60a5fa;
        --danger-bg: rgba(239, 68, 68, 0.2);
        --danger-text: #fecaca;
        --input: #0b1220;
        --shadow: 0 18px 42px rgba(2, 6, 23, 0.55);
      }
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: Inter, system-ui, -apple-system, sans-serif;
      background: radial-gradient(circle at top, rgba(37,99,235,0.18), transparent 45%), var(--bg);
      color: var(--text);
      padding: 24px;
    }
    .card {
      width: min(420px, 100%);
      border: 1px solid var(--border);
      background: var(--panel);
      border-radius: 14px;
      padding: 20px;
      box-shadow: var(--shadow);
    }
    h1 { margin: 0 0 14px; font-size: 1.15rem; }
    .flash {
      display: ${safeFlash ? 'block' : 'none'};
      margin-bottom: 12px;
      border: 1px solid transparent;
      background: var(--danger-bg);
      color: var(--danger-text);
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 0.88rem;
    }
    label { display: block; margin: 10px 0 6px; font-size: 0.85rem; font-weight: 600; }
    input {
      width: 100%;
      border: 1px solid var(--border);
      border-radius: 9px;
      background: var(--input);
      color: var(--text);
      padding: 10px 12px;
      outline: none;
      font-size: 0.95rem;
    }
    input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 20%, transparent); }
    .error { min-height: 18px; margin-top: 8px; color: var(--danger-text); font-size: 0.82rem; }
    .actions { margin-top: 16px; display: flex; justify-content: center; }
    button {
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text);
      padding: 9px 14px;
      border-radius: 9px;
      font-weight: 600;
      cursor: pointer;
    }
    button[type="submit"] {
      min-width: 160px;
      background: var(--primary);
      border-color: var(--primary);
      color: #fff;
    }
    button:hover { opacity: 0.92; }
  </style>
</head>
<body class="${rootClass}">
  <form class="card" method="post" action="/__serveit_auth" id="auth-form" novalidate>
    <h1>Authentication required</h1>
    <div class="flash" id="flash">${safeFlash}</div>
    <input type="hidden" name="redirect" value="${safeRedirect}" />

    <label for="username">Username</label>
    <input id="username" name="username" autocomplete="username" maxlength="64" required />

    <label for="password">Password</label>
    <input id="password" name="password" type="password" autocomplete="current-password" maxlength="128" required />

    <div class="error" id="form-error"></div>

    <div class="actions">
      <button type="submit">Authenticate</button>
    </div>
  </form>

  <script>
    const form = document.getElementById('auth-form');
    const errorEl = document.getElementById('form-error');
    const userEl = document.getElementById('username');
    const passEl = document.getElementById('password');

    form.addEventListener('submit', (event) => {
      const u = userEl.value.trim();
      const p = passEl.value.trim();
      if (!u || !p) {
        event.preventDefault();
        errorEl.textContent = 'Please enter both username and password.';
        if (!u) userEl.focus();
        else passEl.focus();
      }
    });
  </script>
</body>
</html>`;
  }

  _handleRequest(req, res, context) {
    const { id, root, options, liveReloadClients } = context;

    if (options.cors) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        this._sendLog(id, req, 204, 0);
        return;
      }
    }

    const { pathname, search } = this._parsePath(req);

    if (options.liveReload && pathname === '/__livereload') {
      if (options.auth?.enabled && !this._isAuthenticated(req, context.authToken)) {
        this._redirectToLogin(res, req, id, `${pathname}${search}`);
        return;
      }

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
      });
      res.write('data: connected\n\n');
      liveReloadClients.add(res);
      req.on('close', () => {
        liveReloadClients.delete(res);
      });
      return;
    }

    if (options.auth?.enabled) {
      if (pathname === '/__serveit_auth' && req.method === 'GET') {
        const parsed = new URL(req.url || '/__serveit_auth', 'http://localhost');
        const redirectPath = this._sanitizeRedirect(parsed.searchParams.get('redirect') || '/');
        const errorCode = parsed.searchParams.get('error') || '';
        const themePref = this._resolveTheme(options.theme);
        const html = this._authHTML({ redirectPath, errorCode, themePref });
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        this._sendLog(id, req, 200, Buffer.byteLength(html));
        return;
      }

      if (pathname === '/__serveit_auth' && req.method === 'POST') {
        this._handleAuthPost(req, res, context, '/');
        return;
      }

      if (!this._isAuthenticated(req, context.authToken)) {
        this._redirectToLogin(res, req, id, `${pathname}${search}`);
        return;
      }
    }

    const reqPath = pathname;
    const safeRoot = path.normalize(root);
    const resolved = path.normalize(path.join(safeRoot, reqPath));

    if (!resolved.startsWith(safeRoot)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      this._sendLog(id, req, 403, 0);
      return;
    }

    fs.stat(resolved, (err, stat) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        const html = this._404(reqPath, this._resolveTheme(options.theme));
        res.end(html);
        this._sendLog(id, req, 404, 0);
        return;
      }

      if (stat.isDirectory()) {
        const indexPath = path.join(resolved, 'index.html');
        fs.stat(indexPath, (idxErr, idxStat) => {
          if (idxErr || !idxStat.isFile()) {
            this._serveDir(res, resolved, root, reqPath, id, req, options);
            return;
          }
          this._serveFile(indexPath, req, res, id, options);
        });
        return;
      }

      this._serveFile(resolved, req, res, id, options);
    });
  }

  _liveReloadScript() {
    return "<script>const es=new EventSource('/__livereload');es.onmessage=(e)=>{if(e.data==='reload')location.reload();};</script>";
  }

  _injectLiveReload(html, options = {}) {
    if (!options.liveReload) return html;
    const script = this._liveReloadScript();
    return html.includes('</body>') ? html.replace('</body>', `${script}</body>`) : `${html}${script}`;
  }

  _serveFile(filePath, req, res, id, options) {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
        this._sendLog(id, req, 500, 0);
        return;
      }

      const mimeType = mime.lookup(filePath) || 'application/octet-stream';
      let content = data;

      if (options.liveReload && mimeType === 'text/html') {
        const raw = content.toString();
        const injected = this._injectLiveReload(raw, options);
        content = Buffer.from(injected);
      }

      res.writeHead(200, {
        'Content-Type': mimeType,
        'Content-Length': content.length,
      });
      res.end(content);
      this._sendLog(id, req, 200, content.length);
    });
  }

  _serveDir(res, dirPath, basePath, urlPath, id, req, options = {}) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const html = this._injectLiveReload(
      this._dirHTML(entries, dirPath, basePath, urlPath, this._resolveTheme(options.theme)),
      options,
    );
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    this._sendLog(id, req, 200, Buffer.byteLength(html));
  }


  _dirHTML(entries, dirPath, basePath, urlPath, themePref = 'system') {
    const icon = (entry) => {
      if (entry.isDirectory()) return '📁';
      const ext = path.extname(entry.name).toLowerCase();
      return ({ '.html': '🌐', '.css': '🎨', '.js': '⚡', '.json': '📋', '.png': '🖼️', '.jpg': '🖼️', '.jpeg': '🖼️', '.pdf': '📄', '.zip': '🗜️', '.mp4': '🎬', '.mp3': '🎵' })[ext] || '📄';
    };

    const fmt = (bytes) => {
      if (bytes < 1024) return `${bytes}B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    };

    const rows = entries
      .map((entry) => {
        const absolute = path.join(dirPath, entry.name);
        const st = fs.statSync(absolute);
        const href = `${urlPath.replace(/\/$/, '')}/${entry.name}${entry.isDirectory() ? '/' : ''}` || '/';
        return `<tr><td>${icon(entry)}</td><td><a href="${href}">${entry.name}${entry.isDirectory() ? '/' : ''}</a></td><td>${entry.isDirectory() ? '—' : fmt(st.size)}</td><td>${st.mtime.toLocaleString()}</td></tr>`;
      })
      .join('');

    const rel = path.relative(basePath, dirPath);
    const crumbs = ['<a href="/">root</a>']
      .concat(
        rel
          .split(path.sep)
          .filter(Boolean)
          .map((part, i, arr) => {
            const href = `/${arr.slice(0, i + 1).join('/')}/`;
            return `<a href="${href}">${part}</a>`;
          }),
      )
      .join(' / ');

    const rootClass = themePref === 'dark' ? 'dark' : themePref === 'light' ? 'light' : 'system';

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Index of ${urlPath}</title>
<style>
:root{--bg:#f8fafc;--card:#ffffff;--border:#dbe2ea;--text:#0f172a;--muted:#64748b;--link:#0f766e}
.dark{--bg:#0b1220;--card:#111827;--border:#223046;--text:#e2e8f0;--muted:#94a3b8;--link:#6ee7b7}
@media (prefers-color-scheme: dark){.system{--bg:#0b1220;--card:#111827;--border:#223046;--text:#e2e8f0;--muted:#94a3b8;--link:#6ee7b7}}
*{box-sizing:border-box}body{font-family:Inter,system-ui;max-width:1000px;margin:32px auto;padding:0 20px;background:var(--bg);color:var(--text)}
h1{font-size:1.1rem;font-weight:600;margin:0 0 8px}.crumbs{font-size:.85rem;color:var(--muted);margin-bottom:16px}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--border);border-radius:10px;overflow:hidden}
th,td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--border)}th{font-size:.75rem;text-transform:uppercase;color:var(--muted)}
a{color:var(--link);text-decoration:none}a:hover{text-decoration:underline}
</style></head><body class="${rootClass}"><h1>📂 Index of ${urlPath}</h1><div class="crumbs">${crumbs}</div><table><thead><tr><th></th><th>Name</th><th>Size</th><th>Modified</th></tr></thead><tbody>${urlPath !== '/' ? '<tr><td>⬆️</td><td><a href="../">Parent Directory</a></td><td>—</td><td>—</td></tr>' : ''}${rows}</tbody></table></body></html>`;
  }

  _404(urlPath, themePref = 'system') {
    const rootClass = themePref === 'dark' ? 'dark' : themePref === 'light' ? 'light' : 'system';
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>:root{--bg:#f8fafc;--text:#0f172a;--muted:#64748b;--link:#0f766e}.dark{--bg:#0b1220;--text:#e2e8f0;--muted:#94a3b8;--link:#6ee7b7}@media (prefers-color-scheme: dark){.system{--bg:#0b1220;--text:#e2e8f0;--muted:#94a3b8;--link:#6ee7b7}}body{margin:0;font-family:Inter,system-ui;text-align:center;padding:56px;background:var(--bg);color:var(--text)}a{color:var(--link)}</style></head><body class="${rootClass}"><h1 style="font-size:3rem;margin:0">404</h1><p style="color:var(--muted)">${urlPath} not found</p><a href="/">Back to index</a></body></html>`;
  }
}

module.exports = new ServerManager();
