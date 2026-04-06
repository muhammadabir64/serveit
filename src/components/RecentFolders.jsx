import { Play, X } from 'lucide-react';

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return 'today';
  const days = Math.floor(diff / day);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
}

export default function RecentFolders({ items, onServe, onRemove }) {
  if (!items.length) return null;

  return (
    <section className="mx-auto mt-6 w-full max-w-xl">
      <h3 className="mb-2 text-sm font-semibold text-app-muted">Recent</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.path} className="flex items-center justify-between rounded-lg border border-app-border bg-app-card/40 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm">{item.path}</p>
              <p className="text-xs text-app-muted">{timeAgo(item.lastServed)}</p>
            </div>
            <div className="ml-2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => onServe(item.path)}
                className="inline-flex items-center gap-1 rounded-md border border-app-border px-2 py-1 text-xs hover:border-app-primary/60"
              >
                <Play size={12} />
                Serve
              </button>
              <button
                type="button"
                onClick={() => onRemove(item.path)}
                className="rounded-md p-1 text-app-muted hover:text-red-300"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
