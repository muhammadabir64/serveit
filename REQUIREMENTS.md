# ServeIt — Complete Project Requirements
> Serve any folder over HTTP in one click. Tiny, fast, beautiful.
> Built with Electron + Node.js. Ships as a standalone installer — no runtime needed.

---

## 1. Project Overview

| Field | Value |
|---|---|
| **App Name** | ServeIt |
| **Tagline** | Serve any folder in one click |
| **Version** | 1.0.0 |
| **License** | GPL v3 |
| **Platforms** | Windows 10/11, Ubuntu/Debian Linux |
| **Distribution** | GitHub Releases (auto-built via GitHub Actions) |
| **Landing Page** | GitHub Pages (`/docs` folder) |

### What It Does
Right-click any folder → "Serve with ServeIt" → instant localhost HTTP server.
No terminal. No commands. Just works.

---

## 2. Tech Stack (Final — Do Not Change)

| Layer | Technology | Reason |
|---|---|---|
| App framework | **Electron v33** | Cross-platform, bundles Node.js runtime |
| Frontend UI | **React 18 + Vite** | Modern, fast, great ecosystem |
| Styling | **Tailwind CSS v3** | Utility-first, consistent design |
| Icons | **Lucide React** | Clean, consistent icon set |
| HTTP Server | **Node.js `http` module** | Built-in, zero dependency |
| File watching | **chokidar** | Live reload support |
| MIME types | **mime-types** | Correct content-type headers |
| QR Code | **qrcode** | LAN mobile access |
| Packaging | **electron-builder** | Builds .exe and .deb/.AppImage |
| Auto-update | **electron-updater** | GitHub Releases based auto-update |
| Persistence | **electron-store** | Settings + history storage |

### Bundling — No Runtime Required
electron-builder bundles the full Electron runtime (Chromium + Node.js) into:
- **Windows:** Single `.exe` NSIS installer (~90MB)
- **Linux:** `.deb` package + `.AppImage` (~85MB)

User downloads, installs, and uses. Zero dependencies. Zero setup.

---

## 3. UI Design Requirements

### 3.1 Design Language
- **Style:** Clean, modern, minimal — similar to Raycast or Linear
- **Font:** `Inter` for UI text, `JetBrains Mono` for URLs and port numbers
- **Colors (Dark theme — default):**
  - Background: `#0f0f0f`
  - Card background: `#1a1a1a`
  - Border: `#2a2a2a`
  - Primary accent: `#6ee7b7` (green — server running)
  - Danger accent: `#f87171` (red — server stopped/error)
  - Text primary: `#f5f5f5`
  - Text secondary: `#737373`
- **Colors (Light theme):**
  - Background: `#fafafa`
  - Card background: `#ffffff`
  - Border: `#e5e5e5`
  - Text primary: `#171717`
  - Text secondary: `#737373`
- **Border radius:** `8px` cards, `6px` buttons, `4px` inputs
- **Transitions:** All hover/state changes `150ms ease`

### 3.2 Window Properties
```javascript
new BrowserWindow({
  width: 800,
  height: 600,
  minWidth: 680,
  minHeight: 480,
  frame: false,                    // Custom title bar
  backgroundColor: '#0f0f0f',
  show: false,                     // Show after ready-to-show
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
  }
})
```

### 3.3 Custom Title Bar
Since `frame: false`, build a custom title bar in React:
- Left: App icon (16x16) + "ServeIt" text
- Right: Theme toggle, Settings icon, Minimize, Maximize, Close
- Draggable: `-webkit-app-region: drag` on title bar
- Buttons: `-webkit-app-region: no-drag`
- Height: 40px, seamless background

### 3.4 Main Layout — Empty State

```
+-----------------------------------------------------+
|  ServeIt                           moon  gear  - O X | <- title bar
+-----------------------------------------------------+
|                                                     |
|           +-------------------------+               |
|           |                         |               |
|           |    Drop a folder here   |               |
|           |                         |               |
|           |   [  Choose Folder  ]   |               |
|           |                         |               |
|           +-------------------------+               |
|                                                     |
|   Recent                                            |
|   /home/user/myproject       3 days ago   [Serve]  |
|   /home/user/portfolio       1 week ago   [Serve]  |
|                                                     |
+-----------------------------------------------------+
```

