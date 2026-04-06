import { X } from 'lucide-react';

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`h-6 w-11 rounded-full border transition duration-150 ${checked ? 'border-app-primary bg-app-primary/30' : 'border-app-border bg-app-bg'}`}
    >
      <span
        className={`block h-4 w-4 rounded-full border border-app-border bg-app-card transition duration-150 ${checked ? 'translate-x-5 border-app-primary bg-app-primary' : 'translate-x-1'}`}
      />
    </button>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-app-text">{label}</span>
      {children}
    </div>
  );
}

export default function SettingsPanel({ open, settings, onChange, onClose }) {
  return (
    <div className={`fixed inset-0 top-10 z-40 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <button
        type="button"
        aria-label="Close settings"
        className={`absolute inset-0 bg-black/20 transition duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      <aside
        className={`absolute right-0 top-0 h-full w-[360px] border-l border-app-border bg-app-card p-4 transition duration-200 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Settings</h2>
          <button type="button" className="rounded-md p-1 text-app-muted hover:text-app-text" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 overflow-auto pb-8">
        <section className="rounded-lg border border-app-border p-3">
          <h3 className="mb-2 text-xs uppercase tracking-wide text-app-muted">General</h3>
          <Row label="Auto-open browser on start">
            <Toggle checked={settings.autoOpenBrowser} onChange={(v) => onChange('autoOpenBrowser', v)} />
          </Row>
          <Row label="Start with OS">
            <Toggle checked={settings.autoStartAtLogin} onChange={(v) => onChange('autoStartAtLogin', v)} />
          </Row>
          <Row label="Minimize to tray on close">
            <Toggle checked={settings.startMinimized} onChange={(v) => onChange('startMinimized', v)} />
          </Row>
          <Row label="Show OS notifications">
            <Toggle checked={settings.showNotifications} onChange={(v) => onChange('showNotifications', v)} />
          </Row>
        </section>

        <section className="rounded-lg border border-app-border p-3">
          <h3 className="mb-2 text-xs uppercase tracking-wide text-app-muted">Server Defaults</h3>
          <Row label="Starting port">
            <input
              value={settings.defaultPort}
              onChange={(e) => onChange('defaultPort', Number(e.target.value) || 8080)}
              className="w-24 rounded-sm border border-app-border bg-transparent px-2 py-1 font-mono text-sm"
            />
          </Row>
          <Row label="CORS on by default">
            <Toggle checked={settings.defaultCORS} onChange={(v) => onChange('defaultCORS', v)} />
          </Row>
          <Row label="Live reload on by default">
            <Toggle checked={settings.defaultLiveReload} onChange={(v) => onChange('defaultLiveReload', v)} />
          </Row>
        </section>

        <section className="rounded-lg border border-app-border p-3">
          <h3 className="mb-2 text-xs uppercase tracking-wide text-app-muted">Appearance</h3>
          <div className="grid grid-cols-3 gap-2">
            {['light', 'dark', 'system'].map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => onChange('theme', theme)}
                className={`rounded-md border px-2 py-1 text-sm capitalize ${
                  settings.theme === theme ? 'border-app-primary text-app-primary' : 'border-app-border text-app-muted'
                }`}
              >
                {theme}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-app-border p-3">
          <h3 className="mb-2 text-xs uppercase tracking-wide text-app-muted">Updates</h3>
          <p className="text-xs text-app-muted">Updates are delivered from GitHub Releases in packaged builds.</p>
        </section>


        <section className="rounded-lg border border-app-border p-3">
          <h3 className="mb-2 text-xs uppercase tracking-wide text-app-muted">About</h3>
          <p className="text-sm">ServeIt</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => window.api.openExternal('https://serveit.app')}
              className="rounded-md border border-app-border px-2 py-1 text-sm hover:border-app-primary/60"
            >
              Website
            </button>
          </div>
        </section>
        </div>
      </aside>
    </div>
  );
}
