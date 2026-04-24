export function normalizeAudioUrl(raw: string): string {
  const url = raw.trim();
  if (!url) return url;

  const driveFilePattern = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const driveOpenPattern = /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/;
  const driveUcPattern = /drive\.google\.com\/uc\?[^"'\s]*id=([a-zA-Z0-9_-]+)/;

  let match = url.match(driveFilePattern) || url.match(driveOpenPattern) || url.match(driveUcPattern);
  if (match) {
    const fileId = match[1];
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  if (url.includes("dropbox.com")) {
    return url.replace(/[?&]dl=0/, "").replace(/[?&]raw=1/, "") + (url.includes("?") ? "&" : "?") + "dl=1";
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