Drop zone behavior:
- Dashed border `2px dashed #2a2a2a`, becomes `#6ee7b7` on drag-over
- Folder icon (64px) centered above text
- Hover glow on drag-over: `box-shadow: 0 0 0 3px rgba(110,231,183,0.2)`
- Subtle pulse animation while dragging over

### 3.5 Main Layout — Active Servers

```
+-----------------------------------------------------+
|  ServeIt  (2 running)              moon  gear  - O X|
+-----------------------------------------------------+
|  [+ New Server]                       2 running     |
+-----------------------------------------------------+
|                                                     |
|  +-----------------------------------------------+  |
|  | (green dot)  mysite          Port [ 8080 ]    |  |
|  | /home/user/mysite                             |  |
|  | http://localhost:8080   [Copy] [Open] [Stop]  |  |
|  |                                               |  |
|  |  CORS [off]   Live Reload [off]   Auth [off]  |  |
|  |                                               |  |
|  |  Request Log (12)              [Clear] [QR]   |  |
|  |  14:32:01  GET  /index.html    200   1.2 KB   |  |
|  |  14:32:01  GET  /style.css     200   4.5 KB   |  |
|  |  14:32:12  GET  /missing.js    404   --       |  |
|  +-----------------------------------------------+  |
|                                                     |
|  +-----------------------------------------------+  |
|  | (green dot)  files            Port [ 8081 ]   |  |
|  |  ... collapsed ...                            |  |
|  +-----------------------------------------------+  |
+-----------------------------------------------------+
```

### 3.6 Server Card Behavior

**Port field:**
- While running: disabled (grayed), shows lock icon
- While stopped: enabled, user can type new port
- Validate range 1024–65535 on blur/enter
- Show inline error if invalid or taken

**Stop/Start button:**
- Running: red "Stop" button
- Stopped: green "Start" button
- 150ms color transition

**Cards:**
- Collapse to single header row if more than 2 servers
- Cards animate in (slide up + fade) and out (fade + slide down)

### 3.7 Request Log
- Font: `JetBrains Mono` 12px
- Columns: `TIME  METHOD  PATH  STATUS  SIZE`
- Status color coding:
  - 2xx: `#6ee7b7` green
  - 3xx: `#93c5fd` blue
  - 4xx: `#fbbf24` yellow
  - 5xx: `#f87171` red
- Max 500 lines, auto-scroll to bottom
- Toggle auto-scroll button
- Clear button (`Ctrl+L`)

### 3.8 QR Code
- Popover/modal on [QR] click
- Encodes `http://LOCAL_IP:PORT`
- Shows URL text below QR image
- Caption: "Scan from any device on the same WiFi"
- Close on click outside or Esc

### 3.9 Settings Panel
Slide-in panel from right (not a separate window):

**General**
- Auto-open browser on start: toggle
- Start with OS: toggle
- Start minimized to tray: toggle
- Show OS notifications: toggle

**Server Defaults**
- Starting port: number input (default 8080)
- CORS on by default: toggle
- Live reload on by default: toggle

**Appearance**
- Theme: Light / Dark / System (segmented control, 3 buttons)

**About**
- Version, GitHub link, Check for updates button

### 3.10 Animations
- App load: fade-in 200ms
- Card enter: slide up + fade 150ms
- Card exit: fade + slide down 150ms
- Drop zone drag-over: pulse border glow keyframe
- Toast: slide in from top-right, auto-dismiss 3s
- Settings panel: slide in from right 200ms

---

## 4. Features

### 4.1 MVP Features

**F1 — Drag & Drop Folder**
- Accept folder drag & drop on main window
- Validate: must be folder not file
- On drop: start server immediately, add card

**F2 — Choose Folder Button**
- `dialog.showOpenDialog({ properties: ['openDirectory'] })`
- Same behavior as drop

