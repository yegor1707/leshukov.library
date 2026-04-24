export function normalizeAudioUrl(raw: string): string {
  const url = raw.trim();
  if (!url) return url;

  const isDrive = /drive\.google\.com|docs\.google\.com/.test(url);
  const isDropbox = /dropbox\.com/.test(url);

  if (isDrive || isDropbox) {
    return `/api/audio-proxy?url=${encodeURIComponent(url)}`;
  }

  return url;
}

export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}
