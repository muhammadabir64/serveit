import { CircleHelp, Minus, Moon, Settings, Sun, Square, X } from 'lucide-react';

export default function TitleBar({
  runningCount = 0,
  onOpenSettings,
  onOpenAbout,
  onCycleTheme,
  theme = 'system',
  hasUpdateBadge = false,
}) {


  return (
    <header className="titlebar-drag flex h-10 items-center justify-between border-b border-app-border bg-app-bg px-3">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 rounded-sm bg-app-primary/80" />
        <span className="text-sm font-semibold">


          ServeIt {runningCount > 0 ? `(${runningCount} running)` : ''}
        </span>
      </div>

      <div className="titlebar-no-drag flex items-center gap-1">
        <button
          type="button"
          aria-label="Theme"
          className="rounded-md p-1.5 text-app-muted transition duration-150 hover:bg-app-card hover:text-app-text"
          onClick={onCycleTheme}
        >
          {theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button
          type="button"
          aria-label="About"
          className="relative rounded-md p-1.5 text-app-muted transition duration-150 hover:bg-app-card hover:text-app-text"
          onClick={onOpenAbout}
        >
          <CircleHelp size={16} />
          {hasUpdateBadge && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />}
        </button>
        <button
          type="button"
          aria-label="Settings"
          className="rounded-md p-1.5 text-app-muted transition duration-150 hover:bg-app-card hover:text-app-text"
          onClick={onOpenSettings}
        >
          <Settings size={16} />
        </button>

        <button
          type="button"
          aria-label="Minimize"
          className="rounded-md p-1.5 text-app-muted transition duration-150 hover:bg-app-card hover:text-app-text"
          onClick={() => window.api.minimize()}
        >
          <Minus size={16} />
        </button>
        <button
          type="button"
          aria-label="Maximize"
          className="rounded-md p-1.5 text-app-muted transition duration-150 hover:bg-app-card hover:text-app-text"
          onClick={() => window.api.maximize()}
        >
          <Square size={16} />
        </button>
        <button
          type="button"
          aria-label="Close"
          className="rounded-md p-1.5 text-app-muted transition duration-150 hover:bg-red-500/20 hover:text-red-300"
          onClick={() => window.api.close()}
        >
          <X size={16} />
        </button>
      </div>
    </header>
  );
}