**F3 — Start / Stop Server**
- Toggle button per card
- On start: find free port (or use configured port), spin up server
- On stop: close server, keep card (don't remove)
- If port taken: show error inline, suggest next port

**F4 — Port Configuration**
- Editable number field per card
- Only editable when server is stopped
- Auto-find free port starting from `settings.defaultPort`
- Validate 1024–65535

**F5 — Copy URL**
- Copies `http://localhost:PORT` to clipboard
- Toast: "Copied!" (2s auto-dismiss)

**F6 — Open in Browser**
- `shell.openExternal('http://localhost:PORT')`
- Also auto-opens on start if `settings.autoOpenBrowser = true`

**F7 — Multiple Servers**
- Up to 10 simultaneous servers
- "+ New Server" button collapses to drop zone or opens folder picker
- Each card fully independent

**F8 — Request Log**
- Real-time log via IPC from main process
- Columns: time, method, path, status, size
- Color coded by status code
- Max 500 lines, auto-trim from top

**F9 — System Tray**
- Minimize to tray when window closed (not quit)
- Badge showing count of running servers
- Right-click menu: list of servers, Open, Stop All, Quit
- Left-click: toggle window

**F10 — Recent Folders**
- Last 10 served folders stored in electron-store
- Shown in empty state
- One-click re-serve
- Hover x to remove from list

### 4.2 Extended Features

**F11 — QR Code**
- Per-server QR encoding `http://LOCAL_IP:PORT`
- Popover with QR + URL

**F12 — Directory Listing**
- Custom styled HTML when no index.html found
- Dark/light aware via `prefers-color-scheme`
- Shows: type icon, name (link), size, modified date
- Breadcrumb navigation + parent link

**F13 — CORS Toggle**
- Adds `Access-Control-Allow-Origin: *` to all responses
- Per server, default OFF

**F14 — Live Reload**
- Uses chokidar to watch folder
- Injects SSE script into HTML responses
- Browser refreshes on file change
- Per server, default OFF

**F15 — Basic Auth**
- HTTP Basic Auth per server
- Username + password inputs appear when toggled
- Default OFF

**F16 — OS Notifications**
- Server started: "Serving /folder on port 8080"
- Server stopped
- Port conflict warning
- Configurable in settings

### 4.3 Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+O` | Open folder picker |
| `Ctrl+,` | Open settings |
| `Ctrl+W` | Minimize to tray |
| `Ctrl+Q` | Quit |
| `Ctrl+L` | Clear focused log |
| `Escape` | Close settings / QR modal |

---

## 5. HTTP Server Implementation

### 5.1 Core Server (electron/server-manager.js)

```javascript
const http = require('http');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

class ServerManager {
  constructor() {
    this.servers = new Map(); // id -> { server, config }
  }

  async start(id, folderPath, port, options = {}) {
    const server = http.createServer((req, res) => {
      this._handle(req, res, folderPath, options, id);
    });
    return new Promise((resolve, reject) => {
      server.listen(port, '0.0.0.0', () => {
        this.servers.set(id, { server, folderPath, port, options });
        resolve({ port });
      });
      server.on('error', reject);
    });
  }

  stop(id) {
    const entry = this.servers.get(id);
    if (!entry) return;
    entry.server.close();
    this.servers.delete(id);
  }

  stopAll() {
    for (const id of this.servers.keys()) this.stop(id);
  }

  _handle(req, res, folderPath, options, id) {
    // CORS
    if (options.cors) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    }

    // Live reload SSE endpoint
    if (options.liveReload && req.url === '/__livereload') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
      // Store client for pushing reload events
      return;
    }

    // Basic auth
    if (options.auth) {
      const b64 = (req.headers.authorization || '').split(' ')[1] || '';
      const [user, pass] = Buffer.from(b64, 'base64').toString().split(':');
      if (user !== options.auth.user || pass !== options.auth.pass) {
        res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="ServeIt"' });
        res.end('Unauthorized'); return;
      }
    }

    // Resolve + sanitize path (PREVENT PATH TRAVERSAL)
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    const filePath = path.normalize(path.join(folderPath, urlPath));
    if (!filePath.startsWith(path.normalize(folderPath))) {
      res.writeHead(403); res.end('Forbidden'); return;
    }

    fs.stat(filePath, (err, stat) => {
      if (err) {
        res.writeHead(404);
        res.end(this._404(urlPath));
        this._log(id, req, 404, 0);
        return;
      }
      if (stat.isDirectory()) {
        const index = path.join(filePath, 'index.html');
        if (fs.existsSync(index)) {
          this._serveFile(res, index, options, id, req);
        } else {
          this._serveDir(res, filePath, folderPath, urlPath, id, req);
        }
      } else {
        this._serveFile(res, filePath, options, id, req);
      }
    });
  }

  _serveFile(res, filePath, options, id, req) {
    const mimeType = mime.lookup(filePath) || 'application/octet-stream';
    let content = fs.readFileSync(filePath);
    // Inject live reload into HTML
    if (options.liveReload && mimeType === 'text/html') {
      const script = `<script>const es=new EventSource('/__livereload');es.onmessage=()=>location.reload();</script>`;
      content = Buffer.from(content.toString().replace('</body>', script + '</body>'));
    }
    res.writeHead(200, { 'Content-Type': mimeType, 'Content-Length': content.length });
    res.end(content);
    this._log(id, req, 200, content.length);
  }

  _serveDir(res, dirPath, basePath, urlPath, id, req) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const html = this._dirHTML(entries, dirPath, urlPath);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    this._log(id, req, 200, Buffer.byteLength(html));
  }

  _log(id, req, status, bytes) {
    const { BrowserWindow } = require('electron');
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.webContents.send('server:log', {
        serverId: id,
        time: new Date().toISOString(),
        method: req.method,
        path: req.url,
        status,
        bytes,
      });
    }
  }

  _dirHTML(entries, dirPath, urlPath) {
    const icon = (e) => {
      if (e.isDirectory()) return '📁';
      const ext = path.extname(e.name).toLowerCase();
      return ({ '.html':'🌐','.css':'🎨','.js':'⚡','.json':'📋','.png':'🖼️','.jpg':'🖼️','.pdf':'📄','.zip':'🗜️','.mp4':'🎬','.mp3':'🎵' })[ext] || '📄';
    };
    const fmt = (b) => b < 1024 ? b+'B' : b < 1048576 ? (b/1024).toFixed(1)+'KB' : (b/1048576).toFixed(1)+'MB';
    const rows = entries.map(e => {
      const href = urlPath.replace(/\/$/, '') + '/' + e.name + (e.isDirectory() ? '/' : '');
      const stat = fs.statSync(path.join(dirPath, e.name));
      return `<tr><td>${icon(e)}</td><td><a href="${href}">${e.name}${e.isDirectory()?'/':''}</a></td><td>${e.isDirectory()?'—':fmt(stat.size)}</td><td>${stat.mtime.toLocaleDateString()}</td></tr>`;
    }).join('');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Index of ${urlPath}</title>
<style>:root{color-scheme:light dark}body{font-family:system-ui;max-width:900px;margin:40px auto;padding:0 20px;background:light-dark(#fafafa,#0f0f0f);color:light-dark(#171717,#f5f5f5)}h1{font-size:1.2rem;font-weight:600}table{width:100%;border-collapse:collapse}th{text-align:left;padding:8px 12px;border-bottom:1px solid light-dark(#e5e5e5,#2a2a2a);font-size:.75rem;text-transform:uppercase;color:#737373}td{padding:8px 12px;border-bottom:1px solid light-dark(#f0f0f0,#1a1a1a)}a{color:light-dark(#0066cc,#6ee7b7);text-decoration:none}a:hover{text-decoration:underline}.badge{font-size:.7rem;padding:2px 6px;background:light-dark(#f0f0f0,#2a2a2a);border-radius:4px;color:#737373;margin-left:8px}</style>
</head><body>
<h1>📂 ${urlPath} <span class="badge">ServeIt</span></h1>
<table><thead><tr><th></th><th>Name</th><th>Size</th><th>Modified</th></tr></thead><tbody>
${urlPath!=='/'?'<tr><td>⬆️</td><td><a href="../">Parent Directory</a></td><td>—</td><td>—</td></tr>':''}${rows}
</tbody></table></body></html>`;
  }

  _404(urlPath) {
    return `<!DOCTYPE html><html><body style="font-family:system-ui;text-align:center;padding:60px"><h1 style="font-size:4rem;margin:0">404</h1><p style="color:#737373">${urlPath} not found</p><a href="/">Back to index</a><p style="font-size:.8rem;color:#999;margin-top:40px">ServeIt</p></body></html>`;
  }
}

