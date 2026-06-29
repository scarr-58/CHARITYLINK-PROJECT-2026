import React, { useState, useRef, useEffect, MouseEvent, TouchEvent } from 'react';
import { X, ZoomIn, ZoomOut, Check, Sliders } from 'lucide-react';

interface ImageCropperProps {
  imageUrl: string;
  onSave: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

export default function ImageCropper({ imageUrl, onSave, onCancel }: ImageCropperProps) {
  const [zoom, setZoom] = useState<number>(1.2);
  const [translateX, setTranslateX] = useState<number>(0);
  const [translateY, setTranslateY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imgDim, setImgDim] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // When image loads, compute natural dimensions
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      // Calculate original cover scale
      const scale = Math.max(280 / img.width, 280 / img.height);
      setImgDim({
        width: img.width * scale,
        height: img.height * scale
      });
      // Reset translation to center
      setTranslateX(0);
      setTranslateY(0);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Pointer move calculation
  const handlePointerDown = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({
      x: clientX - translateX,
      y: clientY - translateY
    });
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const newX = clientX - dragStart.x;
    const newY = clientY - dragStart.y;

    // Bounds checking
    // The image width/height displayed are (imgDim.width * zoom) and (imgDim.height * zoom).
    // The viewport size is 280x280.
    // Allow panning but ensure they can always see the image inside the frame!
    const imgW = imgDim.width * zoom;
    const imgH = imgDim.height * zoom;
    
    // We can restrict translation so that the image always covers the circle if wanted, 
    // or just lock them within reasonable bounds. Let's make it smooth and lock within bounds.
    const maxBoundX = Math.max(0, (imgW - 280) / 2) + 140;
    const minBoundX = -maxBoundX;
    const maxBoundY = Math.max(0, (imgH - 280) / 2) + 140;
    const minBoundY = -maxBoundY;

    setTranslateX(Math.max(minBoundX, Math.min(newX, maxBoundX)));
    setTranslateY(Math.max(minBoundY, Math.min(newY, maxBoundY)));
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Event handlers
  const onMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    handlePointerDown(e.clientX, e.clientY);
  };

  const onMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    handlePointerMove(e.clientX, e.clientY);
  };

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const onTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleApply = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, 300, 300);

      // Math matches center of 280px viewport mapped to 300px canvas
      const scaleToFit = Math.max(280 / img.naturalWidth, 280 / img.naturalHeight);
      const displayW = img.naturalWidth * scaleToFit;
      const displayH = img.naturalHeight * scaleToFit;

      const canvasScale = 300 / 280;

      // Center the image inside viewport and apply zoom & translation offsets
      const x0 = 140 - (displayW * zoom) / 2 + translateX;
      const y0 = 140 - (displayH * zoom) / 2 + translateY;

      // Draw onto target canvas coordinates
      const destX = x0 * canvasScale;
      const destY = y0 * canvasScale;
      const destW = displayW * zoom * canvasScale;
      const destH = displayH * zoom * canvasScale;

      ctx.drawImage(img, destX, destY, destW, destH);

      const croppedUrl = canvas.toDataURL('image/jpeg', 0.9);
      onSave(croppedUrl);
    };
    img.src = imageUrl;
  };

  return (
    <div className="fixed inset-0 bg-[#062312]/85 flex items-center justify-center p-4 z-[1000] anim-fade-in animate-duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-emerald-100 flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-emerald-100 flex justify-between items-center bg-emerald-50/30">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-800" />
            <h3 className="font-serif text-emerald-900 font-bold text-lg">Adjust Profile Picture</h3>
          </div>
          <button onClick={onCancel} className="text-gray-500 hover:text-emerald-900 transition-colors cursor-pointer p-1 rounded-full hover:bg-emerald-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace */}
        <div className="p-6 bg-emerald-50/50 flex flex-col items-center">
          {/* Circular Frame Viewport Offset Container */}
          <div 
            ref={viewportRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={handlePointerUp}
            className="w-[280px] h-[280px] rounded-full overflow-hidden relative bg-[#bad1c2] border-4 border-emerald-500 cursor-move touch-action-none shadow-lg outline outline-offset-4 outline-emerald-700/10"
          >
            {/* Dark Mask Overlay to indicate circle region */}
            <div className="absolute inset-0 rounded-full pointer-events-none border-[12px] border-black/10 box-border z-10" />
            
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Adjustable target"
              className="absolute pointer-events-none select-none max-w-none origin-center"
              style={{
                width: imgDim.width ? `${imgDim.width}px` : 'auto',
                height: imgDim.height ? `${imgDim.height}px` : 'auto',
                transform: `translate(calc(-50% + 140px + ${translateX}px), calc(-50% + 140px + ${translateY}px)) scale(${zoom})`,
                left: '0px',
                top: '0px',
                transition: isDragging ? 'none' : 'transform 0.1s ease-out'
              }}
            />
          </div>

          <p className="text-gray-600 text-xs mt-5 mb-4 text-center select-none font-medium">
            Drag the image to center it. Use slider below to fit inside circle frame.
          </p>

          {/* Zoom Slider */}
          <div className="w-full flex items-center gap-4 text-emerald-800 font-medium bg-white rounded-xl py-3 px-4 border border-emerald-100/80 shadow-sm">
            <button 
              onClick={() => setZoom(z => Math.max(1.0, z - 0.1))}
              className="p-1 hover:bg-emerald-50 rounded transition-colors text-emerald-600 active:scale-90"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="1.0"
              max="4.0"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-emerald-500 h-1.5 rounded-lg bg-emerald-100 cursor-pointer"
            />
            <button 
              onClick={() => setZoom(z => Math.min(4.0, z + 0.1))}
              className="p-1 hover:bg-emerald-50 rounded transition-colors text-emerald-600 active:scale-90"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono w-10 text-right bg-emerald-50 py-0.5 px-1.5 rounded border border-emerald-100/40">{Math.round(zoom * 100)}%</span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-emerald-100 flex justify-end gap-3 bg-emerald-50/10">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-emerald-200 text-emerald-800 bg-white hover:bg-emerald-50 active:scale-95 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
}
