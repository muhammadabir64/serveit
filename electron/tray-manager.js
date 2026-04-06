const { Menu, Tray, nativeImage, shell, app } = require('electron');
const path = require('path');
const fs = require('fs');

function resolveTrayIcon() {
  const candidate = path.join(__dirname, '../assets/tray-icon.png');
  if (fs.existsSync(candidate)) return candidate;

  const fallback = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=',
  );
  return fallback;
}

class TrayManager {
  constructor(mainWindow, serverManager, onStopAll) {
    this.win = mainWindow;
    this.serverManager = serverManager;
    this.onStopAll = onStopAll;
    this.tray = new Tray(resolveTrayIcon());
    this.tray.setToolTip('ServeIt');
    this.tray.on('click', () => this.toggleWindow());
    this.update([]);
  }

  toggleWindow() {
    if (this.win.isVisible()) this.win.hide();
    else {
      this.win.show();
      this.win.focus();
    }
  }

  update(servers) {
    const running = servers.length;
    this.tray.setToolTip(running > 0 ? `ServeIt (${running} running)` : 'ServeIt');

    const serverItems =
      servers.length === 0
        ? [{ label: 'No servers running', enabled: false }]
        : servers.map((s) => ({
            label: `${s.name}  :${s.port}`,
            click: () => shell.openExternal(`http://localhost:${s.port}`),
          }));

    const menu = Menu.buildFromTemplate([
      {
        label: running > 0 ? `${running} server(s) running` : 'ServeIt',
        enabled: false,
      },
      { type: 'separator' },
      ...serverItems,
      { type: 'separator' },
      {
        label: 'Open ServeIt',
        click: () => {
          this.win.show();
          this.win.focus();
        },
      },
      {
        label: 'Stop All',
        enabled: running > 0,
        click: () => this.onStopAll(),
      },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ]);

    this.tray.setContextMenu(menu);
  }

  destroy() {
    this.tray?.destroy();
  }
}

module.exports = TrayManager;