module.exports = new ServerManager();
```

### 5.2 Port Finder (electron/port-finder.js)

```javascript
const net = require('net');

function findFreePort(start = 8080) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.listen(start, () => { s.close(() => resolve(start)); });
    s.on('error', () => resolve(findFreePort(start + 1)));
  });
}

module.exports = { findFreePort };
```

### 5.3 Get Local IP (electron/network-utils.js)

```javascript
const os = require('os');

function getLocalIP() {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const i of ifaces) {
      if (i.family === 'IPv4' && !i.internal) return i.address;
    }
  }
  return '127.0.0.1';
}

module.exports = { getLocalIP };
```

---

## 6. IPC Communication

### 6.1 Channels

| Channel | Direction | Payload | Description |
|---|---|---|---|
| `server:start` | renderer→main | `{id, folderPath, port, options}` | Start server |
| `server:stop` | renderer→main | `{id}` | Stop server |
| `server:stopAll` | renderer→main | — | Stop all |
| `server:log` | main→renderer | `{serverId, time, method, path, status, bytes}` | Request log entry |
| `server:error` | main→renderer | `{serverId, error}` | Error |
| `cli:serveFolder` | main→renderer | `{folderPath}` | From right-click/CLI |
| `dialog:openFolder` | renderer→main | — | Open folder picker |
| `port:findFree` | renderer→main | `{startPort}` | Find free port |
| `app:getLocalIP` | renderer→main | — | Get machine IP |
| `settings:get` | renderer→main | — | Get settings |
| `settings:set` | renderer→main | `{key, value}` | Update setting |
| `history:get` | renderer→main | — | Get recent folders |
| `history:add` | renderer→main | `{folderPath}` | Add to history |
| `history:remove` | renderer→main | `{folderPath}` | Remove from history |
| `app:minimize` | renderer→main | — | Minimize window |
| `app:maximize` | renderer→main | — | Maximize/restore |
| `app:close` | renderer→main | — | Close (minimize to tray) |

### 6.2 Preload (electron/preload.js)

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  startServer:    (cfg)      => ipcRenderer.invoke('server:start', cfg),
  stopServer:     (id)       => ipcRenderer.invoke('server:stop', { id }),
  stopAll:        ()         => ipcRenderer.invoke('server:stopAll'),
  findFreePort:   (start)    => ipcRenderer.invoke('port:findFree', { startPort: start }),
  openFolder:     ()         => ipcRenderer.invoke('dialog:openFolder'),
  getLocalIP:     ()         => ipcRenderer.invoke('app:getLocalIP'),
  getSettings:    ()         => ipcRenderer.invoke('settings:get'),
  setSetting:     (k, v)     => ipcRenderer.invoke('settings:set', { key: k, value: v }),
  getHistory:     ()         => ipcRenderer.invoke('history:get'),
  addHistory:     (p)        => ipcRenderer.invoke('history:add', { folderPath: p }),
  removeHistory:  (p)        => ipcRenderer.invoke('history:remove', { folderPath: p }),
  minimize:       ()         => ipcRenderer.invoke('app:minimize'),
  maximize:       ()         => ipcRenderer.invoke('app:maximize'),
  close:          ()         => ipcRenderer.invoke('app:close'),
  onLog:          (cb)       => ipcRenderer.on('server:log', (_, d) => cb(d)),
  onError:        (cb)       => ipcRenderer.on('server:error', (_, d) => cb(d)),
  onCLIServe:     (cb)       => ipcRenderer.on('cli:serveFolder', (_, d) => cb(d)),
});
```

