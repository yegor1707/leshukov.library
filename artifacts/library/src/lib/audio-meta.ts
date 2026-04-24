export interface AudioMeta {
  narrator: string;
  about: string;
}

export const SECTION_SEP = " /// ";

export function splitPartTitle(raw: string): { section: string; title: string } {
  const t = (raw ?? "").trim();
  if (!t) return { section: "", title: "" };
  const idx = t.indexOf(SECTION_SEP);
  if (idx < 0) return { section: "", title: t };
  return {
    section: t.slice(0, idx).trim(),
    title: t.slice(idx + SECTION_SEP.length).trim(),
  };
}

export function joinPartTitle(section: string, title: string): string {
  const s = (section ?? "").trim();
  const t = (title ?? "").trim();
  if (s && t) return `${s}${SECTION_SEP}${t}`;
  if (s) return s;
  return t;
}

export async function fetchAudioMeta(bookId: string): Promise<AudioMeta> {
  const res = await fetch(`/api/books/${bookId}/audio-meta`);
  if (!res.ok) return { narrator: "", about: "" };
  return res.json();
}

export async function saveAudioMeta(bookId: string, meta: AudioMeta): Promise<AudioMeta> {
  const res = await fetch(`/api/books/${bookId}/audio-meta`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(meta),
  });
  if (!res.ok) throw new Error("Failed to save audio meta");
  return res.json();
}
