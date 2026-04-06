import { FolderOpen } from 'lucide-react';

export default function DropZone({ isDragging, onChooseFolder, onDragEnter, onDragLeave, onDragOver, onDrop }) {
  return (
    <div
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`mx-auto flex w-full max-w-xl flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition duration-150 ${
        isDragging
          ? 'animate-pulseBorder border-app-primary bg-app-primary/5 shadow-[0_0_0_3px_rgba(110,231,183,0.2)]'
          : 'border-app-border bg-app-card/30'
      }`}
    >
      <FolderOpen size={64} className={isDragging ? 'text-app-primary' : 'text-app-muted'} />
      <h2 className="mt-4 text-xl font-semibold">Drop a folder here</h2>
      <p className="mt-2 text-sm text-app-muted">or pick one manually</p>
      <button
        type="button"
        onClick={onChooseFolder}
        className="mt-6 rounded-md border border-app-border bg-app-card px-4 py-2 text-sm font-medium transition duration-150 hover:border-app-primary/60 hover:text-app-primary"
      >
        Choose Folder
      </button>
    </div>
  );
}
