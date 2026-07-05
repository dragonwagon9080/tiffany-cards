"use client";

import Image from "next/image";
import useImageZoom, { ImageZoomControls } from "./ImageZoom";

type ImageCanvasProps = {
  src: string;
  alt: string;
  onClick?: () => void;
  zoomEnabled?: boolean;
  zoomControls?: ImageZoomControls;
};

export default function ImageCanvas({
  src,
  alt,
  onClick,
  zoomEnabled = false,
  zoomControls,
}: ImageCanvasProps) {
  const internalZoom = useImageZoom();
  const zoom = zoomControls || internalZoom;

  const {
    scale,
    dragging,
    transform,
    containerRef,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleDoubleClick,
  } = zoom;

  function stopWheelScroll(e: React.WheelEvent<HTMLDivElement>) {
    if (!zoomEnabled) return;

    e.preventDefault();
    e.stopPropagation();
    handleWheel(e);
  }

  return (
    <div
      ref={containerRef}
      onWheel={stopWheelScroll}
      onMouseMove={zoomEnabled ? handleMouseMove : undefined}
      onMouseUp={zoomEnabled ? handleMouseUp : undefined}
      onMouseLeave={zoomEnabled ? handleMouseUp : undefined}
      onTouchStart={zoomEnabled ? handleTouchStart : undefined}
      onTouchMove={zoomEnabled ? handleTouchMove : undefined}
      onTouchEnd={zoomEnabled ? handleTouchEnd : undefined}
      onTouchCancel={zoomEnabled ? handleTouchEnd : undefined}
      className="flex h-full w-full touch-none items-center justify-center overflow-hidden overscroll-contain bg-[#0a0a0a] p-3"
    >
      <div
        onMouseDown={zoomEnabled ? handleMouseDown : undefined}
        onDoubleClick={zoomEnabled ? handleDoubleClick : undefined}
        className={`flex h-full w-full items-center justify-center ${
          zoomEnabled && scale > 1
            ? dragging
              ? "cursor-grabbing"
              : "cursor-grab"
            : onClick
            ? "cursor-zoom-in"
            : "cursor-default"
        }`}
      >
        <Image
          src={src}
          alt={alt}
          width={1800}
          height={1800}
          priority
          unoptimized
          draggable={false}
          onClick={!zoomEnabled || scale === 1 ? onClick : undefined}
          className="max-h-full max-w-full select-none object-contain"
          style={{
            transform: zoomEnabled ? transform : "none",
            transition:
              zoomEnabled && !dragging ? "transform 120ms ease-out" : "none",
            transformOrigin: "center center",
            willChange: zoomEnabled ? "transform" : "auto",
          }}
        />
      </div>
    </div>
  );
}