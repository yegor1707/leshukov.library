import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Book } from "@workspace/api-client-react";
import { useBooksData } from "@/hooks/use-books";
import { useAdmin } from "@/hooks/use-admin";
import { BookFormSheet } from "@/components/BookFormSheet";
import { showToast } from "@/components/Toast";

const LL: Record<string, string> = { ru: 'RU', en: 'EN', other: '?' };

function CardTitle({ title }: { title: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const resize = () => {
      el.style.fontSize = '';
      const containerW = el.offsetWidth;
      if (!containerW) return;

      const cs = getComputedStyle(el);
      const baseSize = parseFloat(cs.fontSize);

      const probe = document.createElement('span');
      probe.style.cssText = [
        'position:fixed', 'top:-9999px', 'left:-9999px',
        'visibility:hidden', 'white-space:nowrap', 'pointer-events:none',
        `font-family:${cs.fontFamily}`, `font-weight:${cs.fontWeight}`,
        `font-size:${baseSize}px`, `letter-spacing:${cs.letterSpacing}`,
      ].join(';');
      document.body.appendChild(probe);

      let maxWordW = 0;
      for (const word of title.split(/\s+/).filter(Boolean)) {
        probe.textContent = word;
        if (probe.scrollWidth > maxWordW) maxWordW = probe.scrollWidth;
      }
      document.body.removeChild(probe);

      if (maxWordW > containerW) {
        const scaled = baseSize * (containerW / maxWordW) * 0.96;
        el.style.fontSize = `${Math.max(scaled, 9)}px`;
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [title]);

  return <div ref={ref} className="ci-title">{title}</div>;
}

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

  useEffect(() => { inputRef.current?.focus(); }, []);

  const tryLogin = async (code: string) => {
    const ok = await login(code);
    if (ok) {
      showToast("Режим редактирования включён");
      onClose();
    } else {
      setShake(true);
      setTimeout(() => { setShake(false); setPin(""); setError(null); }, 500);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(v);
    setError(null);
    if (v.length === 4) tryLogin(v);
  };

  return (
    <div className="overlay open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" style={{ maxHeight: 'auto' }}>
        <div className="sheet-handle" />
        <div style={{ padding: '24px 24px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>

          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: 'var(--ivory)', fontWeight: 700 }}>
            Введите код доступа
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{
                width: '13px', height: '13px', borderRadius: '50%',
                border: '1.5px solid var(--gold2)',
                background: i < pin.length ? 'var(--gold)' : 'transparent',
                transition: 'background .12s',
                animation: shake ? 'pinShake .45s ease' : 'none',
              }} />
            ))}
          </div>

          <input
            ref={inputRef}
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            autoFocus
            maxLength={4}
            value={pin}
            onChange={handleChange}
            disabled={isLoading}
            placeholder="• • • •"
            style={{
              width: '160px', padding: '12px 0', textAlign: 'center',
              background: 'rgba(8,16,10,.8)', border: '1px solid var(--border)',
              fontFamily: "'Playfair Display', serif", fontSize: '1.6rem',
              letterSpacing: '.5em', color: 'var(--ivory)',
              outline: 'none', borderRadius: 0,
              caretColor: 'transparent',
            }}
          />

          {error && (
            <p style={{ color: 'rgba(180,70,50,.9)', fontFamily: "'Crimson Text', serif", fontSize: '.85rem', fontStyle: 'italic', marginTop: '-10px' }}>
              Неверный код
            </p>
          )}

          <p style={{ fontFamily: "'Crimson Text', serif", fontSize: '.78rem', color: 'var(--text3)', fontStyle: 'italic' }}>
            Введите 4 цифры — вход автоматический
          </p>
        </div>
      </div>
      <style>{`
        @keyframes pinShake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-7px)}
          40%{transform:translateX(7px)}
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

  return (
    <div id="app">
      <header style={{ position: 'relative' }}>

        {/* Lock / unlock icon */}
        <button
          onClick={() => isAdmin ? (logout(), showToast("Режим редактирования выключен")) : setShowPinModal(true)}
          title={isAdmin ? "Выйти из режима редактирования" : "Войти"}
          style={{
            position: 'absolute', top: '14px', right: '14px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: isAdmin ? 'var(--gold2)' : 'var(--text3)',
            fontSize: '1rem', opacity: isAdmin ? 0.8 : 0.35,
            padding: '4px', lineHeight: 1,
          }}
        >
          {isAdmin ? '🔓' : '🔒'}
        </button>

        <div className="h-rule">
          <div className="hrl"></div>
          <div className="h-orn">✦ ✦ ✦</div>
          <div className="hrl r"></div>
        </div>
        <h1>Leshukov <em>Library</em></h1>
        <p className="h-sub">Книжная коллекция</p>

        {/* Search — lives in sidebar on desktop, in header on mobile */}
        <div className="header-search">
          <div className="sw">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="si" type="text" placeholder="Поиск…"
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

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

        {isAdmin && (
          <button className="add-btn" onClick={() => setIsAddOpen(true)}>
            <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Добавить книгу
          </button>
        )}

        <div className="h-stats"><strong>{books.length}</strong> книг</div>
      </header>

      {/* Mobile-only controls row (hidden on desktop) */}
      <div className="controls mobile-controls">
        <div className="stats"><strong>{books.length}</strong> книг</div>
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
              key={b.id} className="book-card"
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
                <CardTitle title={b.title} />
                <div className="ci-auth">{b.author}</div>
                <div className="ci-meta">
                  {b.genre && <div className="ci-genre">{b.genre}</div>}
                  <div className="ci-year">{b.year || ''}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <BookFormSheet isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} editBook={editingBook} />

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
