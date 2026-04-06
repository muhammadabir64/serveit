function statusColor(status) {
  if (status >= 500) return 'text-red-400';
  if (status >= 400) return 'text-amber-300';
  if (status >= 300) return 'text-blue-300';
  return 'text-app-primary';
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '--';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(value) {
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour12: false });
}

export default function RequestLog({ logs }) {
  return (
    <div className="mt-4 rounded-lg border border-app-border bg-app-bg/65 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium">Request Log ({logs.length})</h3>
      </div>

      <div className="max-h-52 overflow-auto font-mono text-xs">
        <table className="w-full border-collapse">
          <thead className="text-app-muted">
            <tr>
              <th className="pb-2 text-left">TIME</th>
              <th className="pb-2 text-left">METHOD</th>
              <th className="pb-2 text-left">PATH</th>
              <th className="pb-2 text-left">STATUS</th>
              <th className="pb-2 text-left">SIZE</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, idx) => (
              <tr key={`${log.time}-${idx}`} className="border-t border-app-border/60">
                <td className="py-1.5 pr-2">{formatTime(log.time)}</td>
                <td className="py-1.5 pr-2">{log.method}</td>
                <td className="max-w-64 truncate py-1.5 pr-2">{log.path}</td>
                <td className={`py-1.5 pr-2 ${statusColor(log.status)}`}>{log.status}</td>
                <td className="py-1.5">{formatBytes(log.bytes)}</td>
              </tr>
            ))}
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-app-muted">
                  No requests yet
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
