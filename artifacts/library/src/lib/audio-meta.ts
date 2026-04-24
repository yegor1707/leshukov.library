export interface AudioMeta {
  narrator: string;
  about: string;
}

export const SECTION_SEP = " /// ";

export interface PartFields {
  section: string;
  chapter: string;
  title: string;
}

export function splitPartTitle(raw: string): PartFields {
  const t = (raw ?? "").trim();
  if (!t) return { section: "", chapter: "", title: "" };
  const parts = t.split(SECTION_SEP);
  if (parts.length >= 3) {
    return {
      section: (parts[0] || "").trim(),
      chapter: (parts[1] || "").trim(),
      title: parts.slice(2).join(SECTION_SEP).trim(),
    };
  }
  if (parts.length === 2) {
    // Legacy format: "section /// title" → treat as section + title (no chapter)
    return {
      section: (parts[0] || "").trim(),
      chapter: "",
      title: (parts[1] || "").trim(),
    };
  }
  return { section: "", chapter: "", title: t };
}

export function joinPartTitle(section: string, chapter: string, title: string): string {
  const s = (section ?? "").trim();
  const c = (chapter ?? "").trim();
  const t = (title ?? "").trim();
  if (!s && !c && !t) return "";
  return `${s}${SECTION_SEP}${c}${SECTION_SEP}${t}`;
}

export function partDisplay(fields: PartFields): string {
  const { chapter, title } = fields;
  if (chapter && title) return `${chapter}. ${title}`;
  if (chapter) return chapter;
  if (title) return title;
  return "Без названия";
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
