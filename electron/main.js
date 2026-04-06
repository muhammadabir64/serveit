const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const serverManager = require('./server-manager');
const tunnelManager = require('./tunnel-manager');
const { findFreePort } = require('./port-finder');
const TrayManager = require('./tray-manager');
const { notify } = require('./notification-manager');
const { getLocalIP } = require('./network-utils');
const { settingsStore, historyStore } = require('./store');

const isDev = process.env.NODE_ENV === 'development';
let mainWindow = null;
let trayManager = null;
let pendingCLIFolder = null;
let isQuitting = false;
let updateCheckInterval = null;
let updaterInitialized = false;
let updateState = {
  status: 'idle',
  available: false,
  downloaded: false,
  checking: false,
  version: '',
  error: '',
  message: '',
};

const APP_USER_MODEL_ID = 'com.serveit.app';
const WINDOW_ICON_PATH = process.platform === 'win32'
  ? path.join(__dirname, '../assets/icon.ico')
  : path.join(__dirname, '../assets/icon.png');

function normalizeArgValue(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1);
  }
  return text;
}

function resolveDirectoryArg(value, workingDirectory = '') {
  const normalized = normalizeArgValue(value);
  if (!normalized || normalized.startsWith('-') || normalized === '.' || normalized === '..') return null;

  try {
    const resolved = path.isAbsolute(normalized)
      ? path.resolve(normalized)
      : workingDirectory
        ? path.resolve(workingDirectory, normalized)
        : path.resolve(normalized);
    if (!fs.existsSync(resolved)) return null;
    return fs.statSync(resolved).isDirectory() ? resolved : null;
  } catch {
    return null;
  }
}

function hasServeIntent(argv = []) {
  return argv.some((value) => {
    const arg = String(value || '');
    return arg === '--serve' || arg === '/serve' || arg.startsWith('--serve=') || arg.startsWith('/serve=');
  });
}

function parseServeArg(argv = [], workingDirectory = '') {
  for (let i = 0; i < argv.length; i += 1) {
    const arg = String(argv[i] || '');

    if (arg === '--serve' || arg === '/serve') {
      return resolveDirectoryArg(argv[i + 1], workingDirectory) || normalizeArgValue(argv[i + 1]);
    }

    if (arg.startsWith('--serve=')) {
      return resolveDirectoryArg(arg.slice('--serve='.length), workingDirectory) || normalizeArgValue(arg.slice('--serve='.length));
    }

    if (arg.startsWith('/serve=')) {
      return resolveDirectoryArg(arg.slice('/serve='.length), workingDirectory) || normalizeArgValue(arg.slice('/serve='.length));
    }
  }

  if (!isDev && process.platform === 'win32' && hasServeIntent(argv)) {
    for (let i = argv.length - 1; i >= 0; i -= 1) {
      const folderPath = resolveDirectoryArg(argv[i], workingDirectory);
      if (folderPath) return folderPath;
    }
  }

  return null;
}

const initialLaunchFolder = parseServeArg(process.argv, process.cwd());

const gotLock = app.requestSingleInstanceLock({
  cliFolder: initialLaunchFolder || '',
  cwd: process.cwd(),
  argv: process.argv,
});
if (!gotLock) app.quit();





function updateTray() {
  if (!trayManager) return;
  trayManager.update(serverManager.list());
}

function showNotification(title, body) {
  if (!settingsStore.get('showNotifications')) return;
  notify(title, body);
}

function cleanHistory() {
  const current = historyStore.get('recentFolders', []);
  const cleaned = current.filter((entry) => fs.existsSync(entry.path) && fs.statSync(entry.path).isDirectory());
  historyStore.set('recentFolders', cleaned.slice(0, 10));
  return historyStore.get('recentFolders', []);
}

function addHistory(folderPath) {
  const current = cleanHistory();
  const normalized = path.resolve(folderPath);
  const name = path.basename(normalized) || normalized;
  const next = [
    { path: normalized, name, lastServed: new Date().toISOString() },
    ...current.filter((item) => item.path !== normalized),
  ].slice(0, 10);
  historyStore.set('recentFolders', next);
  return next;
}

function removeHistory(folderPath) {
  const normalized = path.resolve(folderPath);
  const next = cleanHistory().filter((item) => item.path !== normalized);
  historyStore.set('recentFolders', next);
  return next;
}

function broadcastStopped(serverIds) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  serverIds.forEach((id) => {
    mainWindow.webContents.send('server:stopped', { serverId: id });
  });
}

async function stopAllServers() {
  const { stoppedIds } = await serverManager.stopAll();
  await tunnelManager.stopAll();
  if (stoppedIds.length > 0) {
    broadcastStopped(stoppedIds);
    showNotification('ServeIt', 'All servers stopped');
  }
  updateTray();
}


function sendServeFolder(folderPath) {
  if (!folderPath) return;

  if (!mainWindow || mainWindow.isDestroyed()) {
    pendingCLIFolder = folderPath;
    return;
  }

  if (mainWindow.webContents.isLoadingMainFrame()) {
    pendingCLIFolder = folderPath;
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
    return;
  }

  mainWindow.webContents.send('cli:serveFolder', { folderPath });
  if (!mainWindow.isVisible()) mainWindow.show();
  mainWindow.focus();
}


