import { ChevronDown, ChevronUp, Copy, ExternalLink, Globe, Play, QrCode, Square, Trash2 } from 'lucide-react';
import PortInput from './PortInput';
import RequestLog from './RequestLog';

function Toggle({ checked, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2 py-0.5 text-xs transition duration-150 ${checked ? 'border-app-primary text-app-primary' : 'border-app-border text-app-muted'}`}
    >
      {checked ? 'on' : 'off'}
    </button>
  );
}

export default function ServerCard({
  server,
  collapsed,
  onToggleCollapse,
  onPortChange,
  onPortBlur,
  onToggleRunning,
  onCopyUrl,
  onOpenUrl,
  onToggleOption,
  onAuthChange,
  onOpenQR,
  onToggleTunnel,
  onOpenTunnelUrl,
  onRemove,
}) {
  const url = server.running ? `http://localhost:${server.port}` : '';

  return (
    <section className="rounded-lg border border-app-border bg-app-card p-4 transition duration-150">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${server.running ? 'bg-app-primary' : 'bg-red-400'}`} />
            <h3 className="text-base font-semibold">{server.name}</h3>
          </div>
          <p className="mt-1 text-sm text-app-muted">{server.folderPath}</p>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            Port
            <PortInput
              value={server.portText}
              disabled={server.running}
              error={server.portError}
              onChange={(value) => onPortChange(server.id, value)}
              onBlur={() => onPortBlur(server.id)}
            />
          </label>
          <button
            type="button"
            className="rounded-md border border-app-border bg-app-bg/60 p-1.5 text-app-muted hover:border-red-400/60 hover:text-red-300"
            onClick={() => onRemove(server.id)}
            title="Remove server"
            aria-label="Remove server"
          >
            <Trash2 size={14} />
          </button>
          <button
            type="button"
            className="rounded-md border border-app-border bg-app-bg/60 p-1.5 text-app-muted hover:border-app-primary/60 hover:text-app-text"
            onClick={() => onToggleCollapse(server.id)}
          >
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {!collapsed ? (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleRunning(server.id)}
              className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition duration-150 ${
                server.running
                  ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                  : 'bg-app-primary/20 text-app-primary hover:bg-app-primary/30'
              }`}
            >
              {server.running ? <Square size={14} /> : <Play size={14} />}
              {server.running ? 'Stop' : 'Start'}
            </button>

            <button
              type="button"
              onClick={() => onCopyUrl(server.id)}
              disabled={!server.running}
              className="inline-flex items-center gap-1 rounded-md border border-app-border bg-app-bg/60 px-3 py-1.5 text-sm transition duration-150 hover:border-app-primary/60 hover:bg-app-bg/85 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy size={14} />
              {server.copied ? 'Copied!' : 'Copy URL'}
            </button>

            <button
              type="button"
              onClick={() => onOpenUrl(server.id)}
              disabled={!server.running}
              className="inline-flex items-center gap-1 rounded-md border border-app-border bg-app-bg/60 px-3 py-1.5 text-sm transition duration-150 hover:border-app-primary/60 hover:bg-app-bg/85 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ExternalLink size={14} />
              Open
            </button>

            {server.tunnelUrl ? (
              <button
                type="button"
                onClick={() => onOpenQR(server.id)}
                className="inline-flex items-center gap-1 rounded-md border border-app-border bg-app-bg/60 px-3 py-1.5 text-sm transition duration-150 hover:border-app-primary/60 hover:bg-app-bg/85"
              >
                <QrCode size={14} />
                QR
              </button>
            ) : null}


            <button
              type="button"
              onClick={() => onToggleTunnel(server.id)}
              disabled={!server.running}
              className="inline-flex items-center gap-1 rounded-md border border-app-border bg-app-bg/60 px-3 py-1.5 text-sm transition duration-150 hover:border-app-primary/60 hover:bg-app-bg/85 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Globe size={14} />
              {server.tunnelUrl ? 'Stop Public' : 'Public Share'}
            </button>

            <button
              type="button"
              onClick={() => onOpenTunnelUrl(server.id)}
              disabled={!server.tunnelUrl}
              className="inline-flex items-center gap-1 rounded-md border border-app-border bg-app-bg/60 px-3 py-1.5 text-sm transition duration-150 hover:border-app-primary/60 hover:bg-app-bg/85 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ExternalLink size={14} />
              Open Public
            </button>

            <span className="ml-2 font-mono text-sm text-app-primary">{server.tunnelUrl || url}</span>

          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              CORS
              <Toggle checked={server.options.cors} onClick={() => onToggleOption(server.id, 'cors')} />
            </div>
            <div className="flex items-center gap-2">
              Live Reload
              <Toggle checked={server.options.liveReload} onClick={() => onToggleOption(server.id, 'liveReload')} />
            </div>
            <div className="flex items-center gap-2">
              Auth
              <Toggle checked={server.options.auth.enabled} onClick={() => onToggleOption(server.id, 'auth')} />
            </div>
          </div>

          {server.options.auth.enabled ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                placeholder="Username"
                value={server.options.auth.user}
                onChange={(e) => onAuthChange(server.id, 'user', e.target.value)}
                className="rounded-sm border border-app-border bg-transparent px-2 py-1 text-sm"
              />
              <input
                placeholder="Password"
                type="password"
                value={server.options.auth.pass}
                onChange={(e) => onAuthChange(server.id, 'pass', e.target.value)}
                className="rounded-sm border border-app-border bg-transparent px-2 py-1 text-sm"
              />
            </div>
          ) : null}

          {server.inlineError ? <p className="mt-3 text-sm text-red-300">{server.inlineError}</p> : null}
          {server.tunnelError ? <p className="mt-2 text-sm text-red-300">{server.tunnelError}</p> : null}
          <RequestLog logs={server.logs} />
        </>
      ) : null}
    </section>
  );
}
 