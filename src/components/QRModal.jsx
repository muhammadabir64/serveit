import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function QRModal({ open, url, onClose }) {
  const [image, setImage] = useState('');

  useEffect(() => {
    if (!open || !url) return;
    QRCode.toDataURL(url, { margin: 1, width: 240 }).then(setImage).catch(() => setImage(''));
  }, [open, url]);

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
      <div className="w-full max-w-sm rounded-lg border border-app-border bg-app-card p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Public QR Code</h3>
          <button type="button" className="rounded-md p-1 text-app-muted hover:text-app-text" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="flex flex-col items-center gap-3">
          {image ? <img src={image} alt="Public server QR" className="rounded-md bg-white p-2" /> : null}
          <p className="font-mono text-xs text-app-primary break-all">{url}</p>
        </div>

      </div>
    </div>
  );
}
