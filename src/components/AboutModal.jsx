import { Mail, Globe, CircleUserRound, X } from 'lucide-react';
import { useEffect } from 'react';

function LinkRow({ icon: Icon, label, value, href }) {
  const open = () => {
    if (!href) return;
    window.api.openExternal(href);
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-app-border bg-app-bg/50 px-3 py-2">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <Icon size={15} className="text-app-muted" />
        <span className="text-app-muted">{label}</span>
      </div>
      <button
        type="button"
        onClick={open}
        className="max-w-[70%] truncate rounded px-1 text-right text-sm text-app-primary hover:underline"
        title={value}
      >
        {value}
      </button>
    </div>
  );
}

function UpdateSection({ updateState, onCheckForUpdates, onDownloadUpdate, onInstallUpdate }) {
  const hasAvailable = !!updateState?.available;
  const isDownloaded = !!updateState?.downloaded;
  const isChecking = !!updateState?.checking;
  const status = updateState?.status || 'idle';
  const version = updateState?.version || '';
  const error = updateState?.error || '';
  const message = updateState?.message || '';

  return (
    <div className="mb-4 rounded-md border border-app-border bg-app-bg/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">Software Updates</p>
        {hasAvailable && !isDownloaded && <span className="h-2.5 w-2.5 rounded-full bg-red-500" title="Update available" />}
      </div>

      <p className="text-xs text-app-muted">
        {error || message || (hasAvailable ? `New version available: ${version || 'latest'}` : 'Check manually when you want.')}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isChecking || status === 'downloading'}
          onClick={onCheckForUpdates}
          className="rounded-md border border-app-border bg-app-card px-3 py-1.5 text-xs hover:border-app-primary/60 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isChecking ? 'Checking...' : 'Check for Updates'}
        </button>

        {hasAvailable && !isDownloaded && (
          <button
            type="button"
            disabled={status === 'downloading'}
            onClick={onDownloadUpdate}
            className="rounded-md border border-app-primary/50 bg-app-primary/15 px-3 py-1.5 text-xs text-app-primary hover:bg-app-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === 'downloading' ? 'Downloading...' : `Download ${version || 'Update'}`}
          </button>
        )}

        {isDownloaded && (
          <button
            type="button"
            onClick={onInstallUpdate}
            className="rounded-md border border-app-primary/50 bg-app-primary/15 px-3 py-1.5 text-xs text-app-primary hover:bg-app-primary/25"
          >
            Install & Restart
          </button>
        )}
      </div>
    </div>
  );
}

export default function AboutModal({
  open,
  onClose,
  appVersion,
  updateState,
  onCheckForUpdates,
  onDownloadUpdate,
  onInstallUpdate,
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border border-app-border bg-app-card p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">About ServeIt</h3>
          <button type="button" className="rounded-md p-1 text-app-muted hover:text-app-text" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="mb-4 rounded-md border border-app-border bg-app-bg/40 p-3">
          <p className="text-base font-semibold">ServeIt v{appVersion || '1.0.0'}</p>
          <p className="mt-1 text-sm text-app-muted">Share folders over LAN or worldwide with secure public tunnels.</p>
        </div>

        <UpdateSection
          updateState={updateState}
          onCheckForUpdates={onCheckForUpdates}
          onDownloadUpdate={onDownloadUpdate}
          onInstallUpdate={onInstallUpdate}
        />

        <div className="space-y-2">
          <LinkRow icon={CircleUserRound} label="Developed by" value="Muhammad ABir" href="https://muhammadabir64.netlify.app" />
          <LinkRow icon={Globe} label="Repository" value="github.com/muhammadabir64/serveit" href="https://github.com/muhammadabir64/serveit" />
          <LinkRow icon={Mail} label="Email" value="muhammadabir404@gmail.com" href="mailto:muhammadabir404@gmail.com" />
        </div>
      </div>
    </div>
  );
}