---

## 7. Settings & Persistence (electron-store)

```javascript
// electron/store.js
const Store = require('electron-store');

const settings = new Store({
  name: 'settings',
  defaults: {
    autoOpenBrowser: true,
    startMinimized: false,
    defaultPort: 8080,
    theme: 'system',
    showNotifications: true,
    autoStartAtLogin: false,
    maxLogLines: 500,
    defaultCORS: false,
    defaultLiveReload: false,
  }
});

const history = new Store({
  name: 'history',
  defaults: { recentFolders: [] }
});

module.exports = { settings, history };
```

History entry format:
```json
{
  "path": "/home/user/myproject",
  "name": "myproject",
  "lastServed": "2026-04-04T10:00:00.000Z"
}
```
Max 10 entries. Remove oldest when over limit. On load, remove entries whose paths no longer exist on disk.

---

## 8. System Integration

### 8.1 Windows Right-Click Context Menu

Added by NSIS installer to Windows Registry:

```nsis
; build/installer.nsi
WriteRegStr HKCR "Directory\shell\ServeIt" "" "Serve with ServeIt"
WriteRegStr HKCR "Directory\shell\ServeIt" "Icon" "$INSTDIR\ServeIt.exe,0"
WriteRegStr HKCR "Directory\shell\ServeIt\command" "" '"$INSTDIR\ServeIt.exe" --serve "%V"'

WriteRegStr HKCR "Directory\Background\shell\ServeIt" "" "Serve with ServeIt"
WriteRegStr HKCR "Directory\Background\shell\ServeIt\command" "" '"$INSTDIR\ServeIt.exe" --serve "%W"'

Section "Uninstall"
  DeleteRegKey HKCR "Directory\shell\ServeIt"
  DeleteRegKey HKCR "Directory\Background\shell\ServeIt"
SectionEnd
```

