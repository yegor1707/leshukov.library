import { useState } from "react";
import { useLocation } from "wouter";
import { useGetBook, useListNotes, useAddNote } from "@workspace/api-client-react";
import { useBookMutations } from "@/hooks/use-books";
import { useAdmin } from "@/hooks/use-admin";
import { showToast } from "@/components/Toast";
import { BookFormSheet } from "@/components/BookFormSheet";

const LL_FULL: Record<string, string> = {
  ru: '🇷🇺 Русский',
  en: '🇬🇧 English',
  other: 'Другой',
};

function Stars({ r }: { r: number }) {
  return (
    <span>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ color: i < r ? 'var(--gold)' : 'rgba(200,168,74,.2)', fontSize: '1.1rem' }}>★</span>
      ))}
    </span>
  );
}

export default function BookPage({ params }: { params: { id: string } }) {
  const [, navigate] = useLocation();
  const { isAdmin } = useAdmin();
  const [activeTab, setActiveTab] = useState('synopsis');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [noteText, setNoteText] = useState("");

  const { data: book, isLoading, error } = useGetBook(params.id);
  const { data: notes = [] } = useListNotes(params.id);
  const { deleteBook, isDeleting } = useBookMutations();

  const addNoteMutation = useAddNote();

  const handleDelete = async () => {
    if (!window.confirm('Удалить эту книгу?')) return;
    try {
      await deleteBook({ id: params.id });
      showToast('Книга удалена');
      navigate('/');
    } catch {
      showToast('Ошибка удаления');
    }
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    try {
      await addNoteMutation.mutateAsync({ id: params.id, data: { text: noteText.trim() } });
      setNoteText('');
      showToast('Заметка сохранена');
    } catch {
      showToast('Ошибка сохранения');
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text2)', fontFamily: "'Crimson Text', serif", fontSize: '1rem', fontStyle: 'italic' }}>
          Загрузка…
        </p>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <p style={{ color: 'var(--text2)', fontFamily: "'Playfair Display', serif", fontSize: '1.2rem' }}>Книга не найдена</p>
        <button className="vedit" onClick={() => navigate('/')}>← Вернуться</button>
      </div>
    );
  }

  const tabs = [
    { id: 'synopsis', label: 'Содержание' },
    { id: 'vocab', label: 'Словарь' },
    { id: 'quotes', label: 'Цитаты' },
    { id: 'thoughts', label: 'Мысли' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '680px', position: 'relative' }}>

        {/* Cover hero */}
        <div style={{ width: '100%', position: 'relative', overflow: 'hidden', background: 'linear-gradient(140deg,#0c1f0f,#060e07)' }}>
          {book.cover ? (
            <div style={{ position: 'relative' }}>
              <img
                src={book.cover}
                alt={book.title}
                style={{ width: '100%', maxHeight: '420px', objectFit: 'cover', display: 'block', filter: 'brightness(0.85)' }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, var(--bg) 100%)' }} />
            </div>
          ) : (
            <div style={{
              height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', position: 'relative',
              background: 'linear-gradient(140deg,#0c1f0f,#060e07)'
            }}>
              <div style={{ position: 'absolute', inset: 0, opacity: .06, backgroundImage: 'repeating-linear-gradient(-42deg,transparent 0,transparent 12px,rgba(200,168,74,.6) 12px,rgba(200,168,74,.6) 13px)' }} />
              <span style={{ fontSize: '3rem', opacity: .12, position: 'relative' }}>📚</span>
            </div>
          )}

          {/* Back button */}
          <button
            onClick={() => navigate('/')}
            style={{
              position: 'absolute', top: '14px', left: '14px', zIndex: 10,
              background: 'rgba(13,28,17,.8)', border: '1px solid rgba(200,168,74,.2)',
              color: 'var(--ivory2)', padding: '7px 13px', cursor: 'pointer',
              fontFamily: "'Crimson Text', serif", fontSize: '.78rem', letterSpacing: '.12em',
              textTransform: 'uppercase', backdropFilter: 'blur(6px)', borderRadius: '2px',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            ← Библиотека
          </button>
        </div>

        {/* Info block */}
        <div style={{ padding: '0 20px 0', marginTop: book.cover ? '-32px' : '0', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-block', fontFamily: "'Crimson Text', serif", fontSize: '.65rem', letterSpacing: '.2em', textTransform: 'uppercase', padding: '2px 8px', border: '1px solid rgba(200,168,74,.22)', color: 'var(--gold2)', marginBottom: '10px' }}>
            {LL_FULL[book.lang] || book.lang}
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.5rem, 5vw, 2.2rem)', color: 'var(--ivory)', fontWeight: 900, lineHeight: 1.1, marginBottom: '6px' }}>
            {book.title}
          </h1>
          <p style={{ fontFamily: "'IM Fell English', serif", fontSize: '1rem', color: 'var(--text2)', fontStyle: 'italic', marginBottom: '12px' }}>
            {book.author}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {book.rating ? <Stars r={book.rating} /> : null}
            {book.year ? <span style={{ fontFamily: "'Crimson Text', serif", fontSize: '.82rem', color: 'var(--text3)' }}>{book.year}</span> : null}
            {book.genre ? (
              <span style={{ fontFamily: "'Crimson Text', serif", fontSize: '.65rem', letterSpacing: '.12em', textTransform: 'uppercase', padding: '2px 6px', border: '1px solid var(--bord2)', color: 'var(--text3)' }}>
                {book.genre}
              </span>
            ) : null}
          </div>

          {isAdmin && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <button className="vedit" style={{ flex: 1 }} onClick={() => setIsEditOpen(true)}>✎ Редактировать</button>
              <button className="vdelbtn" onClick={handleDelete} disabled={isDeleting}>Удалить</button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="vtabs" style={{ borderTop: '1px solid var(--border)' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              className={`vt ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ padding: '20px', minHeight: '220px' }}>

          {activeTab === 'synopsis' && (
            book.synopsis?.trim() ? (
              <div className="syn-body" style={{ fontSize: '1.05rem' }}>{book.synopsis}</div>
            ) : (
              <div className="sec-empty">Синопсис не добавлен</div>
            )
          )}

          {activeTab === 'vocab' && (
            book.vocab && book.vocab.length > 0 ? (
              <table className="vtbl" style={{ width: '100%' }}>
                <thead><tr><th>Слово</th><th>Объяснение</th></tr></thead>
                <tbody>
                  {book.vocab.map((v, i) => (
                    <tr key={i}><td>{v.word}</td><td>{v.meaning}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="sec-empty">Словарь пуст</div>
            )
          )}

          {activeTab === 'quotes' && (
            book.quotes?.trim() ? (
              <div className="qwrap">
                {book.quotes.split('\n').filter(l => l.trim()).map((l, i) => (
                  <div key={i} className="qitem">{l}</div>
                ))}
              </div>
            ) : (
              <div className="sec-empty">Цитаты не добавлены</div>
            )
          )}

          {activeTab === 'thoughts' && (
            book.thoughts?.trim() ? (
              <div className="th-body">{book.thoughts}</div>
            ) : (
              <div className="sec-empty">Мысли не добавлены</div>
            )
          )}
        </div>

        {/* Notes section */}
        <div style={{ padding: '0 20px 60px', borderTop: '1px solid var(--bord2)' }}>
          <div style={{ padding: '20px 0 10px', fontFamily: "'Crimson Text', serif", fontSize: '.7rem', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--gold2)' }}>
            Заметки
          </div>
          <textarea
            className="sn-area"
            placeholder="Добавить заметку…"
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
          />
          <button className="sn-save" onClick={handleSaveNote} disabled={addNoteMutation.isPending}>
            {addNoteMutation.isPending ? 'Сохранение…' : 'Сохранить заметку'}
          </button>
          <div className="sn-list" style={{ marginTop: '14px' }}>
            {notes.length > 0 ? notes.map(n => (
              <div key={n.id} className="sni">
                <div className="snm">{new Date(n.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                <div className="snt">{n.text}</div>
              </div>
            )) : (
              <div className="sec-empty" style={{ paddingTop: '10px' }}>Заметок пока нет</div>
            )}
          </div>
        </div>
      </div>

      <BookFormSheet
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        editBook={book}
      />
    </div>
  );
}