function broadcastUpdateState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('app:updateStatus', updateState);
}

function setUpdateState(partial) {
  updateState = {
    ...updateState,
    ...partial,
  };
  broadcastUpdateState();
}

const UPDATER_GH_OWNER = 'muhammadabir64';
const UPDATER_GH_REPO = 'serveit';

function canUseUpdater() {
  return !isDev;
}

function checkForUpdates() {
  if (!canUseUpdater()) {
    return { ok: false, error: 'Updates are disabled in development mode' };
  }

  if (updateState.checking) return { ok: true };
  setUpdateState({ status: 'checking', checking: true, error: '', message: '' });
  autoUpdater.checkForUpdates().catch((error) => {
    setUpdateState({
      status: 'error',
      checking: false,
      error: error instanceof Error ? error.message : 'Failed to check updates',
      message: '',
    });
  });
  return { ok: true };
}

function setupUpdater() {
  if (updaterInitialized || isDev) return;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: UPDATER_GH_OWNER,
    repo: UPDATER_GH_REPO,
    private: false,
    releaseType: 'release',
  });

  autoUpdater.on('checking-for-update', () => {
    setUpdateState({ status: 'checking', checking: true, error: '', message: '' });
  });

  autoUpdater.on('update-available', (info) => {
    setUpdateState({
      status: 'available',
      available: true,
      downloaded: false,
      checking: false,
      version: info?.version || '',
      error: '',
      message: 'Update available',
    });
  });

  autoUpdater.on('update-not-available', () => {
    setUpdateState({
      status: 'not-available',
      available: false,
      downloaded: false,
      checking: false,
      version: '',
      error: '',
      message: 'You are on the latest version',
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    setUpdateState({
      status: 'downloading',
      available: true,
      checking: false,
      error: '',
      message: `Downloading update... ${Math.round(progress?.percent || 0)}%`,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    setUpdateState({
      status: 'downloaded',
      available: true,
      downloaded: true,
      checking: false,
      version: info?.version || updateState.version,
      error: '',
      message: 'Update downloaded. Ready to install.',
    });
  });

  autoUpdater.on('error', (error) => {
    setUpdateState({
      status: 'error',
      checking: false,
      error: error?.message || 'Update error',
      message: '',
    });
  });

  updaterInitialized = true;
}

tunnelManager.on('status', ({ serverId, url, error }) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('tunnel:status', {
    serverId,
    url: url || '',
    error: error || '',
  });
});


if (gotLock) {
  app.on('second-instance', (_event, argv, workingDirectory, additionalData) => {
    const cliFolder = resolveDirectoryArg(additionalData?.cliFolder, additionalData?.cwd || workingDirectory)
      || parseServeArg(additionalData?.argv || argv, additionalData?.cwd || workingDirectory);
    if (!cliFolder) return;
    sendServeFolder(cliFolder);
  });
}



function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 680,
    minHeight: 480,
    frame: false,
    backgroundColor: '#0f0f0f',
    show: false,
    icon: WINDOW_ICON_PATH,
    webPreferences: {

      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    if (!settingsStore.get('startMinimized')) mainWindow.show();
    broadcastUpdateState();
  });

  mainWindow.webContents.on('did-finish-load', () => {
    if (!pendingCLIFolder) return;
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  });




  mainWindow.on('close', (event) => {
    if (isQuitting) return;
    if (settingsStore.get('startMinimized')) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (isDev) mainWindow.loadURL('http://localhost:5173');
  else mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));

  trayManager = new TrayManager(mainWindow, serverManager, stopAllServers);
  updateTray();
}

ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  return { canceled: false, folderPath: result.filePaths[0] };
});

ipcMain.handle('port:findFree', async (_event, { startPort }) => {
  const port = await findFreePort(startPort || settingsStore.get('defaultPort', 8080));
  return { port };
});

ipcMain.handle('app:getLocalIP', async () => ({ ip: getLocalIP() }));

ipcMain.handle('app:getVersion', async () => ({ version: app.getVersion() }));

ipcMain.handle('app:getUpdateStatus', async () => ({ ...updateState }));

ipcMain.handle('app:checkForUpdates', async () => checkForUpdates());

ipcMain.handle('app:downloadUpdate', async () => {
  if (!canUseUpdater()) return { ok: false, error: 'Updates are disabled in development mode' };
  if (!updateState.available) return { ok: false, error: 'No update is currently available' };

  try {
    setUpdateState({ status: 'downloading', error: '', message: 'Downloading update...' });
    await autoUpdater.downloadUpdate();
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to download update';
    setUpdateState({ status: 'error', error: message, message: '' });
    return { ok: false, error: message };
  }
});

ipcMain.handle('app:installUpdate', async () => {
  if (!updateState.downloaded) return { ok: false, error: 'No downloaded update found' };
  setImmediate(() => autoUpdater.quitAndInstall(false, true));
  return { ok: true };
});

ipcMain.handle('settings:get', async () => ({ settings: settingsStore.store }));