Handle `--serve <path>` in main.js:

```javascript
// electron/main.js
const { app, BrowserWindow } = require('electron');

// Single instance — if app already open, focus it and pass folder
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (event, argv) => {
    const idx = argv.indexOf('--serve');
    if (idx !== -1 && mainWindow) {
      mainWindow.webContents.send('cli:serveFolder', { folderPath: argv[idx + 1] });
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// On first launch, check for --serve arg
const args = process.argv;
const serveIdx = args.indexOf('--serve');
const cliFolder = serveIdx !== -1 ? args[serveIdx + 1] : null;

app.on('ready', () => {
  createWindow();
  if (cliFolder) {
    setTimeout(() => {
      mainWindow.webContents.send('cli:serveFolder', { folderPath: cliFolder });
    }, 600);
  }
});
```

### 8.2 Linux Right-Click (Nautilus)

Nautilus script auto-installed by `.deb` postinst:

```bash
# build/postinst.sh
#!/bin/bash
for home in /home/*; do
  DIR="$home/.local/share/nautilus/scripts"
  mkdir -p "$DIR"
  cat > "$DIR/Serve with ServeIt" << 'SCRIPT'
#!/bin/bash
/usr/bin/serveit --serve "$NAUTILUS_SCRIPT_SELECTED_FILE_PATHS"
SCRIPT
  chmod +x "$DIR/Serve with ServeIt"
done
update-desktop-database /usr/share/applications/ 2>/dev/null || true
```

Cleanup on uninstall (build/postrm.sh):

```bash
#!/bin/bash
for home in /home/*; do
  rm -f "$home/.local/share/nautilus/scripts/Serve with ServeIt"
done
```

Desktop file (`/usr/share/applications/serveit.desktop`):
```ini
[Desktop Entry]
Version=1.0
Type=Application
Name=ServeIt
Comment=Serve any folder over HTTP instantly
Exec=/usr/bin/serveit %U
Icon=serveit
Categories=Development;Network;
Terminal=false
```

### 8.3 System Tray (electron/tray-manager.js)

