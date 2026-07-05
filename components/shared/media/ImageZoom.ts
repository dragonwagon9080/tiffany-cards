"use client";

import { useRef, useState } from "react";

type Point = {
  x: number;
  y: number;
};

export type ImageZoomControls = ReturnType<typeof useImageZoom>;

function getDistance(touches: React.TouchList) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;

  return Math.sqrt(dx * dx + dy * dy);
}

function getMidpoint(touches: React.TouchList) {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  };
}

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

  const pinchStart = useRef({
    distance: 0,
    scale: 1,
    midpointX: 0,
    midpointY: 0,
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

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      e.preventDefault();

      const midpoint = getMidpoint(e.touches);

      pinchStart.current = {
        distance: getDistance(e.touches),
        scale,
        midpointX: midpoint.x,
        midpointY: midpoint.y,
        startX: position.x,
        startY: position.y,
      };

      setDragging(false);
    }

    if (e.touches.length === 1 && scale > 1) {
      const touch = e.touches[0];

      dragStart.current = {
        mouseX: touch.clientX,
        mouseY: touch.clientY,
        startX: position.x,
        startY: position.y,
      };

      setDragging(true);
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      e.preventDefault();

      const nextDistance = getDistance(e.touches);
      const startDistance = pinchStart.current.distance || nextDistance;
      const nextScale = clampScale(
        pinchStart.current.scale * (nextDistance / startDistance)
      );

      const midpoint = getMidpoint(e.touches);
      const dx = midpoint.x - pinchStart.current.midpointX;
      const dy = midpoint.y - pinchStart.current.midpointY;

      const nextPosition = {
        x: pinchStart.current.startX + dx,
        y: pinchStart.current.startY + dy,
      };

      setScale(nextScale);
      setPosition(clampPosition(nextPosition, nextScale));
    }

    if (e.touches.length === 1 && dragging && scale > 1) {
      e.preventDefault();

      const touch = e.touches[0];
      const dx = touch.clientX - dragStart.current.mouseX;
      const dy = touch.clientY - dragStart.current.mouseY;

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
  }

  function handleTouchEnd() {
    setDragging(false);

    setScale((currentScale) => {
      if (currentScale <= 1.02) {
        setPosition({ x: 0, y: 0 });
        return 1;
      }

      return currentScale;
    });
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
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleDoubleClick,
  };
}