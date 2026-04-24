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
  partDisplay,
  type AudioMeta,
} from "@/lib/audio-meta";

interface Props {
  bookId: string;
  parts: AudioPart[];
  onClose: () => void;
}

export function AudioPartsEditor({ bookId, parts, onClose }: Props) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListAudioPartsQueryKey(bookId) });

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

  // Pre-fill section from last existing part (so user doesn't retype "Часть 1")
  const lastSection = (() => {
    if (!parts.length) return "";
    const { section } = splitPartTitle(parts[parts.length - 1].title);
    return section;
  })();

  const [newSection, setNewSection] = useState(lastSection);
  const [newChapter, setNewChapter] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  useEffect(() => {
    setNewSection(lastSection);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parts.length]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSection, setEditSection] = useState("");
  const [editChapter, setEditChapter] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");

  const handleAdd = async () => {
    if (!newUrl.trim()) {
      showToast("Введите ссылку на аудиофайл");
      return;
    }
    const finalTitle = joinPartTitle(newSection.trim(), newChapter.trim(), newTitle.trim());
    try {
      await addMut.mutateAsync({
        id: bookId,
        data: { title: finalTitle, url: newUrl.trim() },
      });
      // Keep section, clear chapter/title for fast next entry
      setNewChapter("");
      setNewTitle("");
      setNewUrl("");
      showToast("Часть добавлена");
    } catch {
      showToast("Ошибка добавления");
    }
  };

  const startEdit = (p: AudioPart) => {
    const f = splitPartTitle(p.title);
    setEditingId(p.id);
    setEditSection(f.section);
    setEditChapter(f.chapter);
    setEditTitle(f.title);
    setEditUrl(p.url);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditSection("");
    setEditChapter("");
    setEditTitle("");
    setEditUrl("");
  };

  const saveEdit = async (partId: string) => {
    if (!editUrl.trim()) {
      showToast("Введите ссылку");
      return;
    }
    const finalTitle = joinPartTitle(
      editSection.trim(),
      editChapter.trim(),
      editTitle.trim()
    );
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
            {parts.map((p) => {
              const f = splitPartTitle(p.title);
              return (
                <div key={p.id} className="ape-item">
                  {editingId === p.id ? (
                    <>
                      <div className="ape-edit">
                        <div className="ape-fields">
                          <div className="ape-row-grid">
                            <input
                              type="text"
                              value={editSection}
                              onChange={(e) => setEditSection(e.target.value)}
                              placeholder="Часть (опц.)"
                              className="ape-input ape-input-sm"
                            />
                            <input
                              type="text"
                              value={editChapter}
                              onChange={(e) => setEditChapter(e.target.value)}
                              placeholder="Глава (опц.)"
                              className="ape-input ape-input-sm"
                            />
                          </div>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            placeholder="Название (опц.)"
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
                        <button className="vedit" onClick={cancelEdit}>
                          Отмена
                        </button>
                        <button
                          className="sbtn"
                          style={{ margin: 0 }}
                          onClick={() => saveEdit(p.id)}
                          disabled={updateMut.isPending}
                        >
                          {updateMut.isPending ? "…" : "Сохранить"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="ape-info">
                        {f.section && <div className="ape-section-tag">{f.section}</div>}
                        <div className="ape-title">{partDisplay(f)}</div>
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
                        <button
                          className="ape-icon-btn"
                          onClick={() => startEdit(p)}
                          title="Редактировать"
                        >
                          ✎
                        </button>
                        <button
                          className="ape-icon-btn ape-del"
                          onClick={() => handleDelete(p.id)}
                          title="Удалить"
                        >
                          ✕
                        </button>
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
        <div className="ape-row-grid">
          <input
            type="text"
            value={newSection}
            onChange={(e) => setNewSection(e.target.value)}
            placeholder="Часть (опц.)"
            className="ape-input ape-input-sm"
          />
          <input
            type="text"
            value={newChapter}
            onChange={(e) => setNewChapter(e.target.value)}
            placeholder="Глава (опц.)"
            className="ape-input ape-input-sm"
          />
        </div>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Название (опц.)"
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
          Все три поля опциональны. «Часть» автоматически переносится из последней
          добавленной — так что для глав одной части пишешь её только один раз.
          Поддерживается Google Drive (доступ «всем по ссылке»), Dropbox и прямые
          ссылки на mp3/m4a/ogg.
        </div>
        <button className="sbtn ape-add-btn" onClick={handleAdd} disabled={addMut.isPending}>
          {addMut.isPending ? "Добавление…" : "+ Добавить"}
        </button>
      </div>

      <button className="vedit ape-close" onClick={onClose}>
        Готово
      </button>
    </div>
  );
}