ipcMain.handle('settings:set', async (_event, { key, value }) => {
  settingsStore.set(key, value);
  if (key === 'autoStartAtLogin') {
    app.setLoginItemSettings({
      openAtLogin: !!value,
      path: process.execPath,
    });
  }
  return { ok: true, settings: settingsStore.store };
});



ipcMain.handle('history:get', async () => ({ recentFolders: cleanHistory() }));
ipcMain.handle('history:add', async (_event, { folderPath }) => ({ recentFolders: addHistory(folderPath) }));
ipcMain.handle('history:remove', async (_event, { folderPath }) => ({ recentFolders: removeHistory(folderPath) }));

ipcMain.handle('server:start', async (_event, cfg) => {
  const { id, folderPath, port, options } = cfg || {};
  if (!id || !folderPath || !port) return { ok: false, error: 'Invalid server config' };
  const existingIds = serverManager.list().map((s) => s.id);
  if (existingIds.length >= 10 && !existingIds.includes(id)) {
    return { ok: false, error: 'Maximum 10 servers allowed' };
  }

  if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
    return { ok: false, error: 'Selected path is not a directory' };
  }

  try {
    const mergedOptions = {
      cors: options?.cors ?? settingsStore.get('defaultCORS', false),
      liveReload: options?.liveReload ?? settingsStore.get('defaultLiveReload', false),
      auth: {
        enabled: !!options?.auth?.enabled,
        user: options?.auth?.user || '',
        pass: options?.auth?.pass || '',
      },
    };

    const result = await serverManager.start({ id, folderPath, port, options: mergedOptions });
    addHistory(folderPath);
    updateTray();
    showNotification('ServeIt', `Serving ${path.basename(folderPath)} on port ${result.port}`);
    return { ok: true, ...result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start server';
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('server:error', { serverId: id, error: message });
    }
    showNotification('ServeIt', `Failed to start server: ${message}`);
    return { ok: false, error: message };
  }
});

ipcMain.handle('server:stop', async (_event, { id }) => {
  if (!id) return { ok: false, error: 'Missing server id' };
  try {
    const result = await serverManager.stop(id);
    await tunnelManager.stop(id);
    if (result.stopped) {
      broadcastStopped([id]);
      showNotification('ServeIt', 'Server stopped');
      updateTray();
    }
    return { ok: true, ...result };

  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to stop server' };
  }
});

ipcMain.handle('server:stopAll', async () => {
  await stopAllServers();
  return { ok: true };
});

ipcMain.handle('tunnel:start', async (_event, { id, port }) => {
  if (!id || !port) return { ok: false, error: 'Missing tunnel config' };

  try {
    const serverExists = serverManager.list().some((s) => s.id === id);
    if (!serverExists) return { ok: false, error: 'Server is not running' };

    const result = await tunnelManager.start(id, port);
    if (!result.url) return { ok: false, error: 'Tunnel URL not available' };

    showNotification('ServeIt', `Public tunnel ready: ${result.url}`);
    return { ok: true, url: result.url };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to start tunnel' };
  }
});

ipcMain.handle('tunnel:stop', async (_event, { id }) => {
  if (!id) return { ok: false, error: 'Missing server id' };

  try {
    const result = await tunnelManager.stop(id);
    return { ok: true, ...result };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to stop tunnel' };
  }
});


ipcMain.handle('app:openExternal', async (_event, { url }) => {
  if (!url) return { ok: false, error: 'Missing URL' };
  await shell.openExternal(url);
  return { ok: true };
});

ipcMain.handle('app:minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
  return { ok: true };
});

ipcMain.handle('app:maximize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
  return { ok: true };
});

ipcMain.handle('app:close', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (settingsStore.get('startMinimized')) mainWindow.hide();
    else app.quit();
  }
  return { ok: true };
});

ipcMain.handle('cli:getPendingServeFolder', async () => {
  const folderPath = pendingCLIFolder || '';
  pendingCLIFolder = null;
  return { folderPath };
});

const firstCLIFolder = initialLaunchFolder;
if (firstCLIFolder) pendingCLIFolder = firstCLIFolder;


app.whenReady().then(() => {
  if (process.platform === 'win32') app.setAppUserModelId(APP_USER_MODEL_ID);

  createWindow();
  setupUpdater();

  if (canUseUpdater()) {
    checkForUpdates();
    updateCheckInterval = setInterval(() => {
      checkForUpdates();
    }, 6 * 60 * 60 * 1000);
  } else {
    setUpdateState({
      status: 'disabled',
      available: false,
      downloaded: false,
      checking: false,
      version: '',
      error: 'Updates are disabled in development mode',
      message: 'Auto-updates run only in packaged builds.',
    });
  }

  app.setLoginItemSettings({
    openAtLogin: !!settingsStore.get('autoStartAtLogin'),
    path: process.execPath,
  });


  app.on('activate', () => {

    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on('before-quit', async () => {
  isQuitting = true;
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
    updateCheckInterval = null;
  }
  await stopAllServers();
  trayManager?.destroy();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !settingsStore.get('startMinimized')) {
    app.quit();
  }
});
