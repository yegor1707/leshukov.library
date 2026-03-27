import { useState } from "react";
import { Book } from "@workspace/api-client-react";
import { useBookMutations, useBookNotes, useBookNoteMutations } from "@/hooks/use-books";
import { showToast } from "./Toast";

interface BookViewSheetProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  isAdmin?: boolean;
}

const LL_FULL: Record<string, string> = {
  ru: '🇷🇺 Русский',
  en: '🇬🇧 English',
  other: 'Другой'
};

export function BookViewSheet({ book, isOpen, onClose, onEdit, isAdmin }: BookViewSheetProps) {
  const [activeTab, setActiveTab] = useState('synopsis');
  const [sonNoteText, setSonNoteText] = useState("");
  
  const { deleteBook, isDeleting } = useBookMutations();
  const { data: notes = [] } = useBookNotes(book?.id || "");
  const { addNote, isAddingNote } = useBookNoteMutations(book?.id || "");

  if (!book) return null;

  const handleDelete = async () => {
    if (!window.confirm("Удалить книгу?")) return;
    try {
      await deleteBook({ id: book.id });
      showToast("Книга удалена");
      onClose();
    } catch {
      showToast("Ошибка удаления");
    }
  };

  const handleSaveSonNote = async () => {
    if (!sonNoteText.trim()) return;
    try {
      await addNote({ id: book.id, data: { text: sonNoteText.trim() } });
      setSonNoteText("");
      showToast("Заметка сохранена");
    } catch {
      showToast("Ошибка сохранения");
    }
  };

  const renderStars = (r: number) => {
    return Array.from({length: 5}).map((_, i) => (
      <span key={i} style={{fontSize: '1rem', color: i < r ? 'var(--gold)' : 'rgba(200,168,74,.2)'}}>&#9733;</span>
    ));
  };

  return (
    <div className={`overlay ${isOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet">
        <div className="sheet-handle"></div>
        <div className="vm-cover">
          <button className="vm-close" onClick={onClose}>&#10005;</button>
          {book.cover ? (
            <img src={book.cover} alt={book.title} />
          ) : (
            <div className="vm-cover-ph"><span>&#128218;</span></div>
          )}
        </div>
        <div className="vm-info">
          <div className="vm-lang">{LL_FULL[book.lang] || book.lang}</div>
          <div className="vm-title">{book.title}</div>
          <div className="vm-author">{book.author}</div>
          <div className="vm-meta">
            {book.rating ? <div className="vm-stars">{renderStars(book.rating)}</div> : null}
            {book.year ? <div className="vm-year">{book.year}</div> : null}
            {book.genre ? <div className="vm-genre-t">{book.genre}</div> : null}
          </div>
        </div>
        
        <div className="vtabs">
          {[
            { id: 'synopsis', label: 'Содержание' },
            { id: 'vocab', label: 'Словарь' },
            { id: 'quotes', label: 'Цитаты' },
            { id: 'thoughts', label: 'Мысли' },
            { id: 'son', label: 'Сын' }
          ].map(t => (
            <button 
              key={t.id}
              className={`vt ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className={`vp ${activeTab === 'synopsis' ? 'active' : ''}`}>
          {book.synopsis ? (
            <div className="syn-body">{book.synopsis}</div>
          ) : (
            <div className="sec-empty">Синопсис не добавлен</div>
          )}
        </div>

        <div className={`vp ${activeTab === 'vocab' ? 'active' : ''}`}>
          {book.vocab && book.vocab.length > 0 ? (
            <table className="vtbl">
              <thead><tr><th style={{ width: '36px', textAlign: 'center' }}>№</th><th>Слово</th><th>Объяснение</th></tr></thead>
              <tbody>
                {book.vocab.map((v, i) => (
                  <tr key={i}><td style={{ textAlign: 'center', opacity: 0.5 }}>{i + 1}</td><td>{v.word}</td><td style={{ whiteSpace: 'pre-line' }}>{v.meaning}</td></tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="sec-empty">Словарь пуст</div>
          )}
        </div>

        <div className={`vp ${activeTab === 'quotes' ? 'active' : ''}`}>
          {book.quotes && book.quotes.trim() ? (
            <div className="qwrap">
              {book.quotes.split('\n\n').filter(l => l.trim()).map((l, i) => (
                <div key={i} className="qitem" style={{ whiteSpace: 'pre-line' }}>{l}</div>
              ))}
            </div>
          ) : (
            <div className="sec-empty">Цитаты не добавлены</div>
          )}
        </div>

        <div className={`vp ${activeTab === 'thoughts' ? 'active' : ''}`}>
          {book.thoughts && book.thoughts.trim() ? (
            <div className="th-body">{book.thoughts}</div>
          ) : (
            <div className="sec-empty">Мысли не добавлены</div>
          )}
        </div>

        <div className={`vp ${activeTab === 'son' ? 'active' : ''}`}>
          <label style={{fontFamily:"'Crimson Text',serif",fontSize:".7rem",letterSpacing:".14em",textTransform:"uppercase",color:"var(--text2)",display:"block",marginBottom:"5px"}}>
            Добавить заметку
          </label>
          <textarea 
            className="sn-area" 
            placeholder="Твои мысли об этой книге…"
            value={sonNoteText}
            onChange={e => setSonNoteText(e.target.value)}
          ></textarea>
          <button className="sn-save" onClick={handleSaveSonNote} disabled={isAddingNote}>
            {isAddingNote ? 'Сохранение...' : 'Сохранить заметку'}
          </button>
          <div className="sn-list">
            {notes.length > 0 ? (
              notes.map(n => (
                <div key={n.id} className="sni">
                  <div className="snm">{new Date(n.createdAt).toLocaleDateString('ru-RU', {day:'numeric',month:'long',year:'numeric'})}</div>
                  <div className="snt">{n.text}</div>
                </div>
              ))
            ) : (
              <div className="sec-empty" style={{paddingTop:'10px'}}>Заметок пока нет</div>
            )}
          </div>
        </div>

        {isAdmin && (
          <div className="vact">
            <button className="vedit" onClick={onEdit}>✎ Редактировать</button>
            <button className="vdelbtn" onClick={handleDelete} disabled={isDeleting}>Удалить</button>
          </div>
        )}

      </div>
    </div>
  );
}
