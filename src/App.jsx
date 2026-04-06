import { Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import AboutModal from './components/AboutModal';
import DropZone from './components/DropZone';
import QRModal from './components/QRModal';

import RecentFolders from './components/RecentFolders';
import ServerCard from './components/ServerCard';
import SettingsPanel from './components/SettingsPanel';
import TitleBar from './components/TitleBar';

const MAX_SERVERS = 10;

function generateId() {
  return `srv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function isValidPort(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1024 && n <= 65535;
}

function serverNameFromPath(folderPath) {
  return folderPath.split(/[/\\]/).pop() || folderPath;
}

function normalizeFolderPath(folderPath) {
  if (!folderPath) return '';

  let normalized = folderPath.trim();

  if (normalized.startsWith('file://')) {
    normalized = normalized.replace(/^file:\/\/+/, '');
    if (/^\/[A-Za-z]:/.test(normalized)) normalized = normalized.slice(1);
    try {
      normalized = decodeURIComponent(normalized);
    } catch {
      // Keep original string when URI decoding fails.
    }
  }

  normalized = normalized.replace(/\//g, '\\').replace(/[\\/]+$/, '');

  if (/^[A-Za-z]:\\/.test(normalized)) {
    return normalized.toLowerCase();
  }

  return normalized;
}

function sanitizeFolderPath(folderPath) {
  return normalizeFolderPath(folderPath);
}

function isAbsoluteFolderPath(folderPath) {
  return /^[A-Za-z]:\\/.test(folderPath) || /^\\\\[^\\]+\\[^\\]+/.test(folderPath);
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.add(prefersDark ? 'dark' : 'light');
  } else {
    root.classList.add(theme);
  }
}

export default function App() {
  const [servers, setServers] = useState([]);
  const [history, setHistory] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [updateState, setUpdateState] = useState({
    status: 'idle',
    available: false,
    downloaded: false,
    checking: false,
    version: '',
    error: '',
    message: '',
  });
  const [isDragging, setIsDragging] = useState(false);

  const [showNewServerArea, setShowNewServerArea] = useState(false);
  const [localIP, setLocalIP] = useState('127.0.0.1');
  const [qrTarget, setQrTarget] = useState(null);
  const [settings, setSettings] = useState({
    autoOpenBrowser: true,
    startMinimized: false,
    defaultPort: 8080,
    theme: 'system',
    showNotifications: true,
    autoStartAtLogin: false,
    maxLogLines: 500,
    defaultCORS: false,
    defaultLiveReload: false,
  });

  const serversRef = useRef([]);
  const settingsRef = useRef(settings);

  const runningCount = useMemo(() => servers.filter((s) => s.running).length, [servers]);

  useEffect(() => {
    serversRef.current = servers;
  }, [servers]);

  useEffect(() => {
    settingsRef.current = settings;
    applyTheme(settings.theme);
  }, [settings]);

  useEffect(() => {
    (async () => {
      const [settingsRes, historyRes, ipRes, versionRes, updateRes, pendingCLIRes] = await Promise.all([
        window.api.getSettings(),
        window.api.getHistory(),
        window.api.getLocalIP(),
        window.api.getVersion(),
        window.api.getUpdateStatus(),
        window.api.getPendingServeFolder(),
      ]);
      setSettings(settingsRes.settings);
      setHistory(historyRes.recentFolders || []);
      setLocalIP(ipRes.ip || '127.0.0.1');
      setAppVersion(versionRes.version || '1.0.0');
      setUpdateState(updateRes || {});
      applyTheme(settingsRes.settings.theme);

      if (pendingCLIRes?.folderPath) {
        await addServerFromFolder(pendingCLIRes.folderPath);
      }
    })();

    window.api.onLog((entry) => {
      setServers((prev) =>
        prev.map((s) => {
          if (s.id !== entry.serverId) return s;
          const logs = [...s.logs, entry];
          if (logs.length > settingsRef.current.maxLogLines) logs.splice(0, logs.length - settingsRef.current.maxLogLines);
          return { ...s, logs };
        }),
      );
    });

    window.api.onError((payload) => {
      setServers((prev) => prev.map((s) => (s.id === payload.serverId ? { ...s, inlineError: payload.error } : s)));
    });

    window.api.onStopped(({ serverId }) => {
      setServers((prev) => prev.map((s) => (s.id === serverId ? { ...s, running: false, tunnelUrl: '', tunnelError: '' } : s)));
    });

    window.api.onTunnelStatus(({ serverId, url, error }) => {
      setServers((prev) =>
        prev.map((s) => (s.id === serverId ? { ...s, tunnelUrl: url || '', tunnelError: error || '' } : s)),
      );
      if (!url) {
        setQrTarget((prev) => (prev?.id === serverId ? null : prev));
      }
    });

    window.api.onUpdateStatus((status) => {
      setUpdateState(status || {});
    });

    window.api.onCLIServe(async ({ folderPath }) => {


      if (!folderPath) return;
      await addServerFromFolder(folderPath);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function persistSetting(key, value) {
    const res = await window.api.setSetting(key, value);
    setSettings(res.settings);
  }

  async function refreshHistory() {
    const result = await window.api.getHistory();
    setHistory(result.recentFolders || []);
  }

  async function addServerFromFolder(folderPath) {
    if (serversRef.current.length >= MAX_SERVERS) return;

    const sanitizedFolderPath = sanitizeFolderPath(folderPath);
    if (!isAbsoluteFolderPath(sanitizedFolderPath)) return;

    const normalizedIncoming = normalizeFolderPath(sanitizedFolderPath);
    const alreadyExists = serversRef.current.some((s) => normalizeFolderPath(sanitizeFolderPath(s.folderPath)) === normalizedIncoming);
    if (alreadyExists) return;

    const id = generateId();

    const preferred = settingsRef.current.defaultPort || 8080;
    const free = await window.api.findFreePort(preferred);


    const options = {
      cors: settingsRef.current.defaultCORS,
      liveReload: settingsRef.current.defaultLiveReload,
      auth: { enabled: false, user: '', pass: '' },
    };

    const result = await window.api.startServer({ id, folderPath: sanitizedFolderPath, port: free.port, options });

    if (!result.ok) {
      setServers((prev) => [
        {
          id,
          name: serverNameFromPath(sanitizedFolderPath),
          folderPath: sanitizedFolderPath,
          port: free.port,
          portText: String(free.port),
          portError: 'Port may be unavailable',
          inlineError: result.error || 'Failed to start server',
          running: false,
          logs: [],
          copied: false,
          tunnelUrl: '',
          tunnelError: '',
          collapsed: false,
          options,
        },
        ...prev,
      ]);
      return;
    }


    await window.api.addHistory(sanitizedFolderPath);
    await refreshHistory();

    setServers((prev) => [
      {
        id,
        name: serverNameFromPath(sanitizedFolderPath),
        folderPath: sanitizedFolderPath,

        port: result.port,
        portText: String(result.port),
        portError: '',
        inlineError: '',
        running: true,
        logs: [],
        copied: false,
        collapsed: false,
        options,
      },
      ...prev,
    ]);

    setShowNewServerArea(false);

    if (settingsRef.current.autoOpenBrowser) {
      await window.api.openExternal(`http://localhost:${result.port}`);
    }
  }

  async function onChooseFolder() {
    if (serversRef.current.length >= MAX_SERVERS) return;
    const result = await window.api.openFolder();
    if (result.canceled || !result.folderPath) return;
    await addServerFromFolder(result.folderPath);
  }

  function onClickNewServer() {
    if (serversRef.current.length >= MAX_SERVERS) return;
    setShowNewServerArea((v) => !v || serversRef.current.length === 0);
  }

  async function extractDroppedFolder(event) {
    const decodeFileURI = (value) => {
      if (!value?.startsWith('file://')) return '';

      try {
        let path = decodeURIComponent(value.replace(/^file:\/\/+/, ''));
        if (/^\/[A-Za-z]:/.test(path)) path = path.slice(1);
        return path;
      } catch {
        return '';
      }
    };

    const files = Array.from(event.dataTransfer?.files || []);
    const direct = files.find((file) => file?.path)?.path;
    if (direct) return direct;

    for (const file of files) {
      const resolvedPath = await window.api.getPathForFile(file);
      if (resolvedPath) return resolvedPath;
    }

    const items = Array.from(event.dataTransfer?.items || []);

    for (const item of items) {
      const file = item.getAsFile?.();
      if (file?.path) return file.path;
      if (!file) continue;
      const resolvedPath = await window.api.getPathForFile(file);
      if (resolvedPath) return resolvedPath;
    }




    const uriList = event.dataTransfer?.getData('text/uri-list') || '';
    const uriLine = uriList
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith('#'));

    const fromUriList = decodeFileURI(uriLine || '');
    if (fromUriList) return fromUriList;

    const plainText = (event.dataTransfer?.getData('text/plain') || '').trim();
    if (!plainText) return '';

    const fromPlainUri = decodeFileURI(plainText);
    if (fromPlainUri) return fromPlainUri;

    if (/^[A-Za-z]:[\\/]/.test(plainText) || /^\\\\[^\\]+\\[^\\]+/.test(plainText)) {
      return plainText;
    }


    return '';
  }


  function onDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  function onDragEnter(event) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }

  function onDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setIsDragging(false);
  }

  async function onDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (serversRef.current.length >= MAX_SERVERS) return;

    const droppedPath = await extractDroppedFolder(event);
    if (!droppedPath) return;
    await addServerFromFolder(droppedPath);
  }

  function updateServer(id, mutator) {
    setServers((prev) => prev.map((s, i) => (s.id === id ? mutator(s, i) : s)));
  }

  function onToggleCollapse(id) {
    updateServer(id, (s) => ({ ...s, collapsed: !s.collapsed }));
  }

  function onPortChange(id, value) {
    updateServer(id, (s) => ({ ...s, portText: value, portError: '' }));
  }

  function onPortBlur(id) {
    updateServer(id, (s) => ({ ...s, portError: isValidPort(s.portText) ? '' : 'Port must be 1024–65535' }));
  }

  async function onToggleRunning(id) {
    const target = serversRef.current.find((s) => s.id === id);
    if (!target) return;

    if (target.running) {
      const result = await window.api.stopServer(id);
      if (!result.ok) {
        updateServer(id, (s) => ({ ...s, inlineError: result.error || 'Failed to stop server' }));
        return;
      }
      await window.api.stopTunnel(id);
      updateServer(id, (s) => ({ ...s, running: false, tunnelUrl: '', tunnelError: '' }));
      return;
    }

    if (!isValidPort(target.portText)) {
      updateServer(id, (s) => ({ ...s, portError: 'Port must be 1024–65535' }));
      return;
    }

    if (target.options.auth.enabled && (!target.options.auth.user || !target.options.auth.pass)) {
      updateServer(id, (s) => ({ ...s, inlineError: 'Auth username and password are required' }));
      return;
    }

    const preferred = Number(target.portText);
    const free = await window.api.findFreePort(preferred);
    const result = await window.api.startServer({
      id,
      folderPath: target.folderPath,
      port: free.port,
      options: target.options,
    });

    if (!result.ok) {
      updateServer(id, (s) => ({
        ...s,
        inlineError: result.error || 'Failed to start server',
        portError: 'Port may be unavailable',
      }));
      return;
    }

    updateServer(id, (s) => ({
      ...s,
      running: true,
      port: result.port,
      portText: String(result.port),
      inlineError: free.port !== preferred ? `Port ${preferred} is busy. Using ${free.port}.` : '',
      portError: '',
      tunnelUrl: '',
      tunnelError: '',
    }));

    if (settingsRef.current.autoOpenBrowser) {
      await window.api.openExternal(`http://localhost:${result.port}`);
    }
  }

  async function onCopyUrl(id) {
    const target = serversRef.current.find((s) => s.id === id && s.running);
    if (!target) return;

    const latestIp = (await window.api.getLocalIP())?.ip || localIP;
    setLocalIP(latestIp || '127.0.0.1');

    await navigator.clipboard.writeText(`http://${latestIp || '127.0.0.1'}:${target.port}/`);
    updateServer(id, (s) => ({ ...s, copied: true }));
    setTimeout(() => updateServer(id, (s) => ({ ...s, copied: false })), 2000);
  }


  async function onOpenUrl(id) {
    const target = serversRef.current.find((s) => s.id === id && s.running);
    if (!target) return;
    await window.api.openExternal(`http://localhost:${target.port}`);
  }

  async function onToggleOption(id, key) {
    const target = serversRef.current.find((s) => s.id === id);
    if (!target) return;

    const nextOptions = key === 'auth'
      ? { ...target.options, auth: { ...target.options.auth, enabled: !target.options.auth.enabled } }
      : { ...target.options, [key]: !target.options[key] };

    updateServer(id, (s) => ({ ...s, options: nextOptions, inlineError: '' }));

    if (!target.running) return;

    if (nextOptions.auth.enabled && (!nextOptions.auth.user || !nextOptions.auth.pass)) {
      updateServer(id, (s) => ({ ...s, inlineError: 'Auth username and password are required' }));
      return;
    }

    const preferred = Number(target.portText) || target.port;
    const free = await window.api.findFreePort(preferred);

    const stopResult = await window.api.stopServer(id);
    if (!stopResult.ok) {
      updateServer(id, (s) => ({ ...s, inlineError: stopResult.error || 'Failed to apply option changes' }));
      return;
    }

    const startResult = await window.api.startServer({
      id,
      folderPath: target.folderPath,
      port: free.port,
      options: nextOptions,
    });

    if (!startResult.ok) {
      updateServer(id, (s) => ({
        ...s,
        running: false,
        tunnelUrl: '',
        tunnelError: '',
        inlineError: startResult.error || 'Failed to apply option changes',
      }));
      return;
    }

    updateServer(id, (s) => ({
      ...s,
      running: true,
      port: startResult.port,
      portText: String(startResult.port),
      tunnelUrl: '',
      tunnelError: '',
      inlineError: startResult.port !== preferred ? `Port ${preferred} is busy. Using ${startResult.port}.` : '',
      portError: '',
    }));
  }


  function onAuthChange(id, key, value) {
    updateServer(id, (s) => ({ ...s, options: { ...s.options, auth: { ...s.options.auth, [key]: value } } }));
  }

  async function onOpenQR(id) {
    const target = serversRef.current.find((s) => s.id === id && s.running && s.tunnelUrl);
    if (!target) return;

    const auth = target.options?.auth;
    const hasAuth = !!(auth?.enabled && auth?.user && auth?.pass);

    let url = target.tunnelUrl;
    if (hasAuth) {
      try {
        const parsed = new URL(target.tunnelUrl);
        parsed.username = auth.user;
        parsed.password = auth.pass;
        url = parsed.toString();
      } catch {
        url = target.tunnelUrl;
      }
    }

    setQrTarget({ id, url });
  }




  async function onToggleTunnel(id) {
    const target = serversRef.current.find((s) => s.id === id);
    if (!target || !target.running) return;

    if (target.tunnelUrl) {
      await window.api.stopTunnel(id);
      setQrTarget((prev) => (prev?.id === id ? null : prev));
      updateServer(id, (s) => ({ ...s, tunnelUrl: '', tunnelError: '' }));
      return;
    }


    updateServer(id, (s) => ({ ...s, tunnelUrl: '', tunnelError: '' }));
    const result = await window.api.startTunnel(id, target.port);
    if (!result.ok || !result.url) {
      updateServer(id, (s) => ({ ...s, tunnelUrl: '', tunnelError: result.error || 'Failed to start public tunnel' }));
      return;
    }

    updateServer(id, (s) => ({ ...s, tunnelUrl: result.url, tunnelError: '' }));
  }


  async function onOpenTunnelUrl(id) {
    const target = serversRef.current.find((s) => s.id === id && s.tunnelUrl);
    if (!target) return;
    await window.api.openExternal(target.tunnelUrl);
  }

  async function onServeRecent(folderPath) {
    await addServerFromFolder(folderPath);
  }


  async function onRemoveServer(id) {
    const target = serversRef.current.find((s) => s.id === id);
    if (!target) return;

    await window.api.stopTunnel(id);
    if (target.running) {
      await window.api.stopServer(id);
    }

    setServers((prev) => prev.filter((s) => s.id !== id));


    const historyResult = await window.api.removeHistory(target.folderPath);
    setHistory(historyResult.recentFolders || []);
  }

  async function onRemoveRecent(folderPath) {
    const result = await window.api.removeHistory(folderPath);
    setHistory(result.recentFolders || []);
  }

  function cycleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    const next = isDark ? 'light' : 'dark';
    persistSetting('theme', next);
  }

  async function onCheckForUpdates() {
    const result = await window.api.checkForUpdates();
    if (!result?.ok && result?.error) {
      setUpdateState((prev) => ({ ...prev, status: 'error', error: result.error }));
    }
  }

  async function onDownloadUpdate() {
    const result = await window.api.downloadUpdate();
    if (!result?.ok && result?.error) {
      setUpdateState((prev) => ({ ...prev, status: 'error', error: result.error }));
    }
  }

  async function onInstallUpdate() {
    await window.api.installUpdate();
  }

  async function onToggleAll() {
    const current = serversRef.current;

    if (current.length === 0) {
      for (const item of history.slice(0, MAX_SERVERS)) {
        // Start sequentially to avoid free-port race conflicts.
        // eslint-disable-next-line no-await-in-loop
        await addServerFromFolder(item.path);
      }
      return;
    }

    if (current.some((s) => s.running)) {
      await window.api.stopAll();
      return;
    }

    for (const server of current) {
      // Start each sequentially to avoid free-port race conflicts.
      // eslint-disable-next-line no-await-in-loop
      await onToggleRunning(server.id);
    }
  }

  const visibleServers = servers.map((s, idx) => ({
    ...s,
    collapsed: s.collapsed ?? (servers.length > 2 && idx >= 1),
  }));

  return (
    <div className="flex h-full flex-col bg-app-bg text-app-text">
      <TitleBar
        runningCount={runningCount}
        onOpenSettings={() => setSettingsOpen((v) => !v)}
        onOpenAbout={() => setAboutOpen(true)}
        onCycleTheme={cycleTheme}
        theme={settings.theme}
        hasUpdateBadge={updateState.available && !updateState.downloaded}
      />


      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onClickNewServer}
              disabled={servers.length >= MAX_SERVERS}
              className="inline-flex items-center gap-1 rounded-md border border-app-border bg-app-card px-3 py-1.5 text-sm transition duration-150 hover:border-app-primary/60 hover:bg-app-bg/70 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={14} />
              {showNewServerArea && servers.length > 0 ? 'Cancel' : 'New Server'}
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-app-border bg-app-card px-2 py-1 text-xs text-app-muted hover:border-app-primary/60 hover:text-app-text"
                onClick={onToggleAll}
                disabled={servers.length === 0 && history.length === 0}
              >
                {runningCount > 0 ? 'Stop All' : 'Start All'}
              </button>
              <span className="text-sm text-app-muted">{runningCount} running</span>
            </div>
          </div>

          {servers.length === 0 ? (
            <>
              <DropZone
                isDragging={isDragging}
                onChooseFolder={onChooseFolder}
                onDragEnter={onDragEnter}
                onDragLeave={onDragLeave}
                onDragOver={onDragOver}
                onDrop={onDrop}
              />
              <RecentFolders items={history} onServe={onServeRecent} onRemove={onRemoveRecent} />
            </>
          ) : (
            <div className="space-y-3">
              <div
                className={`overflow-hidden transition-all duration-300 ease-out ${
                  showNewServerArea ? 'max-h-[420px] opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2'
                }`}
              >
                <DropZone
                  isDragging={isDragging}
                  onChooseFolder={onChooseFolder}
                  onDragEnter={onDragEnter}
                  onDragLeave={onDragLeave}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                />
              </div>

              {visibleServers.map((server) => (
                <ServerCard
                  key={server.id}
                  server={server}
                  collapsed={server.collapsed}
                  onToggleCollapse={onToggleCollapse}
                  onPortChange={onPortChange}
                  onPortBlur={onPortBlur}
                  onToggleRunning={onToggleRunning}
                  onCopyUrl={onCopyUrl}
                  onOpenUrl={onOpenUrl}
                  onToggleOption={onToggleOption}
                  onAuthChange={onAuthChange}
                  onOpenQR={onOpenQR}
                  onToggleTunnel={onToggleTunnel}
                  onOpenTunnelUrl={onOpenTunnelUrl}
                  onRemove={onRemoveServer}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onChange={persistSetting}
      />

      <QRModal open={!!qrTarget} url={qrTarget?.url || ''} onClose={() => setQrTarget(null)} />
      <AboutModal
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
        appVersion={appVersion}
        updateState={updateState}
        onCheckForUpdates={onCheckForUpdates}
        onDownloadUpdate={onDownloadUpdate}
        onInstallUpdate={onInstallUpdate}
      />
    </div>

  );
}
