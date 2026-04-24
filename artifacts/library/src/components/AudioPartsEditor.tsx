import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAddAudioPart,
  useUpdateAudioPart,
  useDeleteAudioPart,
  getListAudioPartsQueryKey,
  type AudioPart,
} from "@workspace/api-client-react";
import { showToast } from "@/components/Toast";
import { normalizeAudioUrl } from "@/lib/audio-url";

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

  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");

  const handleAdd = async () => {
    if (!newTitle.trim() || !newUrl.trim()) {
      showToast("Введите название и ссылку");
      return;
    }
    try {
      await addMut.mutateAsync({
        id: bookId,
        data: { title: newTitle.trim(), url: newUrl.trim() },
      });
      setNewTitle("");
      setNewUrl("");
      showToast("Часть добавлена");
    } catch {
      showToast("Ошибка добавления");
    }
  };

  const startEdit = (p: AudioPart) => {
    setEditingId(p.id);
    setEditTitle(p.title);
    setEditUrl(p.url);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditUrl("");
  };

  const saveEdit = async (partId: string) => {
    if (!editTitle.trim() || !editUrl.trim()) {
      showToast("Заполните оба поля");
      return;
    }
    try {
      await updateMut.mutateAsync({
        id: bookId,
        partId,
        data: { title: editTitle.trim(), url: editUrl.trim() },
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

  const fillNumberedTitle = () => {
    if (newTitle.trim()) return;
    setNewTitle(`Часть ${parts.length + 1}`);
  };

  return (
    <div className="ape-wrap">
      {/* Existing parts */}
      {parts.length > 0 && (
        <div className="ape-list">
          {parts.map((p, i) => (
            <div key={p.id} className="ape-item">
              {editingId === p.id ? (
                <>
                  <div className="ape-edit">
                    <span className="ape-num">{String(i + 1).padStart(2, "0")}</span>
                    <div className="ape-fields">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        placeholder="Название части"
                        className="ape-input"
                      />
                      <input
                        type="text"
                        value={editUrl}
                        onChange={e => setEditUrl(e.target.value)}
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
                    <div className="ape-title">{p.title}</div>
                    <div className="ape-url-display" title={p.url}>
                      {(() => {
                        const norm = normalizeAudioUrl(p.url);
                        const isDrive = norm.includes("drive.google");
                        return (
                          <>
                            <span className="ape-host">{isDrive ? "Google Drive" : new URL(norm.startsWith("http") ? norm : `https://${norm}`, "https://x").host}</span>
                          </>
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
          ))}
        </div>
      )}

      {/* Add new */}
      <div className="ape-add">
        <div className="ape-add-label">Новая часть</div>
        <input
          type="text"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onFocus={fillNumberedTitle}
          placeholder="Название (например: Глава 1)"
          className="ape-input"
        />
        <input
          type="text"
          value={newUrl}
          onChange={e => setNewUrl(e.target.value)}
          placeholder="https://drive.google.com/file/d/... или прямая ссылка на mp3"
          className="ape-input ape-url"
        />
        <div className="ape-hint">
          Поддерживается ссылка с Google Drive (доступ «всем по ссылке»), Dropbox или прямой URL на mp3/m4a/ogg.
        </div>
        <button className="sbtn ape-add-btn" onClick={handleAdd} disabled={addMut.isPending}>
          {addMut.isPending ? "Добавление…" : "+ Добавить часть"}
        </button>
      </div>

      <button className="vedit ape-close" onClick={onClose}>Готово</button>
    </div>
  );
}
