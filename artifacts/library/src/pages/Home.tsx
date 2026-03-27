import { useState } from "react";
import { Book } from "@workspace/api-client-react";
import { useBooksData } from "@/hooks/use-books";
import { BookFormSheet } from "@/components/BookFormSheet";
import { BookViewSheet } from "@/components/BookViewSheet";

const LL: Record<string, string> = { ru: 'RU', en: 'EN', other: '?' };

export default function Home() {
  const [langF, setLangF] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  
  const { data: books = [], isLoading } = useBooksData(langF, search);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  
  const [viewBook, setViewBook] = useState<Book | null>(null);
  
  const handleOpenAdd = () => {
    setEditingBook(null);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (b: Book) => {
    setViewBook(null);
    setEditingBook(b);
    setIsAddOpen(true);
  };

  return (
    <div id="app">
      <header>
        <div className="h-rule">
          <div className="hrl"></div>
          <div className="h-orn">&#10022; &#10022; &#10022;</div>
          <div className="hrl r"></div>
        </div>
        <h1>Leshukov <em>Library</em></h1>
        <p className="h-sub">Книжная коллекция &middot; Заметки &middot; Мысли</p>
        
        <div className="lang-tabs">
          <button className={`lt ${langF === 'all' ? 'active' : ''}`} onClick={() => setLangF('all')}>Все</button>
          <button className={`lt ${langF === 'ru' ? 'active' : ''}`} onClick={() => setLangF('ru')}>Русские</button>
          <button className={`lt ${langF === 'en' ? 'active' : ''}`} onClick={() => setLangF('en')}>English</button>
          <button className={`lt ${langF === 'other' ? 'active' : ''}`} onClick={() => setLangF('other')}>Другие</button>
        </div>
        
        <button className="add-btn" onClick={handleOpenAdd}>
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Добавить книгу
        </button>
      </header>

      <div className="controls">
        <div className="sw">
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input 
            className="si" 
            type="text" 
            placeholder="Поиск…" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="stats">
          <strong>{books.length}</strong> книг
        </div>
      </div>

      <div className="grid-books">
        {isLoading ? (
          <div className="empty">
            <p>Загрузка библиотеки...</p>
          </div>
        ) : books.length === 0 ? (
          <div className="empty">
            <div className="ei">&#128218;</div>
            <h3>Библиотека пуста</h3>
            <p>Добавьте первую книгу</p>
          </div>
        ) : (
          books.map((b, i) => (
            <div 
              key={b.id} 
              className="book-card" 
              style={{animationDelay: `${i * 0.04}s`}}
              onClick={() => setViewBook(b)}
            >
              <div className="card-cover">
                {b.cover ? (
                  <img src={b.cover} alt={b.title} loading="lazy" />
                ) : (
                  <div className="cover-placeholder">
                    <span className="cp-icon">&#128218;</span>
                    <span className="cp-title">{b.title}</span>
                    <span className="cp-auth">{b.author}</span>
                  </div>
                )}
                <div className="card-lang-badge">{LL[b.lang] || b.lang}</div>
              </div>
              <div className="card-info">
                <div className="ci-auth">{b.author}</div>
                <div className="ci-title">{b.title}</div>
                <div className="ci-meta">
                  {b.genre && <div className="ci-genre">{b.genre}</div>}
                  <div className="ci-year">{b.year || ''}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <BookFormSheet 
        isOpen={isAddOpen} 
        onClose={() => setIsAddOpen(false)} 
        editBook={editingBook}
      />
      
      <BookViewSheet 
        isOpen={!!viewBook} 
        book={viewBook} 
        onClose={() => setViewBook(null)}
        onEdit={() => viewBook && handleOpenEdit(viewBook)}
      />
    </div>
  );
}