```javascript
const { Tray, Menu, shell } = require('electron');
const path = require('path');

class TrayManager {
  constructor(mainWindow, serverManager) {
    this.win = mainWindow;
    this.sm = serverManager;
    this.tray = new Tray(path.join(__dirname, '../assets/tray-icon.png'));
    this.tray.setToolTip('ServeIt');
    this.tray.on('click', () => this._toggle());
    this.update([]);
  }

  update(servers) {
    const items = servers.length === 0
      ? [{ label: 'No servers running', enabled: false }]
      : servers.map(s => ({
          label: `${s.name}  :${s.port}`,
          click: () => shell.openExternal(`http://localhost:${s.port}`)
        }));

    this.tray.setContextMenu(Menu.buildFromTemplate([
      { label: servers.length > 0 ? `${servers.length} server(s) running` : 'ServeIt', enabled: false },
      { type: 'separator' },
      ...items,
      { type: 'separator' },
      { label: 'Open ServeIt', click: () => { this.win.show(); this.win.focus(); } },
      { label: 'Stop All', click: () => this.sm.stopAll(), enabled: servers.length > 0 },
      { type: 'separator' },
      { label: 'Quit', click: () => require('electron').app.quit() },
    ]));
  }

  _toggle() {
    this.win.isVisible() ? this.win.hide() : (this.win.show(), this.win.focus());
  }
}

module.exports = TrayManager;
```

---

## 9. Project File Structure

```
serveit/
├── package.json
├── electron-builder.yml
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
│
├── .github/
│   └── workflows/
│       └── build.yml
│
├── electron/
│   ├── main.js                    # App entry, window, single instance
│   ├── preload.js                 # Context bridge
│   ├── server-manager.js          # HTTP server logic
│   ├── port-finder.js             # Free port finder
│   ├── network-utils.js           # Local IP
│   ├── tray-manager.js            # System tray
│   ├── store.js                   # electron-store config
│   ├── settings-manager.js        # Settings IPC handlers
│   ├── history-manager.js         # Recent folders IPC handlers
│   └── notification-manager.js   # OS notifications
│
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   │
│   ├── components/
│   │   ├── TitleBar.jsx
│   │   ├── DropZone.jsx
│   │   ├── ServerCard.jsx
│   │   ├── PortInput.jsx
│   │   ├── RequestLog.jsx
│   │   ├── QRModal.jsx
│   │   ├── RecentFolders.jsx
│   │   ├── Settings.jsx
│   │   ├── StatusDot.jsx
│   │   ├── Toast.jsx
│   │   └── Toaster.jsx
│   │
│   ├── hooks/
│   │   ├── useServers.js
│   │   ├── useSettings.js
│   │   ├── useHistory.js
│   │   ├── useTheme.js
│   │   └── useDragDrop.js
│   │
│   └── utils/
│       ├── formatBytes.js
│       ├── formatTime.js
│       └── generateId.js
│
├── assets/
│   ├── icon.png                   # 512x512
│   ├── icon.ico                   # Windows multi-size
│   ├── tray-icon.png              # 32x32
│   └── tray-icon-active.png       # 32x32 (servers running)
│
├── build/
│   ├── installer.nsi              # NSIS registry script
│   ├── postinst.sh                # Linux post-install
│   └── postrm.sh                  # Linux post-remove
│
└── docs/                          # GitHub Pages
    ├── index.html
    ├── style.css
    └── screenshot.png
```

---

## 10. package.json

```json
{
  "name": "serveit",
  "version": "1.0.0",
  "description": "Serve any folder over HTTP in one click",
  "main": "electron/main.js",
  "scripts": {
    "dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && cross-env NODE_ENV=development electron .\"",
    "build": "vite build",
    "dist": "npm run build && electron-builder",
    "dist:win": "npm run build && electron-builder --win",
    "dist:linux": "npm run build && electron-builder --linux",
    "lint": "eslint src electron",
    "format": "prettier --write src electron"
  },
  "dependencies": {
    "chokidar": "^3.6.0",
    "electron-store": "^8.2.0",
    "electron-updater": "^6.3.0",
    "mime-types": "^2.1.35",
    "qrcode": "^1.5.4"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "concurrently": "^9.0.0",
    "cross-env": "^7.0.3",
    "electron": "^33.0.0",
    "electron-builder": "^25.0.0",
    "eslint": "^9.0.0",
    "lucide-react": "^0.469.0",
    "postcss": "^8.4.0",
    "prettier": "^3.3.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "tailwindcss": "^3.4.0",
    "vite": "^6.0.0",
    "wait-on": "^8.0.0"
  }
}
```

---

## 11. electron-builder.yml

```yaml
appId: com.yourname.serveit
productName: ServeIt
copyright: "Copyright 2026"

