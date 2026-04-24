import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { normalizeAudioUrl, formatTime } from "@/lib/audio-url";
import { fetchAudioMeta, splitPartTitle } from "@/lib/audio-meta";
import type { AudioPart } from "@workspace/api-client-react";

interface Props {
  parts: AudioPart[];
  bookId: string;
}

const PROGRESS_KEY = (bookId: string) => `audio_pos_${bookId}`;
const RATE_KEY = "audio_rate";
const SKIP_SECONDS = 10;

function partLabel(rawTitle: string, idx: number): string {
  const { title } = splitPartTitle(rawTitle);
  return title || `Глава ${idx + 1}`;
}

export function AudioPlayer({ parts, bookId }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [rate, setRate] = useState(() => {
    const saved = parseFloat(localStorage.getItem(RATE_KEY) || "1");
    return isNaN(saved) ? 1 : saved;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const seekRef = useRef<HTMLInputElement>(null);
  const restoredRef = useRef(false);

  const { data: meta } = useQuery({
    queryKey: ["audio-meta", bookId],
    queryFn: () => fetchAudioMeta(bookId),
    staleTime: 60_000,
  });

  const current = parts[currentIdx];
  const currentSplit = current ? splitPartTitle(current.title) : { section: "", title: "" };

  useEffect(() => {
    if (!parts.length) return;
    try {
      const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY(bookId)) || "null");
      if (saved && typeof saved.idx === "number" && parts[saved.idx]) {
        setCurrentIdx(saved.idx);
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, parts.length]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    setError(null);
    setIsLoading(true);
    audio.src = normalizeAudioUrl(current.url);
    audio.playbackRate = rate;
    audio.volume = volume;
    restoredRef.current = false;
    if (playing) {
      audio.play().catch(() => setPlaying(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, current?.url]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
    localStorage.setItem(RATE_KEY, String(rate));
  }, [rate]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const saveProgress = useCallback((idx: number, time: number) => {
    try {
      localStorage.setItem(PROGRESS_KEY(bookId), JSON.stringify({ idx, time }));
    } catch {
      // ignore
    }
  }, [bookId]);

  const handleLoadedMeta = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setDuration(audio.duration || 0);
    setIsLoading(false);
    if (!restoredRef.current) {
      try {
        const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY(bookId)) || "null");
        if (saved && saved.idx === currentIdx && typeof saved.time === "number" && saved.time < audio.duration - 2) {
          audio.currentTime = saved.time;
        }
      } catch {
        // ignore
      }
      restoredRef.current = true;
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);
    if (Math.floor(audio.currentTime) % 5 === 0) {
      saveProgress(currentIdx, audio.currentTime);
    }
  };

  const handleEnded = () => {
    setPlaying(false);
    if (currentIdx < parts.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setPlaying(true);
    }
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      saveProgress(currentIdx, audio.currentTime);
    } else {
      audio.play().then(() => setPlaying(true)).catch(err => {
        setError("Не удалось загрузить аудио. Проверьте URL и доступ к файлу.");
        setPlaying(false);
        console.error("Audio play error", err);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const t = parseFloat(e.target.value);
    audio.currentTime = t;
    setCurrentTime(t);
  };

  const skip = (delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + delta));
  };

  const selectPart = (idx: number) => {
    if (audioRef.current) saveProgress(currentIdx, audioRef.current.currentTime);
    setCurrentIdx(idx);
    setPlaying(true);
  };

  const goPrev = () => {
    if (currentIdx > 0) selectPart(currentIdx - 1);
  };
  const goNext = () => {
    if (currentIdx < parts.length - 1) selectPart(currentIdx + 1);
  };

  if (!parts.length) return null;

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Group parts by section for the list
  const groups: { section: string; items: { part: AudioPart; idx: number }[] }[] = [];
  parts.forEach((p, i) => {
    const { section } = splitPartTitle(p.title);
    const last = groups[groups.length - 1];
    if (last && last.section === section) {
      last.items.push({ part: p, idx: i });
    } else {
      groups.push({ section, items: [{ part: p, idx: i }] });
    }
  });
  const hasAnySection = groups.some(g => g.section);

  return (
    <div className="ap-wrap">
      <audio
        ref={audioRef}
        onLoadedMetadata={handleLoadedMeta}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={() => {
          setError("Ошибка загрузки. Если файл на Google Drive — убедитесь что доступ открыт «всем по ссылке».");
          setIsLoading(false);
          setPlaying(false);
        }}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => { setIsLoading(false); setPlaying(true); }}
        onPause={() => setPlaying(false)}
        preload="metadata"
      />

      {/* Audiobook meta (narrator / about) */}
      {(meta?.narrator || meta?.about) && (
        <div className="ap-meta">
          {meta.narrator && (
            <div className="ap-meta-row">
              <span className="ap-meta-label">Озвучивает</span>
              <span className="ap-meta-value">{meta.narrator}</span>
            </div>
          )}
          {meta.about && (
            <div className="ap-meta-about">{meta.about}</div>
          )}
        </div>
      )}

      {/* Now playing label */}
      <div className="ap-now">
        <div className="ap-now-label">Сейчас играет</div>
        <div className="ap-now-title">
          <span className="ap-now-num">{String(currentIdx + 1).padStart(2, "0")}</span>
          <div className="ap-now-text">
            {currentSplit.section && (
              <span className="ap-now-section">{currentSplit.section}</span>
            )}
            <span>{currentSplit.title || `Глава ${currentIdx + 1}`}</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="ap-progress">
        <input
          ref={seekRef}
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="ap-seek"
          style={{ "--pct": `${progressPct}%` } as React.CSSProperties}
        />
        <div className="ap-times">
          <span>{formatTime(currentTime)}</span>
          <span>{isLoading ? "загрузка…" : formatTime(duration)}</span>
        </div>
      </div>

      {/* Main controls */}
      <div className="ap-controls">
        <button className="ap-btn ap-btn-sm" onClick={goPrev} disabled={currentIdx === 0} title="Предыдущая часть">⏮</button>
        <button className="ap-btn ap-btn-sm" onClick={() => skip(-SKIP_SECONDS)} title={`Назад ${SKIP_SECONDS}с`}>−{SKIP_SECONDS}</button>
        <button className="ap-btn ap-btn-play" onClick={togglePlay} title={playing ? "Пауза" : "Играть"}>
          {playing ? "❚❚" : "▶"}
        </button>
        <button className="ap-btn ap-btn-sm" onClick={() => skip(SKIP_SECONDS)} title={`Вперёд ${SKIP_SECONDS}с`}>+{SKIP_SECONDS}</button>
        <button className="ap-btn ap-btn-sm" onClick={goNext} disabled={currentIdx >= parts.length - 1} title="Следующая часть">⏭</button>
      </div>

      {/* Sub controls: rate + volume */}
      <div className="ap-sub">
        <div className="ap-rate">
          <span className="ap-sub-label">Скорость</span>
          <div className="ap-rate-btns">
            {[0.75, 1, 1.25, 1.5, 1.75, 2].map(r => (
              <button
                key={r}
                className={`ap-rate-btn ${Math.abs(rate - r) < 0.01 ? "active" : ""}`}
                onClick={() => setRate(r)}
              >
                {r}×
              </button>
            ))}
          </div>
        </div>
        <div className="ap-vol">
          <span className="ap-sub-label">Громкость</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
            className="ap-vol-slider"
            style={{ "--pct": `${volume * 100}%` } as React.CSSProperties}
          />
        </div>
      </div>

      {error && (
        <div className="ap-error">{error}</div>
      )}

      {/* Parts list */}
      {parts.length > 1 && (
        <div className="ap-parts">
          <div className="ap-parts-label">{hasAnySection ? "Содержание" : `Части (${parts.length})`}</div>
          <div className="ap-parts-list">
            {groups.map((g, gi) => (
              <div key={gi} className="ap-group">
                {g.section && (
                  <div className="ap-group-head">{g.section}</div>
                )}
                {g.items.map(({ part, idx }) => {
                  const { title } = splitPartTitle(part.title);
                  const display = title || `Глава ${idx + 1}`;
                  return (
                    <button
                      key={part.id}
                      className={`ap-part ${idx === currentIdx ? "active" : ""}`}
                      onClick={() => selectPart(idx)}
                    >
                      <span className="ap-part-num">{String(idx + 1).padStart(2, "0")}</span>
                      <span className="ap-part-title">{display}</span>
                      {idx === currentIdx && playing && <span className="ap-part-bars">▌▌▌</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
