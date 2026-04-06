const Store = require('electron-store');

const settingsStore = new Store({
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
  },
});

const historyStore = new Store({
  name: 'history',
  defaults: {
    recentFolders: [],
  },
});

module.exports = { settingsStore, historyStore };
