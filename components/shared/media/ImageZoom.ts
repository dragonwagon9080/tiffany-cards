"use client";

import { useRef, useState } from "react";

type Point = {
  x: number;
  y: number;
};

export type ImageZoomControls = ReturnType<typeof useImageZoom>;

export default function useImageZoom() {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const dragStart = useRef({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  function clampScale(value: number) {
    return Math.min(Math.max(value, 1), 6);
  }

  function clampPosition(nextPosition: Point, nextScale: number) {
    if (nextScale <= 1) return { x: 0, y: 0 };

    const container = containerRef.current;
    if (!container) return nextPosition;

    const rect = container.getBoundingClientRect();

    const maxX = (rect.width * (nextScale - 1)) / 2;
    const maxY = (rect.height * (nextScale - 1)) / 2;

    return {
      x: Math.min(Math.max(nextPosition.x, -maxX), maxX),
      y: Math.min(Math.max(nextPosition.y, -maxY), maxY),
    };
  }

  function setZoom(nextScaleValue: number) {
    const nextScale = clampScale(nextScaleValue);
    setScale(nextScale);
    setPosition((current) => clampPosition(current, nextScale));
  }

  function zoomIn() {
    setZoom(scale + 0.25);
  }

  function zoomOut() {
    setZoom(scale - 0.25);
  }

  function resetZoom() {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setDragging(false);
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();

    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;

    const zoomDirection = e.deltaY < 0 ? 1 : -1;
    const nextScale = clampScale(scale + zoomDirection * 0.25);

    if (nextScale === 1) {
      resetZoom();
      return;
    }

    const scaleRatio = nextScale / scale;

    const nextPosition = {
      x: mouseX - (mouseX - position.x) * scaleRatio,
      y: mouseY - (mouseY - position.y) * scaleRatio,
    };

    setScale(nextScale);
    setPosition(clampPosition(nextPosition, nextScale));
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (scale <= 1) return;

    e.preventDefault();
    setDragging(true);

    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: position.x,
      startY: position.y,
    };
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging || scale <= 1) return;

    const dx = e.clientX - dragStart.current.mouseX;
    const dy = e.clientY - dragStart.current.mouseY;

    setPosition(
      clampPosition(
        {
          x: dragStart.current.startX + dx,
          y: dragStart.current.startY + dy,
        },
        scale
      )
    );
  }

  function handleMouseUp() {
    setDragging(false);
  }

  function handleDoubleClick() {
    resetZoom();
  }

  const transform = `translate(${position.x}px, ${position.y}px) scale(${scale})`;

  return {
    scale,
    position,
    dragging,
    transform,
    containerRef,
    zoomIn,
    zoomOut,
    resetZoom,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick,
  };
}