import { useState } from "react";
import { Book } from "@workspace/api-client-react";
import { useBooksData } from "@/hooks/use-books";
import { useAdmin } from "@/hooks/use-admin";
import { BookFormSheet } from "@/components/BookFormSheet";
import { BookViewSheet } from "@/components/BookViewSheet";
import { showToast } from "@/components/Toast";

const LL: Record<string, string> = { ru: 'RU', en: 'EN', other: '?' };

function AdminLoginModal({
  onClose,
  login,
  isLoading,
  error,
  setError,
}: {
  onClose: () => void;
  login: (p: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
  setError: (e: string | null) => void;
}) {
  const [pw, setPw] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await login(pw);
    if (ok) {
      showToast("Режим редактирования включён");
      onClose();
    }
  };

  return (
    <div
      className="overlay open"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="sheet" style={{ maxHeight: "auto" }}>
        <div className="sheet-handle"></div>
        <div className="sh">
          <div className="sh-lbl">Управление библиотекой</div>
          <h2>Режим редактирования</h2>
          <button className="mc" onClick={onClose}>✕</button>
        </div>
        <div className="fb">
          <p style={{ fontFamily: "'Crimson Text', serif", color: "var(--text2)", fontSize: ".95rem", marginBottom: "16px", lineHeight: 1.6 }}>
            Введите пароль, чтобы добавлять и редактировать книги.
            Гости могут просматривать библиотеку без пароля.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Пароль</label>
              <input
                type="password"
                value={pw}
                onChange={e => { setPw(e.target.value); setError(null); }}
                placeholder="Введите пароль…"
                autoFocus
              />
              {error && (
                <p style={{ color: "#b04030", fontFamily: "'Crimson Text', serif", fontSize: ".85rem", marginTop: "5px" }}>
                  {error}
                </p>
              )}
            </div>
            <button className="sbtn" type="submit" disabled={isLoading || !pw.trim()}>
              {isLoading ? "Проверка…" : "Войти"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [langF, setLangF] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const { data: books = [], isLoading } = useBooksData(langF, search);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [viewBook, setViewBook] = useState<Book | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const { isAdmin, login, logout, isLoading: isLoginLoading, error: loginError, setError: setLoginError } = useAdmin();

  const handleOpenAdd = () => {
    if (!isAdmin) { setShowLoginModal(true); return; }
    setEditingBook(null);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (b: Book) => {
    setViewBook(null);
    setEditingBook(b);
    setIsAddOpen(true);
  };

  const handleLogout = () => {
    logout();
    showToast("Режим редактирования выключен");
  };

  return (
    <div id="app">
      <header>
        <div className="h-rule">
          <div className="hrl"></div>
          <div className="h-orn">✦ ✦ ✦</div>
          <div className="hrl r"></div>
        </div>
        <h1>Leshukov <em>Library</em></h1>
        <p className="h-sub">Книжная коллекция · Заметки · Мысли</p>

        <div className="lang-tabs">
          <button className={`lt ${langF === 'all' ? 'active' : ''}`} onClick={() => setLangF('all')}>Все</button>
          <button className={`lt ${langF === 'ru' ? 'active' : ''}`} onClick={() => setLangF('ru')}>Русские</button>
          <button className={`lt ${langF === 'en' ? 'active' : ''}`} onClick={() => setLangF('en')}>English</button>
          <button className={`lt ${langF === 'other' ? 'active' : ''}`} onClick={() => setLangF('other')}>Другие</button>
        </div>

        {isAdmin ? (
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="add-btn" style={{ flex: 1 }} onClick={handleOpenAdd}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Добавить книгу
            </button>
            <button
              className="add-btn"
              style={{ flex: "none", padding: "12px 14px", opacity: 0.6 }}
              onClick={handleLogout}
              title="Выйти из режима редактирования"
            >
              🔓
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="add-btn" style={{ flex: 1, opacity: 0.4, cursor: "default", pointerEvents: "none" }}>
              Библиотека Лешуковых
            </button>
            <button
              className="add-btn"
              style={{ flex: "none", padding: "12px 14px" }}
              onClick={() => setShowLoginModal(true)}
              title="Управление библиотекой"
            >
              🔒
            </button>
          </div>
        )}
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
            <div className="ei">📚</div>
            <h3>Библиотека пуста</h3>
            <p>{isAdmin ? "Добавьте первую книгу" : "Книги появятся здесь"}</p>
          </div>
        ) : (
          books.map((b, i) => (
            <div
              key={b.id}
              className="book-card"
              style={{ animationDelay: `${i * 0.04}s` }}
              onClick={() => setViewBook(b)}
            >
              <div className="card-cover">
                {b.cover ? (
                  <img src={b.cover} alt={b.title} loading="lazy" />
                ) : (
                  <div className="cover-placeholder">
                    <span className="cp-icon">📖</span>
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
        isAdmin={isAdmin}
      />

      {showLoginModal && (
        <AdminLoginModal
          onClose={() => setShowLoginModal(false)}
          login={login}
          isLoading={isLoginLoading}
          error={loginError}
          setError={setLoginError}
        />
      )}
    </div>
  );
}
