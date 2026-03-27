import { useState, useRef, useEffect } from "react";
import { Book } from "@workspace/api-client-react";
import { useBookMutations } from "@/hooks/use-books";
import { showToast } from "./Toast";
import { Cropper } from "./Cropper";

const GENRES = ["", "Классика", "Роман", "Поэзия", "Философия", "История", "Биография", "Наука", "Детектив", "Фантастика", "Другое"];

interface BookFormSheetProps {
  isOpen: boolean;
  onClose: () => void;
  editBook?: Book | null;
}

export function BookFormSheet({ isOpen, onClose, editBook }: BookFormSheetProps) {
  const { createBook, updateBook, isCreating, isUpdating } = useBookMutations();
  const isEdit = !!editBook;
  const isPending = isCreating || isUpdating;

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [lang, setLang] = useState("ru");
  const [genre, setGenre] = useState("");
  const [customGenre, setCustomGenre] = useState("");
  const [year, setYear] = useState("");
  const [rating, setRating] = useState(0);
  const [synopsis, setSynopsis] = useState("");

  const [coverBase64, setCoverBase64] = useState<string | null>(null);
  const [coverOrigSrc, setCoverOrigSrc] = useState<string | null>(null);
  const [coverUrlInput, setCoverUrlInput] = useState("");
  const [coverUrlError, setCoverUrlError] = useState(false);

  const [coverLandscapeBase64, setCoverLandscapeBase64] = useState<string | null>(null);
  const [coverLandscapeOrigSrc, setCoverLandscapeOrigSrc] = useState<string | null>(null);
  const [landscapeUrlInput, setLandscapeUrlInput] = useState("");
  const [landscapeUrlError, setLandscapeUrlError] = useState(false);

  const [cropOrigSrc, setCropOrigSrc] = useState<string | null>(null);
  const [cropMode, setCropMode] = useState<'portrait' | 'landscape'>('portrait');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const landscapeFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (editBook) {
        setTitle(editBook.title || "");
        setAuthor(editBook.author || "");
        setLang(editBook.lang || "ru");
        setSynopsis(editBook.synopsis || "");
        setYear(editBook.year?.toString() || "");
        setRating(editBook.rating || 0);
        setCoverBase64(editBook.cover || null);
        setCoverOrigSrc(null);
        setCoverUrlInput(""); setCoverUrlError(false);
        setCoverLandscapeBase64(editBook.coverLandscape ?? null);
        setCoverLandscapeOrigSrc(null);
        setLandscapeUrlInput(""); setLandscapeUrlError(false);
        setCropOrigSrc(null);

        const g = editBook.genre || "";
        if (GENRES.includes(g) || g === "") {
          setGenre(g);
          setCustomGenre("");
        } else {
          setGenre("Другое");
          setCustomGenre(g);
        }
      } else {
        setTitle(""); setAuthor(""); setLang("ru"); setGenre(""); setCustomGenre(""); setYear("");
        setRating(0); setSynopsis("");
        setCoverBase64(null); setCoverOrigSrc(null); setCoverUrlInput(""); setCoverUrlError(false);
        setCoverLandscapeBase64(null); setCoverLandscapeOrigSrc(null); setLandscapeUrlInput(""); setLandscapeUrlError(false);
        setCropOrigSrc(null);
      }
    }
  }, [isOpen, editBook]);

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      setCoverOrigSrc(src);
      setCropMode('portrait');
      setCropOrigSrc(src);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleLandscapeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      setCoverLandscapeOrigSrc(src);
      setCropMode('landscape');
      setCropOrigSrc(src);
    };
    reader.readAsDataURL(file);
    if (landscapeFileInputRef.current) landscapeFileInputRef.current.value = '';
  };

  const handleCoverReCrop = () => {
    const src = coverOrigSrc || coverBase64;
    if (src) { setCropMode('portrait'); setCropOrigSrc(src); }
  };

  const handleLandscapeReCrop = () => {
    const src = coverLandscapeOrigSrc || coverLandscapeBase64;
    if (src) { setCropMode('landscape'); setCropOrigSrc(src); }
  };

  const loadImageFromUrl = (url: string, onSuccess: (dataUrl: string) => void, onError: () => void) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { onError(); return; }
      ctx.drawImage(img, 0, 0);
      try { onSuccess(canvas.toDataURL("image/jpeg", 0.92)); } catch { onError(); }
    };
    img.onerror = onError;
    img.src = url;
  };

  const handleCoverUrlLoad = () => {
    const url = coverUrlInput.trim();
    if (!url) return;
    setCoverUrlError(false);
    loadImageFromUrl(url, (dataUrl) => {
      setCoverOrigSrc(dataUrl);
      setCropMode('portrait');
      setCropOrigSrc(dataUrl);
      setCoverUrlInput("");
    }, () => setCoverUrlError(true));
  };

  const handleLandscapeUrlLoad = () => {
    const url = landscapeUrlInput.trim();
    if (!url) return;
    setLandscapeUrlError(false);
    loadImageFromUrl(url, (dataUrl) => {
      setCoverLandscapeOrigSrc(dataUrl);
      setCropMode('landscape');
      setCropOrigSrc(dataUrl);
      setLandscapeUrlInput("");
    }, () => setLandscapeUrlError(true));
  };

  const handleSave = async () => {
    if (!title.trim() || !author.trim()) { showToast("Введите название и автора"); return; }
    const finalGenre = genre === 'Другое' ? customGenre.trim() : genre;
    const payload = {
      data: {
        title: title.trim(),
        author: author.trim(),
        lang,
        genre: finalGenre,
        year: year ? parseInt(year) : null,
        rating: rating > 0 ? rating : null,
        synopsis: synopsis.trim(),
        quotes: isEdit ? (editBook!.quotes || '') : '',
        thoughts: isEdit ? (editBook!.thoughts || '') : '',
        vocab: isEdit ? (editBook!.vocab || []) : [],
        cover: coverBase64,
        coverLandscape: coverLandscapeBase64,
      }
    };
    try {
      if (isEdit) { await updateBook({ id: editBook!.id, ...payload }); showToast("Книга обновлена"); }
      else { await createBook(payload); showToast("Книга добавлена"); }
      onClose();
    } catch { showToast("Ошибка сохранения"); }
  };

  const urlInputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 10px', background: 'rgba(8,16,10,.8)',
    border: '1px solid var(--border)', color: 'var(--text)',
    fontFamily: "'Crimson Text', serif", fontSize: '.85rem',
    outline: 'none', boxSizing: 'border-box', borderRadius: 0,
  };

  const urlBtnStyle: React.CSSProperties = {
    padding: '9px 12px', background: 'transparent', border: '1px solid var(--border)',
    color: 'var(--text2)', fontFamily: "'Crimson Text', serif", fontSize: '.76rem',
    letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer',
    whiteSpace: 'nowrap', flexShrink: 0, borderRadius: 0,
  };

  return (
    <>
      <div
        className={`overlay ${isOpen && !cropOrigSrc ? 'open' : ''}`}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="sheet">
          <div className="sheet-handle"></div>
          <div className="sh">
            <div className="sh-lbl">{isEdit ? 'Редактирование' : 'Новая книга'}</div>
            <h2>{isEdit ? 'Изменить запись' : 'Добавить в коллекцию'}</h2>
            <button className="mc" onClick={onClose}>✕</button>
          </div>
          <div className="fb">

            {/* Portrait cover — card cover */}
            <div className="field">
              <label>Обложка карточки (портрет)</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div
                  className="cover-upload-area"
                  style={{ aspectRatio: '2/3', width: '110px', flexShrink: 0, cursor: 'pointer' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="cua-hover">
                    <span style={{ fontSize: '1rem' }}>📷</span>
                    <span className="cu-text" style={{ fontSize: '.62rem' }}>Заменить</span>
                  </div>
                  {coverBase64 ? (
                    <img src={coverBase64} className="cua-preview" alt="Cover" style={{ objectFit: 'contain' }} />
                  ) : (
                    <>
                      <span className="cu-icon" style={{ fontSize: '1.2rem' }}>📚</span>
                      <span className="cu-text" style={{ fontSize: '.62rem', textAlign: 'center', padding: '0 6px' }}>Нажмите чтобы загрузить</span>
                    </>
                  )}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '7px', paddingTop: '4px' }}>
                  <button type="button" onClick={() => fileInputRef.current?.click()} style={{ padding: '9px 10px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text2)', fontFamily: "'Crimson Text', serif", fontSize: '.76rem', letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', textAlign: 'left' }}>
                    📷 Загрузить фото
                  </button>
                  {(coverBase64 || coverOrigSrc) && (
                    <button type="button" onClick={handleCoverReCrop} style={{ padding: '9px 10px', background: 'transparent', border: '1px solid var(--gold2)', color: 'var(--gold)', fontFamily: "'Crimson Text', serif", fontSize: '.76rem', letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', textAlign: 'left' }}>
                      ✂ Перекадрировать
                    </button>
                  )}
                  {coverBase64 && (
                    <button type="button" onClick={() => { setCoverBase64(null); setCoverOrigSrc(null); }} style={{ padding: '9px 10px', background: 'transparent', border: '1px solid rgba(122,53,32,.3)', color: 'rgba(160,80,55,.8)', fontFamily: "'Crimson Text', serif", fontSize: '.76rem', letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', textAlign: 'left' }}>
                      ✕ Удалить обложку
                    </button>
                  )}
                </div>
              </div>
              <div style={{ marginTop: '10px', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <input
                    type="url"
                    placeholder="Или вставьте ссылку на изображение…"
                    value={coverUrlInput}
                    onChange={e => { setCoverUrlInput(e.target.value); setCoverUrlError(false); }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCoverUrlLoad(); } }}
                    style={{ ...urlInputStyle, border: `1px solid ${coverUrlError ? 'rgba(160,80,55,.7)' : 'var(--border)'}` }}
                  />
                  {coverUrlError && <span style={{ fontFamily: "'Crimson Text', serif", fontSize: '.7rem', color: 'rgba(160,80,55,.9)', fontStyle: 'italic' }}>Не удалось загрузить. Попробуйте другую ссылку.</span>}
                </div>
                <button type="button" onClick={handleCoverUrlLoad} disabled={!coverUrlInput.trim()} style={{ ...urlBtnStyle, opacity: coverUrlInput.trim() ? 1 : 0.4, cursor: coverUrlInput.trim() ? 'pointer' : 'default' }}>
                  Загрузить
                </button>
              </div>
              <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleCoverFileChange} />
            </div>

            {/* Landscape cover — book page hero */}
            <div className="field">
              <label>Обложка страницы книги (альбом)</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div
                  className="cover-upload-area"
                  style={{ aspectRatio: '16/9', width: '140px', flexShrink: 0, cursor: 'pointer' }}
                  onClick={() => landscapeFileInputRef.current?.click()}
                >
                  <div className="cua-hover">
                    <span style={{ fontSize: '1rem' }}>🖼</span>
                    <span className="cu-text" style={{ fontSize: '.62rem' }}>Заменить</span>
                  </div>
                  {coverLandscapeBase64 ? (
                    <img src={coverLandscapeBase64} className="cua-preview" alt="Landscape" style={{ objectFit: 'cover' }} />
                  ) : (
                    <>
                      <span className="cu-icon" style={{ fontSize: '1.2rem' }}>🌄</span>
                      <span className="cu-text" style={{ fontSize: '.62rem', textAlign: 'center', padding: '0 6px' }}>Нажмите чтобы загрузить</span>
                    </>
                  )}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '7px', paddingTop: '4px' }}>
                  <button type="button" onClick={() => landscapeFileInputRef.current?.click()} style={{ padding: '9px 10px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text2)', fontFamily: "'Crimson Text', serif", fontSize: '.76rem', letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', textAlign: 'left' }}>
                    🖼 Загрузить фото
                  </button>
                  {(coverLandscapeBase64 || coverLandscapeOrigSrc) && (
                    <button type="button" onClick={handleLandscapeReCrop} style={{ padding: '9px 10px', background: 'transparent', border: '1px solid var(--gold2)', color: 'var(--gold)', fontFamily: "'Crimson Text', serif", fontSize: '.76rem', letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', textAlign: 'left' }}>
                      ✂ Перекадрировать
                    </button>
                  )}
                  {coverLandscapeBase64 && (
                    <button type="button" onClick={() => { setCoverLandscapeBase64(null); setCoverLandscapeOrigSrc(null); }} style={{ padding: '9px 10px', background: 'transparent', border: '1px solid rgba(122,53,32,.3)', color: 'rgba(160,80,55,.8)', fontFamily: "'Crimson Text', serif", fontSize: '.76rem', letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', textAlign: 'left' }}>
                      ✕ Удалить
                    </button>
                  )}
                </div>
              </div>
              <div style={{ marginTop: '10px', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <input
                    type="url"
                    placeholder="Или вставьте ссылку на изображение…"
                    value={landscapeUrlInput}
                    onChange={e => { setLandscapeUrlInput(e.target.value); setLandscapeUrlError(false); }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleLandscapeUrlLoad(); } }}
                    style={{ ...urlInputStyle, border: `1px solid ${landscapeUrlError ? 'rgba(160,80,55,.7)' : 'var(--border)'}` }}
                  />
                  {landscapeUrlError && <span style={{ fontFamily: "'Crimson Text', serif", fontSize: '.7rem', color: 'rgba(160,80,55,.9)', fontStyle: 'italic' }}>Не удалось загрузить. Попробуйте другую ссылку.</span>}
                </div>
                <button type="button" onClick={handleLandscapeUrlLoad} disabled={!landscapeUrlInput.trim()} style={{ ...urlBtnStyle, opacity: landscapeUrlInput.trim() ? 1 : 0.4, cursor: landscapeUrlInput.trim() ? 'pointer' : 'default' }}>
                  Загрузить
                </button>
              </div>
              <input type="file" ref={landscapeFileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleLandscapeFileChange} />
            </div>

            <div className="fr">
              <div className="field">
                <label>Название *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} type="text" placeholder="Название книги" />
              </div>
              <div className="field">
                <label>Автор *</label>
                <input value={author} onChange={e => setAuthor(e.target.value)} type="text" placeholder="Имя автора" />
              </div>
            </div>

            <div className="fr">
              <div className="field">
                <label>Язык</label>
                <select value={lang} onChange={e => setLang(e.target.value)}>
                  <option value="ru">🇷🇺 Русский</option>
                  <option value="en">🇬🇧 English</option>
                  <option value="other">Другой</option>
                </select>
              </div>
              <div className="field">
                <label>Жанр</label>
                <select value={genre} onChange={e => { setGenre(e.target.value); if (e.target.value !== 'Другое') setCustomGenre(""); }}>
                  <option value="">— выбрать —</option>
                  {GENRES.filter(g => g).map(g => <option key={g}>{g}</option>)}
                </select>
                {genre === 'Другое' && (
                  <input
                    type="text"
                    placeholder="Введите свой жанр…"
                    value={customGenre}
                    onChange={e => setCustomGenre(e.target.value)}
                    style={{ marginTop: '6px' }}
                  />
                )}
              </div>
            </div>

            <div className="fr">
              <div className="field">
                <label>Год</label>
                <input value={year} onChange={e => setYear(e.target.value)} type="number" placeholder="2024" />
              </div>
              <div className="field">
                <label>Оценка</label>
                <div className="rrow">
                  {[1,2,3,4,5].map(v => (
                    <span key={v} className={`rs ${rating >= v ? 'active' : ''}`} onClick={() => setRating(v)}>★</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="field">
              <label>Синопсис</label>
              <textarea value={synopsis} onChange={e => setSynopsis(e.target.value)} placeholder="О чём эта книга…" style={{ minHeight: '70px' }}></textarea>
            </div>

            <button className="sbtn" onClick={handleSave} disabled={isPending}>
              {isPending ? 'Сохранение...' : (isEdit ? 'Обновить книгу' : 'Сохранить в библиотеке')}
            </button>
          </div>
        </div>
      </div>

      {cropOrigSrc && (
        <Cropper
          imageSrc={cropOrigSrc}
          defaultOrient={cropMode}
          hideToggle
          onCancel={() => setCropOrigSrc(null)}
          onApply={(b64) => {
            if (cropMode === 'portrait') {
              setCoverBase64(b64);
            } else {
              setCoverLandscapeBase64(b64);
            }
            setCropOrigSrc(null);
          }}
        />
      )}
    </>
  );
}
