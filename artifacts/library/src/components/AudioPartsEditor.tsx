import { useState, useEffect } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import {
  useAddAudioPart,
  useUpdateAudioPart,
  useDeleteAudioPart,
  getListAudioPartsQueryKey,
  type AudioPart,
} from "@workspace/api-client-react";
import { showToast } from "@/components/Toast";
import { normalizeAudioUrl } from "@/lib/audio-url";
import {
  fetchAudioMeta,
  saveAudioMeta,
  splitPartTitle,
  joinPartTitle,
  type AudioMeta,
} from "@/lib/audio-meta";

interface Props {
  bookId: string;
  parts: AudioPart[];
  onClose: () => void;
}

export function AudioPartsEditor({ bookId, parts, onClose }: Props) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListAudioPartsQueryKey(bookId) });

  const addMut = useAddAudioPart({ mutation: { onSuccess: invalidate } });
  const updateMut = useUpdateAudioPart({ mutation: { onSuccess: invalidate } });
  const deleteMut = useDeleteAudioPart({ mutation: { onSuccess: invalidate } });

  // Audio meta (narrator / about whole audiobook)
  const { data: meta } = useQuery({
    queryKey: ["audio-meta", bookId],
    queryFn: () => fetchAudioMeta(bookId),
  });
  const [narrator, setNarrator] = useState("");
  const [about, setAbout] = useState("");
  useEffect(() => {
    if (meta) {
      setNarrator(meta.narrator || "");
      setAbout(meta.about || "");
    }
  }, [meta]);

  const saveMetaMut = useMutation({
    mutationFn: (m: AudioMeta) => saveAudioMeta(bookId, m),
    onSuccess: (data) => {
      queryClient.setQueryData(["audio-meta", bookId], data);
      showToast("Сохранено");
    },
    onError: () => showToast("Ошибка сохранения"),
  });

  const handleSaveMeta = () => {
    saveMetaMut.mutate({ narrator: narrator.trim(), about: about.trim() });
  };

  // Section auto-fill: remember last used section as default for new part
  const lastSection = (() => {
    if (!parts.length) return "";
    const { section } = splitPartTitle(parts[parts.length - 1].title);
    return section;
  })();

  const [newSection, setNewSection] = useState(lastSection);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  useEffect(() => {
    setNewSection(lastSection);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parts.length]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSection, setEditSection] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");

  const handleAdd = async () => {
    if (!newUrl.trim()) {
      showToast("Введите ссылку на аудиофайл");
      return;
    }
    const finalTitle = joinPartTitle(newSection.trim(), newTitle.trim());
    if (!finalTitle) {
      // Auto-name as just the next number
      const auto = `Глава ${parts.length + 1}`;
      try {
        await addMut.mutateAsync({
          id: bookId,
          data: { title: auto, url: newUrl.trim() },
        });
        setNewTitle("");
        setNewUrl("");
        showToast("Часть добавлена");
      } catch {
        showToast("Ошибка добавления");
      }
      return;
    }
    try {
      await addMut.mutateAsync({
        id: bookId,
        data: { title: finalTitle, url: newUrl.trim() },
      });
      setNewTitle("");
      setNewUrl("");
      showToast("Часть добавлена");
    } catch {
      showToast("Ошибка добавления");
    }
  };

  const startEdit = (p: AudioPart) => {
    const { section, title } = splitPartTitle(p.title);
    setEditingId(p.id);
    setEditSection(section);
    setEditTitle(title);
    setEditUrl(p.url);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditSection("");
    setEditTitle("");
    setEditUrl("");
  };

  const saveEdit = async (partId: string) => {
    if (!editUrl.trim()) {
      showToast("Введите ссылку");
      return;
    }
    const finalTitle =
      joinPartTitle(editSection.trim(), editTitle.trim()) ||
      `Глава ${parts.findIndex((p) => p.id === partId) + 1}`;
    try {
      await updateMut.mutateAsync({
        id: bookId,
        partId,
        data: { title: finalTitle, url: editUrl.trim() },
      });
      cancelEdit();
      showToast("Сохранено");
    } catch {
      showToast("Ошибка сохранения");
    }
  };

  const handleDelete = async (partId: string) => {
    if (!window.confirm("Удалить эту часть?")) return;
    try {
      await deleteMut.mutateAsync({ id: bookId, partId });
      showToast("Удалено");
    } catch {
      showToast("Ошибка удаления");
    }
  };

  return (
    <div className="ape-wrap">
      {/* General audiobook info */}
      <div className="ape-meta">
        <div className="ape-section-label">Об аудиокниге</div>
        <input
          type="text"
          value={narrator}
          onChange={(e) => setNarrator(e.target.value)}
          placeholder="Кто озвучивает (например: Александр Клюквин)"
          className="ape-input"
        />
        <textarea
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          placeholder="Дополнительно: студия, год записи, любые заметки об аудиокниге…"
          className="ape-input ape-textarea"
          rows={2}
        />
        <button
          className="vedit ape-meta-save"
          onClick={handleSaveMeta}
          disabled={saveMetaMut.isPending}
        >
          {saveMetaMut.isPending ? "Сохранение…" : "Сохранить общую информацию"}
        </button>
      </div>

      {/* Existing parts */}
      {parts.length > 0 && (
        <div>
          <div className="ape-section-label">Части ({parts.length})</div>
          <div className="ape-list">
            {parts.map((p, i) => {
              const { section, title } = splitPartTitle(p.title);
              return (
                <div key={p.id} className="ape-item">
                  {editingId === p.id ? (
                    <>
                      <div className="ape-edit">
                        <span className="ape-num">{String(i + 1).padStart(2, "0")}</span>
                        <div className="ape-fields">
                          <input
                            type="text"
                            value={editSection}
                            onChange={(e) => setEditSection(e.target.value)}
                            placeholder="Раздел / Часть (опционально)"
                            className="ape-input ape-input-sm"
                          />
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            placeholder="Название главы (опционально)"
                            className="ape-input"
                          />
                          <input
                            type="text"
                            value={editUrl}
                            onChange={(e) => setEditUrl(e.target.value)}
                            placeholder="URL аудиофайла"
                            className="ape-input ape-url"
                          />
                        </div>
                      </div>
                      <div className="ape-actions">
                        <button className="vedit" onClick={cancelEdit}>Отмена</button>
                        <button className="sbtn" style={{ margin: 0 }} onClick={() => saveEdit(p.id)} disabled={updateMut.isPending}>
                          {updateMut.isPending ? "…" : "Сохранить"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="ape-num">{String(i + 1).padStart(2, "0")}</span>
                      <div className="ape-info">
                        {section && <div className="ape-section-tag">{section}</div>}
                        <div className="ape-title">{title || `Глава ${i + 1}`}</div>
                        <div className="ape-url-display" title={p.url}>
                          {(() => {
                            const norm = normalizeAudioUrl(p.url);
                            const isProxy = norm.startsWith("/api/audio-proxy");
                            const isDrive = isProxy && /drive\.google/.test(p.url);
                            const isDropbox = isProxy && /dropbox/.test(p.url);
                            return (
                              <span className="ape-host">
                                {isDrive
                                  ? "Google Drive"
                                  : isDropbox
                                    ? "Dropbox"
                                    : (() => {
                                      try {
                                        return new URL(p.url).host;
                                      } catch {
                                        return "ссылка";
                                      }
                                    })()}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="ape-row-btns">
                        <button className="ape-icon-btn" onClick={() => startEdit(p)} title="Редактировать">✎</button>
                        <button className="ape-icon-btn ape-del" onClick={() => handleDelete(p.id)} title="Удалить">✕</button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add new */}
      <div className="ape-add">
        <div className="ape-add-label">Новая часть</div>
        <input
          type="text"
          value={newSection}
          onChange={(e) => setNewSection(e.target.value)}
          placeholder="Раздел / Часть — например: Часть 1 (опционально)"
          className="ape-input ape-input-sm"
        />
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder={`Название главы — например: Глава ${parts.length + 1} (опционально)`}
          className="ape-input"
        />
        <input
          type="text"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="https://drive.google.com/file/d/... или прямая ссылка на mp3"
          className="ape-input ape-url"
        />
        <div className="ape-hint">
          Подсказка: «Раздел» помогает группировать главы (например «Часть 1»). Если оставить название пустым — будет «Глава {parts.length + 1}». Поддерживается Google Drive (доступ «всем по ссылке»), Dropbox и прямые ссылки на mp3/m4a/ogg.
        </div>
        <button className="sbtn ape-add-btn" onClick={handleAdd} disabled={addMut.isPending}>
          {addMut.isPending ? "Добавление…" : "+ Добавить часть"}
        </button>
      </div>

      <button className="vedit ape-close" onClick={onClose}>Готово</button>
    </div>
  );
}
