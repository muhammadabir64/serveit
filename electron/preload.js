const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  startServer: (cfg) => ipcRenderer.invoke('server:start', cfg),
  stopServer: (id) => ipcRenderer.invoke('server:stop', { id }),
  stopAll: () => ipcRenderer.invoke('server:stopAll'),
  startTunnel: (id, port) => ipcRenderer.invoke('tunnel:start', { id, port }),
  stopTunnel: (id) => ipcRenderer.invoke('tunnel:stop', { id }),
  findFreePort: (start) => ipcRenderer.invoke('port:findFree', { startPort: start }),
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  getPathForFile: (file) => {
    if (!file || !webUtils?.getPathForFile) return '';
    try {
      return webUtils.getPathForFile(file) || '';
    } catch {
      return '';
    }
  },
  getLocalIP: () => ipcRenderer.invoke('app:getLocalIP'),
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getUpdateStatus: () => ipcRenderer.invoke('app:getUpdateStatus'),
  checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates'),
  downloadUpdate: () => ipcRenderer.invoke('app:downloadUpdate'),
  installUpdate: () => ipcRenderer.invoke('app:installUpdate'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', { key, value }),
  getHistory: () => ipcRenderer.invoke('history:get'),
  addHistory: (folderPath) => ipcRenderer.invoke('history:add', { folderPath }),
  removeHistory: (folderPath) => ipcRenderer.invoke('history:remove', { folderPath }),
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', { url }),
  getPendingServeFolder: () => ipcRenderer.invoke('cli:getPendingServeFolder'),
  minimize: () => ipcRenderer.invoke('app:minimize'),
  maximize: () => ipcRenderer.invoke('app:maximize'),
  close: () => ipcRenderer.invoke('app:close'),
  onLog: (cb) => ipcRenderer.on('server:log', (_, data) => cb(data)),
  onError: (cb) => ipcRenderer.on('server:error', (_, data) => cb(data)),
  onStopped: (cb) => ipcRenderer.on('server:stopped', (_, data) => cb(data)),
  onTunnelStatus: (cb) => ipcRenderer.on('tunnel:status', (_, data) => cb(data)),
  onUpdateStatus: (cb) => ipcRenderer.on('app:updateStatus', (_, data) => cb(data)),
  onCLIServe: (cb) => ipcRenderer.on('cli:serveFolder', (_, data) => cb(data)),
});

