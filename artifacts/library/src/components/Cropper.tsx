import { useState, useRef, useEffect, useCallback } from "react";

type Orient = 'portrait' | 'landscape';

const ASPECTS: Record<Orient, number> = {
  portrait: 2 / 3,
  landscape: 3 / 2,
};

interface CropperProps {
  imageSrc: string;
  onApply: (base64: string) => void;
  onCancel: () => void;
}

export function Cropper({ imageSrc, onApply, onCancel }: CropperProps) {
  const [orient, setOrient] = useState<Orient>('portrait');
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const stateRef = useRef({
    offX: 0,
    offY: 0,
    imgNW: 0,
    imgNH: 0,
    scale: 1,
    userZoom: 1,
    loaded: false,
  });

  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);
  const [, forceUpdate] = useState(0);

  const getFrameSize = (currentOrient: Orient) => {
    const maxW = Math.min(320, window.innerWidth - 40);
    const asp = ASPECTS[currentOrient];
    return { fw: maxW, fh: Math.round(maxW / asp) };
  };

  const applyLayout = useCallback((
    nw: number, nh: number,
    currentOrient: Orient,
    userZoom: number,
    offX: number, offY: number,
    resetOffset = false
  ) => {
    if (!frameRef.current || !imgRef.current) return;
    const { fw, fh } = getFrameSize(currentOrient);
    frameRef.current.style.width = `${fw}px`;
    frameRef.current.style.height = `${fh}px`;

    const baseScale = Math.max(fw / nw, fh / nh);
    const scale = baseScale * userZoom;

    const rW = Math.round(nw * scale);
    const rH = Math.round(nh * scale);

    const newOffX = resetOffset ? Math.max(0, (rW - fw) / 2) : Math.max(0, Math.min(offX, rW - fw));
    const newOffY = resetOffset ? Math.max(0, (rH - fh) / 2) : Math.max(0, Math.min(offY, rH - fh));

    imgRef.current.style.width = `${rW}px`;
    imgRef.current.style.height = `${rH}px`;
    imgRef.current.style.left = `-${newOffX}px`;
    imgRef.current.style.top = `-${newOffY}px`;

    stateRef.current = { offX: newOffX, offY: newOffY, imgNW: nw, imgNH: nh, scale, userZoom, loaded: true };
    forceUpdate(n => n + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const t = e.target as HTMLImageElement;
    applyLayout(t.naturalWidth, t.naturalHeight, orient, 1, 0, 0, true);
  };

  // Zoom centered on the visible center of the frame
  const zoom = (delta: number) => {
    const s = stateRef.current;
    if (!s.loaded) return;
    const newZoom = Math.max(1, Math.min(4, s.userZoom + delta));
    const { fw, fh } = getFrameSize(orient);
    // Keep the center of the visible area fixed during zoom
    const oldScale = s.scale;
    const baseScale = Math.max(fw / s.imgNW, fh / s.imgNH);
    const newScale = baseScale * newZoom;
    const centerOrigX = (s.offX + fw / 2) / oldScale;
    const centerOrigY = (s.offY + fh / 2) / oldScale;
    const newOffX = centerOrigX * newScale - fw / 2;
    const newOffY = centerOrigY * newScale - fh / 2;
    applyLayout(s.imgNW, s.imgNH, orient, newZoom, newOffX, newOffY);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    zoom(e.deltaY < 0 ? 0.15 : -0.15);
  };

  const getXY = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if ('touches' in e) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
  };

  const getPinchDist = (e: TouchEvent) => {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e && e.touches.length === 2) return;
    const p = getXY(e);
    dragRef.current = { x: p.x, y: p.y, ox: stateRef.current.offX, oy: stateRef.current.offY };
  };

  useEffect(() => {
    const frame = frameRef.current;
    const overlay = overlayRef.current;
    if (!frame || !overlay) return;

    // Prevent ALL default touch behaviour on the overlay to block browser pinch-zoom
    const blockDefault = (e: TouchEvent) => {
      if (e.touches.length >= 2) e.preventDefault();
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        dragRef.current = null;
        pinchRef.current = { dist: getPinchDist(e), zoom: stateRef.current.userZoom };
      }
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!imgRef.current || !frameRef.current) return;
      if (e.cancelable) e.preventDefault();

      if ('touches' in e && e.touches.length === 2 && pinchRef.current) {
        const newDist = getPinchDist(e);
        const ratio = newDist / pinchRef.current.dist;
        const s = stateRef.current;
        const newZoom = Math.max(1, Math.min(4, pinchRef.current.zoom * ratio));
        // Keep pinch midpoint fixed
        const { fw, fh } = getFrameSize(orient);
        const baseScale = Math.max(fw / s.imgNW, fh / s.imgNH);
        const newScale = baseScale * newZoom;
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const rect = frameRef.current.getBoundingClientRect();
        const pivotX = midX - rect.left;
        const pivotY = midY - rect.top;
        const origPivotX = (s.offX + pivotX) / s.scale;
        const origPivotY = (s.offY + pivotY) / s.scale;
        const newOffX = origPivotX * newScale - pivotX;
        const newOffY = origPivotY * newScale - pivotY;
        applyLayout(s.imgNW, s.imgNH, orient, newZoom, newOffX, newOffY);
        return;
      }

      if (!dragRef.current) return;
      const p = getXY(e);
      const rW = parseInt(imgRef.current.style.width) || 0;
      const rH = parseInt(imgRef.current.style.height) || 0;
      const fW = frameRef.current.offsetWidth;
      const fH = frameRef.current.offsetHeight;
      const newOffX = Math.max(0, Math.min(dragRef.current.ox + (dragRef.current.x - p.x), rW - fW));
      const newOffY = Math.max(0, Math.min(dragRef.current.oy + (dragRef.current.y - p.y), rH - fH));
      imgRef.current.style.left = `-${newOffX}px`;
      imgRef.current.style.top = `-${newOffY}px`;
      stateRef.current = { ...stateRef.current, offX: newOffX, offY: newOffY };
    };

    const handleEnd = () => {
      dragRef.current = null;
      pinchRef.current = null;
    };

    overlay.addEventListener('touchstart', blockDefault, { passive: false });
    frame.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchend', handleEnd);

    return () => {
      overlay.removeEventListener('touchstart', blockDefault);
      frame.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [orient, applyLayout]);

  const handleOrientChange = (o: Orient) => {
    setOrient(o);
    const s = stateRef.current;
    if (s.loaded) applyLayout(s.imgNW, s.imgNH, o, s.userZoom, s.offX, s.offY, true);
  };

  const handleApply = () => {
    if (!frameRef.current || !imgRef.current) return;
    const asp = ASPECTS[orient];
    const outW = 600;
    const outH = Math.round(outW / asp);
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = stateRef.current;
    const sx = s.offX / s.scale;
    const sy = s.offY / s.scale;
    const sw = frameRef.current.offsetWidth / s.scale;
    const sh = frameRef.current.offsetHeight / s.scale;
    ctx.drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, outW, outH);
    onApply(canvas.toDataURL('image/jpeg', 0.88));
  };

  const currentZoom = stateRef.current.userZoom;

  return (
    <div
      className="crop-ov"
      ref={overlayRef}
      style={{ touchAction: 'none' }}
    >
      <div className="crop-top">
        <h3>Выберите область обложки</h3>
        <p>Перетащите или щипком масштабируйте</p>
      </div>

      <div className="crop-orient" style={{ maxWidth: '320px' }}>
        <button
          className={`co-btn ${orient === 'portrait' ? 'active' : ''}`}
          onClick={() => handleOrientChange('portrait')}
        >📱 Портрет</button>
        <button
          className={`co-btn ${orient === 'landscape' ? 'active' : ''}`}
          onClick={() => handleOrientChange('landscape')}
        >🖼 Альбом</button>
      </div>

      <div
        className="crop-frame"
        ref={frameRef}
        onMouseDown={handleStart}
        onTouchStart={handleStart}
        onWheel={handleWheel}
      >
        <img
          ref={imgRef}
          src={imageSrc}
          onLoad={onImageLoad}
          draggable={false}
          alt=""
        />
      </div>

      {/* Zoom controls */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '10px', width: '100%', maxWidth: '320px', alignItems: 'center', justifyContent: 'center' }}>
        <button
          onPointerDown={e => { e.preventDefault(); zoom(-0.2); }}
          disabled={currentZoom <= 1}
          style={{
            width: '44px', height: '44px', background: 'transparent',
            border: '1px solid var(--border)', color: 'var(--text2)',
            fontSize: '1.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: currentZoom <= 1 ? 0.3 : 1, fontFamily: 'monospace', flexShrink: 0,
            touchAction: 'manipulation',
          }}
        >−</button>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <input
            type="range"
            min={100} max={400} step={5}
            value={Math.round(currentZoom * 100)}
            onChange={e => {
              const target = Number(e.target.value) / 100;
              const s = stateRef.current;
              if (!s.loaded) return;
              const { fw, fh } = getFrameSize(orient);
              const baseScale = Math.max(fw / s.imgNW, fh / s.imgNH);
              const newScale = baseScale * target;
              const centerOrigX = (s.offX + fw / 2) / s.scale;
              const centerOrigY = (s.offY + fh / 2) / s.scale;
              applyLayout(s.imgNW, s.imgNH, orient, target, centerOrigX * newScale - fw / 2, centerOrigY * newScale - fh / 2);
            }}
            style={{ width: '100%', accentColor: 'var(--gold)', cursor: 'pointer', touchAction: 'none' }}
          />
          <span style={{ fontFamily: "'Crimson Text', serif", fontSize: '.78rem', color: 'var(--text3)', letterSpacing: '.05em' }}>
            {Math.round(currentZoom * 100)}%
          </span>
        </div>
        <button
          onPointerDown={e => { e.preventDefault(); zoom(0.2); }}
          disabled={currentZoom >= 4}
          style={{
            width: '44px', height: '44px', background: 'transparent',
            border: '1px solid var(--border)', color: 'var(--text2)',
            fontSize: '1.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: currentZoom >= 4 ? 0.3 : 1, fontFamily: 'monospace', flexShrink: 0,
            touchAction: 'manipulation',
          }}
        >+</button>
      </div>

      <div className="crop-btns">
        <button className="crop-cancel" onClick={onCancel}>Отмена</button>
        <button className="crop-apply" onClick={handleApply}>Применить</button>
      </div>
    </div>
  );
}
