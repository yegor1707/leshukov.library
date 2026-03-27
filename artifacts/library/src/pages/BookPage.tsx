import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetBook, useListNotes, useAddNote } from "@workspace/api-client-react";
import { useBookMutations } from "@/hooks/use-books";
import { useAdmin } from "@/hooks/use-admin";
import { showToast } from "@/components/Toast";
import { Cropper } from "@/components/Cropper";

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
  const [noteText, setNoteText] = useState("");

  const [editingTab, setEditingTab] = useState<string | null>(null);
  const [editSynopsis, setEditSynopsis] = useState("");
  const [editThoughts, setEditThoughts] = useState("");
  const [editVocab, setEditVocab] = useState<{ id: string; word: string; meaning: string }[]>([]);
  const [editQuotes, setEditQuotes] = useState<{ id: string; text: string }[]>([]);

  const [coverBase64, setCoverBase64] = useState<string | null>(null);
  const [coverOrigSrc, setCoverOrigSrc] = useState<string | null>(null);
  const [cropOrigSrc, setCropOrigSrc] = useState<string | null>(null);
  const [coverChanged, setCoverChanged] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: book, isLoading, error } = useGetBook(params.id);
  const { data: notes = [] } = useListNotes(params.id);
  const { deleteBook, isDeleting, updateBook, isUpdating } = useBookMutations();
  const addNoteMutation = useAddNote();

  useEffect(() => {
    if (book) {
      setCoverBase64(book.cover || null);
      setCoverChanged(false);
    }
  }, [book]);

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

  const startEdit = (tab: string) => {
    if (!book) return;
    setEditingTab(tab);
    if (tab === 'synopsis') setEditSynopsis(book.synopsis || '');
    if (tab === 'thoughts') setEditThoughts(book.thoughts || '');
    if (tab === 'vocab') setEditVocab(book.vocab?.map(v => ({ id: Math.random().toString(), ...v })) || []);
    if (tab === 'quotes') {
      const lines = (book.quotes || '').split('\n').filter(l => l.trim());
      setEditQuotes(lines.map(l => ({ id: Math.random().toString(), text: l })));
    }
  };

  const cancelEdit = () => setEditingTab(null);

  const buildBase = () => ({
    title: book!.title,
    author: book!.author,
    lang: book!.lang,
    genre: book!.genre || '',
    year: book!.year ?? null,
    rating: book!.rating || 0,
    synopsis: book!.synopsis || '',
    quotes: book!.quotes || '',
    thoughts: book!.thoughts || '',
    vocab: book!.vocab || [],
    cover: book!.cover || null,
  });

  const saveTab = async (tab: string) => {
    if (!book) return;
    try {
      const base = buildBase();
      if (tab === 'synopsis') base.synopsis = editSynopsis.trim();
      if (tab === 'thoughts') base.thoughts = editThoughts.trim();
      if (tab === 'vocab') base.vocab = editVocab.filter(v => v.word.trim()).map(v => ({ word: v.word.trim(), meaning: v.meaning.trim() }));
      if (tab === 'quotes') base.quotes = editQuotes.filter(q => q.text.trim()).map(q => q.text.trim()).join('\n');
      await updateBook({ id: book.id, data: base });
      showToast('Сохранено');
      setEditingTab(null);
    } catch {
      showToast('Ошибка сохранения');
    }
  };

  const saveCover = async () => {
    if (!book) return;
    try {
      const base = buildBase();
      base.cover = coverBase64;
      await updateBook({ id: book.id, data: base });
      showToast('Обложка сохранена');
      setCoverChanged(false);
    } catch {
      showToast('Ошибка сохранения');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      setCoverOrigSrc(src);
      setCropOrigSrc(src);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addVRow = () => setEditVocab([...editVocab, { id: Math.random().toString(), word: "", meaning: "" }]);
  const removeVRow = (id: string) => setEditVocab(editVocab.filter(v => v.id !== id));
  const updateV = (id: string, field: 'word' | 'meaning', val: string) =>
    setEditVocab(editVocab.map(v => v.id === id ? { ...v, [field]: val } : v));

  const addQuote = () => setEditQuotes([...editQuotes, { id: Math.random().toString(), text: "" }]);
  const removeQuote = (id: string) => setEditQuotes(editQuotes.filter(q => q.id !== id));
  const updateQuote = (id: string, val: string) =>
    setEditQuotes(editQuotes.map(q => q.id === id ? { ...q, text: val } : q));

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text2)', fontFamily: "'Crimson Text', serif", fontSize: '1rem', fontStyle: 'italic' }}>Загрузка…</p>
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

  const baseTabs = [
    { id: 'synopsis', label: 'Содержание' },
    { id: 'vocab', label: 'Словарь' },
    { id: 'quotes', label: 'Цитаты' },
    { id: 'thoughts', label: 'Мысли' },
    { id: 'notes', label: 'Заметки' },
  ];
  const tabs = isAdmin ? [{ id: 'photo', label: 'Фото' }, ...baseTabs] : baseTabs;

  const displayCover = coverChanged ? coverBase64 : (book.cover || null);

  return (
    <>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: '480px', position: 'relative' }}>

          {/* Hero — album/landscape image with gradient fade */}
          <div style={{ width: '100%', position: 'relative', overflow: 'hidden', background: 'linear-gradient(140deg,#0c1f0f,#060e07)' }}>
            {displayCover ? (
              <div style={{ position: 'relative' }}>
                <img
                  src={displayCover}
                  alt={book.title}
                  style={{
                    width: '100%',
                    height: '260px',
                    objectFit: 'cover',
                    objectPosition: 'center top',
                    display: 'block',
                    filter: 'brightness(0.82)',
                  }}
                />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to bottom, rgba(13,28,17,.15) 0%, transparent 35%, var(--bg) 100%)',
                }} />
              </div>
            ) : (
              <div style={{
                height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', position: 'relative',
                background: 'linear-gradient(140deg,#0c1f0f,#060e07)',
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
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              ← Библиотека
            </button>
          </div>

          {/* Info block */}
          <div style={{ padding: '0 20px 0', marginTop: displayCover ? '-32px' : '0', position: 'relative', zIndex: 1 }}>
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
                <button className="vdelbtn" onClick={handleDelete} disabled={isDeleting}>Удалить книгу</button>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="vtabs" style={{ borderTop: '1px solid var(--border)' }}>
            {tabs.map(t => (
              <button
                key={t.id}
                className={`vt ${activeTab === t.id ? 'active' : ''}`}
                onClick={() => { setActiveTab(t.id); setEditingTab(null); }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ padding: '20px', minHeight: '220px' }}>

            {/* PHOTO TAB */}
            {activeTab === 'photo' && isAdmin && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ padding: '10px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text2)', fontFamily: "'Crimson Text', serif", fontSize: '.76rem', letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', textAlign: 'left' }}
                >
                  📷 Загрузить новое фото
                </button>
                {(coverBase64 || coverOrigSrc) && (
                  <button
                    type="button"
                    onClick={() => setCropOrigSrc(coverOrigSrc || coverBase64)}
                    style={{ padding: '10px', background: 'transparent', border: '1px solid var(--gold2)', color: 'var(--gold)', fontFamily: "'Crimson Text', serif", fontSize: '.76rem', letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', textAlign: 'left' }}
                  >
                    ✂ Перекадрировать
                  </button>
                )}
                {coverBase64 && (
                  <button
                    type="button"
                    onClick={() => { setCoverBase64(null); setCoverOrigSrc(null); setCoverChanged(true); }}
                    style={{ padding: '10px', background: 'transparent', border: '1px solid rgba(122,53,32,.3)', color: 'rgba(160,80,55,.8)', fontFamily: "'Crimson Text', serif", fontSize: '.76rem', letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', textAlign: 'left' }}
                  >
                    ✕ Удалить обложку
                  </button>
                )}
                {coverChanged && (
                  <button className="sbtn" style={{ margin: 0, marginTop: '4px' }} onClick={saveCover} disabled={isUpdating}>
                    {isUpdating ? 'Сохранение…' : 'Сохранить обложку'}
                  </button>
                )}
                <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
              </div>
            )}

            {/* SYNOPSIS TAB */}
            {activeTab === 'synopsis' && (
              <>
                {editingTab === 'synopsis' ? (
                  <div>
                    <textarea
                      value={editSynopsis}
                      onChange={e => setEditSynopsis(e.target.value)}
                      placeholder="О чём эта книга…"
                      className="sn-area"
                      style={{ minHeight: '130px' }}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button className="vedit" onClick={cancelEdit}>Отмена</button>
                      <button className="sbtn" style={{ margin: 0 }} onClick={() => saveTab('synopsis')} disabled={isUpdating}>
                        {isUpdating ? 'Сохранение…' : 'Сохранить'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {book.synopsis?.trim() ? (
                      <div className="syn-body" style={{ fontSize: '1.05rem' }}>{book.synopsis}</div>
                    ) : (
                      <div className="sec-empty">Синопсис не добавлен</div>
                    )}
                    {isAdmin && (
                      <button className="vedit" style={{ marginTop: '12px', width: '100%' }} onClick={() => startEdit('synopsis')}>
                        ✎ Редактировать
                      </button>
                    )}
                  </>
                )}
              </>
            )}

            {/* VOCAB TAB */}
            {activeTab === 'vocab' && (
              <>
                {editingTab === 'vocab' ? (
                  <div>
                    <div className="vlist">
                      {editVocab.map(v => (
                        <div key={v.id} className="ve">
                          <input type="text" placeholder="Слово" value={v.word} onChange={e => updateV(v.id, 'word', e.target.value)} />
                          <input type="text" placeholder="Объяснение" value={v.meaning} onChange={e => updateV(v.id, 'meaning', e.target.value)} />
                          <button type="button" className="vd" onClick={() => removeVRow(v.id)}>✕</button>
                        </div>
                      ))}
                    </div>
                    <button type="button" className="vadd" onClick={addVRow}>+ Добавить слово</button>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <button className="vedit" onClick={cancelEdit}>Отмена</button>
                      <button className="sbtn" style={{ margin: 0 }} onClick={() => saveTab('vocab')} disabled={isUpdating}>
                        {isUpdating ? 'Сохранение…' : 'Сохранить'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {book.vocab && book.vocab.length > 0 ? (
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
                    )}
                    {isAdmin && (
                      <button className="vedit" style={{ marginTop: '12px', width: '100%' }} onClick={() => startEdit('vocab')}>
                        ✎ Редактировать словарь
                      </button>
                    )}
                  </>
                )}
              </>
            )}

            {/* QUOTES TAB */}
            {activeTab === 'quotes' && (
              <>
                {editingTab === 'quotes' ? (
                  <div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                      {editQuotes.map(q => (
                        <div key={q.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px', alignItems: 'flex-start' }}>
                          <textarea
                            value={q.text}
                            onChange={e => updateQuote(q.id, e.target.value)}
                            placeholder="«Цитата из книги»"
                            style={{
                              width: '100%', padding: '9px', background: 'rgba(8,16,10,.8)',
                              border: '1px solid var(--border)', fontFamily: "'IM Fell English', serif",
                              fontSize: '.9rem', color: 'var(--text)', outline: 'none',
                              resize: 'vertical', lineHeight: 1.6, minHeight: '64px', borderRadius: 0,
                            }}
                          />
                          <button type="button" className="vd" style={{ height: '64px', width: '32px', flexShrink: 0 }} onClick={() => removeQuote(q.id)}>✕</button>
                        </div>
                      ))}
                    </div>
                    <button type="button" className="vadd" onClick={addQuote}>+ Добавить цитату</button>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <button className="vedit" onClick={cancelEdit}>Отмена</button>
                      <button className="sbtn" style={{ margin: 0 }} onClick={() => saveTab('quotes')} disabled={isUpdating}>
                        {isUpdating ? 'Сохранение…' : 'Сохранить'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {book.quotes?.trim() ? (
                      <div className="qwrap">
                        {book.quotes.split('\n').filter(l => l.trim()).map((l, i) => (
                          <div key={i} className="qitem">{l}</div>
                        ))}
                      </div>
                    ) : (
                      <div className="sec-empty">Цитаты не добавлены</div>
                    )}
                    {isAdmin && (
                      <button className="vedit" style={{ marginTop: '12px', width: '100%' }} onClick={() => startEdit('quotes')}>
                        ✎ Редактировать цитаты
                      </button>
                    )}
                  </>
                )}
              </>
            )}

            {/* THOUGHTS TAB */}
            {activeTab === 'thoughts' && (
              <>
                {editingTab === 'thoughts' ? (
                  <div>
                    <textarea
                      value={editThoughts}
                      onChange={e => setEditThoughts(e.target.value)}
                      placeholder="Впечатления, размышления…"
                      className="sn-area"
                      style={{ minHeight: '130px' }}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button className="vedit" onClick={cancelEdit}>Отмена</button>
                      <button className="sbtn" style={{ margin: 0 }} onClick={() => saveTab('thoughts')} disabled={isUpdating}>
                        {isUpdating ? 'Сохранение…' : 'Сохранить'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {book.thoughts?.trim() ? (
                      <div className="th-body">{book.thoughts}</div>
                    ) : (
                      <div className="sec-empty">Мысли не добавлены</div>
                    )}
                    {isAdmin && (
                      <button className="vedit" style={{ marginTop: '12px', width: '100%' }} onClick={() => startEdit('thoughts')}>
                        ✎ Редактировать
                      </button>
                    )}
                  </>
                )}
              </>
            )}

            {/* NOTES TAB */}
            {activeTab === 'notes' && (
              <div>
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
            )}
          </div>

          <div style={{ height: '60px' }} />
        </div>
      </div>

      {cropOrigSrc && (
        <Cropper
          imageSrc={cropOrigSrc}
          onCancel={() => setCropOrigSrc(null)}
          onApply={(b64) => {
            setCoverBase64(b64);
            setCoverChanged(true);
            setCropOrigSrc(null);
          }}
        />
      )}
    </>
  );
}
