import { useState, useRef, useEffect } from "react";

type Orient = 'portrait' | 'landscape' | 'square';

const ASPECTS: Record<Orient, number> = {
  portrait: 2/3,
  landscape: 3/2,
  square: 1
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
  
  const [cropState, setCropState] = useState({
    offX: 0,
    offY: 0,
    imgNW: 0,
    imgNH: 0,
    scale: 1,
    loaded: false
  });

  const dragRef = useRef<{x: number, y: number, ox: number, oy: number} | null>(null);

  const layoutCrop = (nw: number, nh: number, currentOrient: Orient) => {
    if (!frameRef.current || !imgRef.current) return;
    const maxW = Math.min(340, window.innerWidth - 40);
    const asp = ASPECTS[currentOrient];
    const fw = maxW;
    const fh = Math.round(fw / asp);
    
    frameRef.current.style.width = `${fw}px`;
    frameRef.current.style.height = `${fh}px`;

    const scW = fw / nw;
    const scH = fh / nh;
    const scale = Math.max(scW, scH);

    const rW = Math.round(nw * scale);
    const rH = Math.round(nh * scale);

    const newOffX = 0; // reset to 0 on layout
    const newOffY = 0;

    imgRef.current.style.width = `${rW}px`;
    imgRef.current.style.height = `${rH}px`;
    imgRef.current.style.left = `-${newOffX}px`;
    imgRef.current.style.top = `-${newOffY}px`;

    setCropState({
      offX: newOffX,
      offY: newOffY,
      imgNW: nw,
      imgNH: nh,
      scale,
      loaded: true
    });
  };

  useEffect(() => {
    if (cropState.loaded) {
      layoutCrop(cropState.imgNW, cropState.imgNH, orient);
    }
  }, [orient]);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    layoutCrop(target.naturalWidth, target.naturalHeight, orient);
  };

  const getXY = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if ('touches' in e) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    const p = getXY(e);
    dragRef.current = { x: p.x, y: p.y, ox: cropState.offX, oy: cropState.offY };
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!dragRef.current || !imgRef.current || !frameRef.current) return;
      if (e.cancelable) e.preventDefault();
      const p = getXY(e);
      
      const rW = parseInt(imgRef.current.style.width) || 0;
      const rH = parseInt(imgRef.current.style.height) || 0;
      const fW = frameRef.current.offsetWidth;
      const fH = frameRef.current.offsetHeight;

      const newOffX = Math.max(0, Math.min(dragRef.current.ox + (dragRef.current.x - p.x), rW - fW));
      const newOffY = Math.max(0, Math.min(dragRef.current.oy + (dragRef.current.y - p.y), rH - fH));

      imgRef.current.style.left = `-${newOffX}px`;
      imgRef.current.style.top = `-${newOffY}px`;
      
      setCropState(prev => ({ ...prev, offX: newOffX, offY: newOffY }));
    };

    const handleEnd = () => {
      dragRef.current = null;
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchend', handleEnd);
    };
  }, []);

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

    const sx = cropState.offX / cropState.scale;
    const sy = cropState.offY / cropState.scale;
    const sw = frameRef.current.offsetWidth / cropState.scale;
    const sh = frameRef.current.offsetHeight / cropState.scale;

    ctx.drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, outW, outH);
    const b64 = canvas.toDataURL('image/jpeg', 0.88);
    onApply(b64);
  };

  return (
    <div className="crop-ov">
      <div className="crop-top">
        <h3>Выберите область обложки</h3>
        <p>Перетащите пальцем чтобы выбрать нужную часть</p>
      </div>
      <div className="crop-orient">
        <button 
          className={`co-btn ${orient === 'portrait' ? 'active' : ''}`}
          onClick={() => setOrient('portrait')}
        >📱 Портрет</button>
        <button 
          className={`co-btn ${orient === 'landscape' ? 'active' : ''}`}
          onClick={() => setOrient('landscape')}
        >🖼 Альбом</button>
        <button 
          className={`co-btn ${orient === 'square' ? 'active' : ''}`}
          onClick={() => setOrient('square')}
        >■ Квадрат</button>
      </div>
      <div 
        className="crop-frame" 
        ref={frameRef}
        onMouseDown={handleStart}
        onTouchStart={handleStart}
      >
        <img 
          id="cropImg" 
          ref={imgRef} 
          src={imageSrc} 
          onLoad={onImageLoad} 
          draggable={false} 
          alt="" 
        />
      </div>
      <div className="crop-btns">
        <button className="crop-cancel" onClick={onCancel}>Отмена</button>
        <button className="crop-apply" onClick={handleApply}>Применить</button>
      </div>
    </div>
  );
}