directories:
  output: dist

files:
  - electron/**/*
  - dist/**/*
  - assets/**/*
  - package.json
  - node_modules/**/*

win:
  icon: assets/icon.ico
  target:
    - target: nsis
      arch: [x64]

nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  runAfterFinish: true
  include: build/installer.nsi

linux:
  icon: assets/icon.png
  category: Development
  target:
    - target: deb
      arch: [x64]
    - target: AppImage
      arch: [x64]

deb:
  afterInstall: build/postinst.sh
  afterRemove: build/postrm.sh

publish:
  provider: github
  releaseType: release
```

---

## 12. GitHub Actions CI/CD

```yaml
# .github/workflows/build.yml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        include:
          - os: windows-latest
            script: dist:win
          - os: ubuntu-latest
            script: dist:linux

    runs-on: ${{ matrix.os }}
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - run: npm run ${{ matrix.script }}
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - uses: softprops/action-gh-release@v2
        with:
          files: |
            dist/*.exe
            dist/*.deb
            dist/*.AppImage
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

To release a new version:
```bash
npm version patch        # 1.0.0 -> 1.0.1
git push origin main --tags
# GitHub Actions builds .exe + .deb + .AppImage automatically
# Files appear in GitHub Releases page in ~10 min
```

---

## 13. Security Rules

- Path traversal: ALL file paths must be validated to start with folderPath before serving
- contextIsolation: true — always
- nodeIntegration: false — always
- sandbox: true — always
- Only contextBridge for renderer<->main communication
- No eval(), no exec() on request data
- Zero telemetry, zero analytics

---

## 14. Dev Setup

```bash
git clone https://github.com/YOURNAME/serveit
cd serveit
npm install
npm run dev          # dev mode with hot reload
npm run dist         # build for current OS
npm run dist:win     # Windows .exe
npm run dist:linux   # Linux .deb + .AppImage
# Output: ./dist/
```

---

## 15. Build Phases (Give AI Agent One Phase at a Time)

### Phase 1 — Core
- Electron window + custom titlebar (frameless, drag region, minimize/maximize/close)
- React + Vite + Tailwind setup
- DropZone component (drag & drop + folder picker)
- Single HTTP server: start/stop
- Port input + auto find free port
- Copy URL button + open browser
- Basic request log
- Single instance lock + --serve CLI arg handling

### Phase 2 — Multi-server + Tray
- Multiple servers (up to 10), each as independent card
- "+ New Server" button
- Card collapse/expand
- System tray (minimize to tray on close, right-click menu)
- OS notifications (electron Notification API)

### Phase 3 — Features
- QR code modal
- Custom directory listing HTML
- Recent folders (persistent via electron-store)
- CORS toggle
- Live reload (chokidar + SSE injection)
- Basic auth
- Settings slide-in panel with all options
- Dark/light/system theme

### Phase 4 — Native Integration
- Windows NSIS installer.nsi with registry keys
- Linux postinst.sh / postrm.sh for Nautilus script
- .desktop file for Linux

### Phase 5 — Release
- App icon all formats (512x512 PNG, ICO for Windows)
- Tray icon (32x32, active + inactive variant)
- GitHub Actions build.yml
- GitHub Pages landing page in /docs
- README.md with download links, screenshots, GIF demo

---

*End of Requirements.*
*Give Phase 1 to your AI agent first. Test it fully. Then Phase 2. And so on.*
*Never skip phases — each one depends on the previous.*
