export default function PortInput({ value, disabled, error, onChange, onBlur }) {
  return (
    <div className="w-28">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        className={`w-full rounded-sm border bg-transparent px-2 py-1 font-mono text-sm outline-none transition duration-150 ${
          error ? 'border-red-400 text-red-300' : 'border-app-border focus:border-app-primary'
        } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      />
      {error ? <p className="mt-1 text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
