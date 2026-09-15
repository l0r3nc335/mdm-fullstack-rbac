import { useEffect, useRef, useState } from 'react';

type AvatarPickerProps = {
  imageUrl: string | null;
  canEdit: boolean;
  onUploadFile: (file: File) => Promise<void>;
  onUploadBlob: (blob: Blob, fileName: string) => Promise<void>;
  onRemove?: () => Promise<void>;
};

export function AvatarPicker({
  imageUrl,
  canEdit,
  onUploadFile,
  onUploadBlob,
  onRemove,
}: AvatarPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hovered, setHovered] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function openCamera() {
    setError(null);
    setSnapshot(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      });
    } catch {
      setError('Camera access was denied or is unavailable on this device.');
    }
  }

  function closeCamera() {
    stopCamera();
    setCameraOpen(false);
    setSnapshot(null);
  }

  function captureFrame() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 512;
    canvas.height = video.videoHeight || 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setSnapshot(canvas.toDataURL('image/jpeg', 0.92));
  }

  async function confirmSnapshot() {
    if (!snapshot) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(snapshot);
      const blob = await response.blob();
      await onUploadBlob(blob, 'camera-capture.jpg');
      closeCamera();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save camera photo');
    } finally {
      setBusy(false);
    }
  }

  async function handleFileChange(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await onUploadFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const showEmptyActions = canEdit && !imageUrl && hovered;

  return (
    <div className="space-y-3">
      <div
        className="relative h-40 w-40 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="Profile avatar" className="h-full w-full object-cover" />
        ) : (
          <button
            type="button"
            className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 text-slate-400"
            onClick={() => canEdit && fileInputRef.current?.click()}
            disabled={!canEdit || busy}
            aria-label="Add profile picture"
          >
            <span className="text-4xl">+</span>
            <span className="text-xs">Add photo</span>
          </button>
        )}

        {showEmptyActions && (
          <div className="absolute inset-0 flex items-end justify-center gap-2 bg-slate-900/45 p-3">
            <button
              type="button"
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Upload
            </button>
            <button
              type="button"
              className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white shadow"
              onClick={(e) => {
                e.stopPropagation();
                void openCamera();
              }}
            >
              Camera
            </button>
          </div>
        )}

        {canEdit && imageUrl && hovered && (
          <div className="absolute inset-0 flex items-end justify-center gap-2 bg-slate-900/45 p-3">
            <button
              type="button"
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload
            </button>
            <button
              type="button"
              className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white shadow"
              onClick={() => void openCamera()}
            >
              Camera
            </button>
            {onRemove && (
              <button
                type="button"
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow"
                onClick={() => void onRemove()}
              >
                Remove
              </button>
            )}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => void handleFileChange(e.target.files?.[0])}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
      {busy && <p className="text-sm text-slate-500">Saving avatar…</p>}

      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Camera</h3>
            <p className="mt-1 text-sm text-slate-500">
              Capture a photo, then choose Use or Redo.
            </p>

            <div className="mt-4 overflow-hidden rounded-xl bg-black">
              {snapshot ? (
                <img src={snapshot} alt="Captured preview" className="aspect-square w-full object-cover" />
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="aspect-square w-full object-cover"
                />
              )}
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
                onClick={closeCamera}
                disabled={busy}
              >
                Cancel
              </button>
              {snapshot ? (
                <>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
                    onClick={() => setSnapshot(null)}
                    disabled={busy}
                  >
                    Redo
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-teal-700 px-4 py-2 text-sm text-white"
                    onClick={() => void confirmSnapshot()}
                    disabled={busy}
                  >
                    Use this photo
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="rounded-lg bg-teal-700 px-4 py-2 text-sm text-white"
                  onClick={captureFrame}
                >
                  Capture
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
