import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Book } from "@workspace/api-client-react";
import { useBooksData } from "@/hooks/use-books";
import { useAdmin } from "@/hooks/use-admin";
import { BookFormSheet } from "@/components/BookFormSheet";
import { showToast } from "@/components/Toast";

const LL: Record<string, string> = { ru: 'RU', en: 'EN', other: '?' };

function PinModal({ onClose, login, isLoading, error, setError }: {
  onClose: () => void;
  login: (p: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
  setError: (e: string | null) => void;
}) {
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  useEffect(() => {
    if (pin.length === 4) {
      login(pin).then(ok => {
        if (ok) {
          showToast("Режим редактирования включён");
          onClose();
        } else {
          setShake(true);
          setTimeout(() => { setShake(false); setPin(""); setError(null); }, 550);
        }
      });
    }
  }, [pin]);

  const handleKey = (digit: string) => {
    if (isLoading || pin.length >= 4) return;
    setError(null);
    setPin(p => p + digit);
  };

  const handleDel = () => {
    if (isLoading) return;
    setPin(p => p.slice(0, -1));
    setError(null);
  };

  return (
    <div className="overlay open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" style={{ borderRadius: '18px', maxHeight: '420px' }}>
        <div className="sheet-handle" />
        <div style={{ padding: '22px 20px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
          <div style={{ fontFamily: "'IM Fell English', serif", fontSize: '.78rem', color: 'var(--gold2)', fontStyle: 'italic', marginBottom: '14px', letterSpacing: '.05em' }}>
            Введите код доступа
          </div>

          {/* 4 dots */}
          <div style={{ display: 'flex', gap: '14px', marginBottom: '24px' }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{
                width: '14px', height: '14px', borderRadius: '50%',
                border: '1.5px solid var(--gold2)',
                background: i < pin.length ? 'var(--gold)' : 'transparent',
                transition: 'background .15s',
                animation: shake ? `pinShake .45s ease` : 'none',
              }} />
            ))}
          </div>

          {/* Hidden real input for mobile keyboard */}
          <input
            ref={inputRef}
            type="tel"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={e => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 4);
              setPin(v);
              setError(null);
            }}
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
            readOnly={isLoading}
          />

          {/* Numpad */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', width: '100%', maxWidth: '240px' }}>
            {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
              d === '' ? <div key={i} /> :
              d === '⌫' ? (
                <button key={i} onClick={handleDel} style={{
                  padding: '16px 0', background: 'transparent',
                  border: '1px solid var(--border)', color: 'var(--text2)',
                  fontFamily: 'system-ui', fontSize: '1.1rem', cursor: 'pointer',
                  borderRadius: '4px', transition: 'all .15s',
                }}>⌫</button>
              ) : (
                <button key={i} onClick={() => handleKey(d)} disabled={isLoading || pin.length >= 4} style={{
                  padding: '16px 0', background: 'transparent',
                  border: '1px solid var(--border)', color: 'var(--ivory)',
                  fontFamily: "'Playfair Display', serif", fontSize: '1.2rem',
                  fontWeight: 700, cursor: 'pointer', borderRadius: '4px',
                  transition: 'all .15s', opacity: isLoading ? 0.5 : 1,
                }}>{d}</button>
              )
            ))}
          </div>

          {error && (
            <p style={{ marginTop: '14px', color: 'rgba(180,70,50,.9)', fontFamily: "'Crimson Text', serif", fontSize: '.85rem', fontStyle: 'italic' }}>
              Неверный код
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pinShake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-6px)}
          40%{transform:translateX(6px)}
          60%{transform:translateX(-4px)}
          80%{transform:translateX(4px)}
        }
      `}</style>
    </div>
  );
}

export default function Home() {
  const [, navigate] = useLocation();
  const [langF, setLangF] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const { data: books = [], isLoading } = useBooksData(langF, search);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingBook] = useState<Book | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);

  const { isAdmin, login, logout, isLoading: isLoginLoading, error: loginError, setError: setLoginError } = useAdmin();

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
          {[
            { key: 'all', label: 'Все' },
            { key: 'ru', label: 'Русские' },
            { key: 'en', label: 'English' },
            { key: 'other', label: 'Другие' },
          ].map(t => (
            <button key={t.key} className={`lt ${langF === t.key ? 'active' : ''}`} onClick={() => setLangF(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {isAdmin ? (
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="add-btn" style={{ flex: 1 }} onClick={() => setIsAddOpen(true)}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Добавить книгу
            </button>
            <button className="add-btn" style={{ flex: "none", padding: "12px 14px", opacity: 0.55 }} onClick={handleLogout} title="Выйти">
              🔓
            </button>
          </div>
        ) : (
          <button
            className="add-btn"
            style={{ width: '100%', opacity: 0.38, cursor: 'pointer', letterSpacing: '.35em', fontSize: '.65rem', color: 'var(--text3)', borderColor: 'var(--border)' }}
            onClick={() => setShowPinModal(true)}
          >
            · · · ·
          </button>
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
          <div className="empty"><p>Загрузка…</p></div>
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
              onClick={() => navigate(`/book/${b.id}`)}
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

      {showPinModal && (
        <PinModal
          onClose={() => setShowPinModal(false)}
          login={login}
          isLoading={isLoginLoading}
          error={loginError}
          setError={setLoginError}
        />
      )}
    </div>
  );
}
