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
  defaultOrient?: Orient;
  hideToggle?: boolean;
}

export function Cropper({ imageSrc, onApply, onCancel, defaultOrient = 'portrait', hideToggle = false }: CropperProps) {
  const [orient, setOrient] = useState<Orient>(defaultOrient);
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const stateRef = useRef({
    offX: 0,
    offY: 0,
    imgNW: 0,
    imgNH: 0,
    userZoom: 1,
    loaded: false,
  });

  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const pinchRef = useRef<{ dist: number; zoom: number; midX: number; midY: number } | null>(null);
  const [displayZoom, setDisplayZoom] = useState(1);

  const getFrameSize = (o: Orient) => {
    const maxW = Math.min(320, window.innerWidth - 40);
    const asp = ASPECTS[o];
    return { fw: maxW, fh: Math.round(maxW / asp) };
  };

  const getBaseScale = (nw: number, nh: number, o: Orient) => {
    const { fw, fh } = getFrameSize(o);
    return Math.max(fw / nw, fh / nh);
  };

  // Apply layout: set frame size, image size and position
  const applyLayout = useCallback((
    nw: number, nh: number,
    o: Orient,
    userZoom: number,
    offX: number, offY: number,
  ) => {
    if (!frameRef.current || !imgRef.current) return;
    const { fw, fh } = getFrameSize(o);
    const baseScale = getBaseScale(nw, nh, o);
    const scale = baseScale * userZoom;

    const rW = Math.round(nw * scale);
    const rH = Math.round(nh * scale);

    // Clamp offsets
    const clampedOffX = Math.max(0, Math.min(offX, Math.max(0, rW - fw)));
    const clampedOffY = Math.max(0, Math.min(offY, Math.max(0, rH - fh)));

    frameRef.current.style.width = `${fw}px`;
    frameRef.current.style.height = `${fh}px`;
    imgRef.current.style.width = `${rW}px`;
    imgRef.current.style.height = `${rH}px`;
    imgRef.current.style.left = `-${clampedOffX}px`;
    imgRef.current.style.top = `-${clampedOffY}px`;

    stateRef.current = { offX: clampedOffX, offY: clampedOffY, imgNW: nw, imgNH: nh, userZoom, loaded: true };
    setDisplayZoom(userZoom);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const t = e.target as HTMLImageElement;
    const nw = t.naturalWidth;
    const nh = t.naturalHeight;
    const { fw, fh } = getFrameSize(orient);
    const baseScale = getBaseScale(nw, nh, orient);
    const rW = Math.round(nw * baseScale);
    const rH = Math.round(nh * baseScale);
    // Center the image
    const offX = Math.max(0, (rW - fw) / 2);
    const offY = Math.max(0, (rH - fh) / 2);
    applyLayout(nw, nh, orient, 1, offX, offY);
  };

  // Zoom: scale from the center of the visible area
  const zoom = useCallback((newZoom: number) => {
    const s = stateRef.current;
    if (!s.loaded || !frameRef.current) return;
    const clamped = Math.max(1, Math.min(4, newZoom));
    const { fw, fh } = getFrameSize(orient);
    // Ratio between new and current zoom
    const ratio = clamped / s.userZoom;
    // Keep the center of the current visible area at the same position
    const newOffX = (s.offX + fw / 2) * ratio - fw / 2;
    const newOffY = (s.offY + fh / 2) * ratio - fh / 2;
    applyLayout(s.imgNW, s.imgNH, orient, clamped, newOffX, newOffY);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orient, applyLayout]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const s = stateRef.current;
    zoom(s.userZoom + (e.deltaY < 0 ? 0.1 : -0.1));
  };

  const getXY = (e: React.MouseEvent | MouseEvent | TouchEvent) => {
    if ('touches' in e) return { x: (e as TouchEvent).touches[0].clientX, y: (e as TouchEvent).touches[0].clientY };
    return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
  };

  const getPinchDist = (e: TouchEvent) => {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e && (e as React.TouchEvent).touches.length >= 2) return;
    const p = getXY(e as React.MouseEvent);
    dragRef.current = { x: p.x, y: p.y, ox: stateRef.current.offX, oy: stateRef.current.offY };
  };

  useEffect(() => {
    const overlay = overlayRef.current;
    const frame = frameRef.current;
    if (!overlay || !frame) return;

    // Prevent browser pinch-to-zoom on the entire overlay
    const blockBrowserZoom = (e: TouchEvent) => {
      if (e.touches.length >= 2) e.preventDefault();
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        dragRef.current = null;
        const s = stateRef.current;
        const { fw, fh } = getFrameSize(orient);
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        pinchRef.current = { dist: getPinchDist(e), zoom: s.userZoom, midX, midY };
      }
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (e.cancelable) e.preventDefault();

      if ('touches' in e && (e as TouchEvent).touches.length === 2 && pinchRef.current) {
        const te = e as TouchEvent;
        const newDist = getPinchDist(te);
        const ratio = newDist / pinchRef.current.dist;
        const s = stateRef.current;
        const newZoom = Math.max(1, Math.min(4, pinchRef.current.zoom * ratio));
        const { fw, fh } = getFrameSize(orient);
        const zoomRatio = newZoom / s.userZoom;
        // Zoom from pinch midpoint relative to frame
        if (frameRef.current) {
          const rect = frameRef.current.getBoundingClientRect();
          const pivotX = pinchRef.current.midX - rect.left;
          const pivotY = pinchRef.current.midY - rect.top;
          const newOffX = (s.offX + pivotX) * zoomRatio - pivotX;
          const newOffY = (s.offY + pivotY) * zoomRatio - pivotY;
          applyLayout(s.imgNW, s.imgNH, orient, newZoom, newOffX, newOffY);
        }
        return;
      }

      if (!dragRef.current || !imgRef.current || !frameRef.current) return;
      const p = getXY(e);
      const s = stateRef.current;
      const rW = imgRef.current.offsetWidth;
      const rH = imgRef.current.offsetHeight;
      const fw = frameRef.current.offsetWidth;
      const fh = frameRef.current.offsetHeight;
      const newOffX = Math.max(0, Math.min(dragRef.current.ox + (dragRef.current.x - p.x), rW - fw));
      const newOffY = Math.max(0, Math.min(dragRef.current.oy + (dragRef.current.y - p.y), rH - fh));
      imgRef.current.style.left = `-${newOffX}px`;
      imgRef.current.style.top = `-${newOffY}px`;
      stateRef.current = { ...s, offX: newOffX, offY: newOffY };
    };

    const onEnd = () => {
      dragRef.current = null;
      pinchRef.current = null;
    };

    overlay.addEventListener('touchstart', blockBrowserZoom, { passive: false });
    frame.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchend', onEnd);

    return () => {
      overlay.removeEventListener('touchstart', blockBrowserZoom);
      frame.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchend', onEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orient, applyLayout]);

  const handleOrientChange = (o: Orient) => {
    setOrient(o);
    const s = stateRef.current;
    if (s.loaded) {
      const { fw, fh } = getFrameSize(o);
      const baseScale = getBaseScale(s.imgNW, s.imgNH, o);
      const rW = Math.round(s.imgNW * baseScale * s.userZoom);
      const rH = Math.round(s.imgNH * baseScale * s.userZoom);
      // Re-center after orientation change
      const offX = Math.max(0, (rW - fw) / 2);
      const offY = Math.max(0, (rH - fh) / 2);
      applyLayout(s.imgNW, s.imgNH, o, s.userZoom, offX, offY);
    }
  };

  const handleApply = () => {
    if (!frameRef.current || !imgRef.current) return;
    const asp = ASPECTS[orient];
    const outW = 800;
    const outH = Math.round(outW / asp);
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = stateRef.current;
    const baseScale = getBaseScale(s.imgNW, s.imgNH, orient);
    const scale = baseScale * s.userZoom;
    const sx = s.offX / scale;
    const sy = s.offY / scale;
    const { fw, fh } = getFrameSize(orient);
    const sw = fw / scale;
    const sh = fh / scale;
    ctx.drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, outW, outH);
    onApply(canvas.toDataURL('image/jpeg', 0.88));
  };

  return (
    <div
      className="crop-ov"
      ref={overlayRef}
      style={{ touchAction: 'none' }}
    >
      <div className="crop-top">
        <h3>Выберите область обложки</h3>
        <p>Перетащите или масштабируйте</p>
      </div>

      {!hideToggle && (
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
      )}

      <div
        className="crop-frame"
        ref={frameRef}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
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

      {/* Zoom slider */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '12px', width: '100%', maxWidth: '320px', alignItems: 'center' }}>
        <button
          onPointerDown={e => { e.preventDefault(); zoom(stateRef.current.userZoom - 0.2); }}
          style={{
            width: '44px', height: '44px', background: 'transparent', flexShrink: 0,
            border: '1px solid var(--border)', color: 'var(--text2)',
            fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'monospace', touchAction: 'manipulation',
            opacity: displayZoom <= 1 ? 0.3 : 1,
          }}
        >−</button>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
          <input
            type="range"
            min={100} max={400} step={5}
            value={Math.round(displayZoom * 100)}
            onChange={e => zoom(Number(e.target.value) / 100)}
            style={{ width: '100%', accentColor: 'var(--gold)', cursor: 'pointer', touchAction: 'none' }}
          />
          <span style={{ fontFamily: "'Crimson Text', serif", fontSize: '.75rem', color: 'var(--text3)' }}>
            {Math.round(displayZoom * 100)}%
          </span>
        </div>

        <button
          onPointerDown={e => { e.preventDefault(); zoom(stateRef.current.userZoom + 0.2); }}
          style={{
            width: '44px', height: '44px', background: 'transparent', flexShrink: 0,
            border: '1px solid var(--border)', color: 'var(--text2)',
            fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'monospace', touchAction: 'manipulation',
            opacity: displayZoom >= 4 ? 0.3 : 1,
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
