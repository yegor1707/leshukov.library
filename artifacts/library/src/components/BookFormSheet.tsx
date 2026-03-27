import { useState, useRef, useEffect } from "react";
import { Book } from "@workspace/api-client-react";
import { useBookMutations } from "@/hooks/use-books";
import { showToast } from "./Toast";
import { Cropper } from "./Cropper";

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
  const [year, setYear] = useState("");
  const [rating, setRating] = useState(0);
  const [synopsis, setSynopsis] = useState("");
  const [quotes, setQuotes] = useState("");
  const [thoughts, setThoughts] = useState("");
  const [vocab, setVocab] = useState<{id: string, word: string, meaning: string}[]>([]);
  const [coverBase64, setCoverBase64] = useState<string | null>(null);

  const [cropOrigSrc, setCropOrigSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (editBook) {
        setTitle(editBook.title || "");
        setAuthor(editBook.author || "");
        setLang(editBook.lang || "ru");
        setGenre(editBook.genre || "");
        setYear(editBook.year?.toString() || "");
        setRating(editBook.rating || 0);
        setSynopsis(editBook.synopsis || "");
        setQuotes(editBook.quotes || "");
        setThoughts(editBook.thoughts || "");
        setVocab(editBook.vocab?.map(v => ({ id: Math.random().toString(), ...v })) || []);
        setCoverBase64(editBook.cover || null);
      } else {
        setTitle("");
        setAuthor("");
        setLang("ru");
        setGenre("");
        setYear("");
        setRating(0);
        setSynopsis("");
        setQuotes("");
        setThoughts("");
        setVocab([]);
        setCoverBase64(null);
      }
    }
  }, [isOpen, editBook]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCropOrigSrc(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!title.trim() || !author.trim()) {
      showToast("Введите название и автора");
      return;
    }

    const payload = {
      data: {
        title: title.trim(),
        author: author.trim(),
        lang,
        genre,
        year: year ? parseInt(year) : null,
        rating,
        synopsis: synopsis.trim(),
        quotes: quotes.trim(),
        thoughts: thoughts.trim(),
        vocab: vocab.filter(v => v.word.trim()).map(v => ({ word: v.word.trim(), meaning: v.meaning.trim() })),
        cover: coverBase64
      }
    };

    try {
      if (isEdit) {
        await updateBook({ id: editBook.id, ...payload });
        showToast("Книга обновлена");
      } else {
        await createBook(payload);
        showToast("Книга добавлена");
      }
      onClose();
    } catch (err) {
      showToast("Ошибка сохранения");
    }
  };

  const addVRow = () => {
    setVocab([...vocab, { id: Math.random().toString(), word: "", meaning: "" }]);
  };

  const removeVRow = (id: string) => {
    setVocab(vocab.filter(v => v.id !== id));
  };

  const updateV = (id: string, field: 'word'|'meaning', val: string) => {
    setVocab(vocab.map(v => v.id === id ? { ...v, [field]: val } : v));
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
            <button className="mc" onClick={onClose}>&#10005;</button>
          </div>
          <div className="fb">
            <div className="field">
              <label>Обложка книги</label>
              <div className="cover-upload-area" onClick={() => fileInputRef.current?.click()}>
                <div className="cua-hover">
                  <span style={{fontSize: '1.2rem'}}>📷</span>
                  <span className="cu-text">Изменить</span>
                </div>
                {coverBase64 ? (
                  <img src={coverBase64} className="cua-preview" alt="Cover preview" />
                ) : (
                  <>
                    <span className="cu-icon">&#128218;</span>
                    <span className="cu-text">Нажмите чтобы загрузить</span>
                    <span className="cu-hint">Фото или скриншот обложки</span>
                  </>
                )}
              </div>
              <input type="file" ref={fileInputRef} accept="image/*" style={{display: 'none'}} onChange={handleFileChange} />
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
                <select value={genre} onChange={e => setGenre(e.target.value)}>
                  <option value="">— выбрать —</option>
                  <option>Классика</option><option>Роман</option><option>Поэзия</option>
                  <option>Философия</option><option>История</option><option>Биография</option>
                  <option>Наука</option><option>Детектив</option><option>Фантастика</option><option>Другое</option>
                </select>
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
                    <span key={v} className={`rs ${rating >= v ? 'active' : ''}`} onClick={() => setRating(v)}>&#9733;</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="field">
              <label>Синопсис</label>
              <textarea value={synopsis} onChange={e => setSynopsis(e.target.value)} placeholder="О чём эта книга…" style={{minHeight:'70px'}}></textarea>
            </div>

            <div className="field">
              <label>Словарь непонятных слов</label>
              <div className="vlist">
                {vocab.map(v => (
                  <div key={v.id} className="ve">
                    <input type="text" placeholder="Слово" value={v.word} onChange={e => updateV(v.id, 'word', e.target.value)} />
                    <input type="text" placeholder="Объяснение" value={v.meaning} onChange={e => updateV(v.id, 'meaning', e.target.value)} />
                    <button type="button" className="vd" onClick={() => removeVRow(v.id)}>&#10005;</button>
                  </div>
                ))}
              </div>
              <button type="button" className="vadd" onClick={addVRow}>+ Добавить слово</button>
            </div>

            <div className="field">
              <label>Цитаты</label>
              <textarea value={quotes} onChange={e => setQuotes(e.target.value)} placeholder="«Цитата»&#10;«Ещё одна»" style={{minHeight:'80px'}}></textarea>
            </div>

            <div className="field">
              <label>Мои личные мысли</label>
              <textarea value={thoughts} onChange={e => setThoughts(e.target.value)} placeholder="Впечатления, размышления…"></textarea>
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
          onCancel={() => setCropOrigSrc(null)}
          onApply={(b64) => {
            setCoverBase64(b64);
            setCropOrigSrc(null);
          }}
        />
      )}
    </>
  );
}
