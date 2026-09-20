"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

type SharedMarkupTool = "pan" | "draw" | "circle";
type SharedMarkupColor = "yellow" | "red" | "blue";

export type MatchComparisonImagesProps = {
  sellerId?: string;
  purchaseId?: string;
  listingId?: string;
  purchaseTitle?: string;
  listingTitle?: string;
  purchaseImages: string[];
  listingImages: string[];
};

export default function MatchComparisonImages({
  sellerId,
  purchaseId,
  listingId,
  purchaseTitle,
  listingTitle,
  purchaseImages,
  listingImages,
}: MatchComparisonImagesProps) {
  const [purchaseImageIndex, setPurchaseImageIndex] = useState(0);
  const [listingImageIndex, setListingImageIndex] = useState(0);

  // Tool and color are shared by both viewers so switching sides
  // keeps the same review mode selected.
  const [sharedTool, setSharedTool] =
    useState<SharedMarkupTool>("pan");
  const [sharedMarkupColor, setSharedMarkupColor] =
    useState<SharedMarkupColor>("yellow");

  useEffect(() => { setPurchaseImageIndex(0); }, [purchaseId]);
  useEffect(() => { setListingImageIndex(0); }, [listingId]);

  const safePurchaseIndex = Math.min(purchaseImageIndex, Math.max(0, purchaseImages.length - 1));
  const safeListingIndex = Math.min(listingImageIndex, Math.max(0, listingImages.length - 1));

  const activePurchaseImage = purchaseImages[safePurchaseIndex];
  const activeListingImage = listingImages[safeListingIndex];

  function previousPurchaseImage() {
    if (!purchaseImages.length) return;
    setPurchaseImageIndex((current) => (current - 1 + purchaseImages.length) % purchaseImages.length);
  }

  function nextPurchaseImage() {
    if (!purchaseImages.length) return;
    setPurchaseImageIndex((current) => (current + 1) % purchaseImages.length);
  }

  function previousListingImage() {
    if (!listingImages.length) return;
    setListingImageIndex((current) => (current - 1 + listingImages.length) % listingImages.length);
  }

  function nextListingImage() {
    if (!listingImages.length) return;
    setListingImageIndex((current) => (current + 1) % listingImages.length);
  }

  return (
    <div className="grid lg:grid-cols-2">
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-400">Confirmed Purchase</p>
        <h2 className="mt-2 min-h-12 text-lg font-bold leading-6">{purchaseTitle || "Untitled Purchase"}</h2>
        <div className="mt-4">
          <ZoomPanImageViewer
            src={activePurchaseImage}
            alt={purchaseTitle || "Confirmed purchase"}
            entityType="purchase"
            sellerId={sellerId}
            recordId={purchaseId}
            hasPrevious={purchaseImages.length > 1}
            hasNext={purchaseImages.length > 1}
            onPrevious={previousPurchaseImage}
            onNext={nextPurchaseImage}
            tool={sharedTool}
            onToolChange={setSharedTool}
            markupColor={sharedMarkupColor}
            onMarkupColorChange={setSharedMarkupColor}
          />
          {purchaseImages.length > 1 && (
            <ImageThumbnails images={purchaseImages} activeIndex={safePurchaseIndex} onSelect={setPurchaseImageIndex} label="Purchase image" />
          )}
        </div>
      </div>

      <div className="border-t border-zinc-800 p-5 lg:border-l lg:border-t-0">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-400">Seller Listing</p>
        <h2 className="mt-2 min-h-12 text-lg font-bold leading-6">{listingTitle || "Untitled Listing"}</h2>
        <div className="mt-4">
          <ZoomPanImageViewer
            src={activeListingImage}
            alt={listingTitle || "Seller listing"}
            entityType="listing"
            sellerId={sellerId}
            recordId={listingId}
            hasPrevious={listingImages.length > 1}
            hasNext={listingImages.length > 1}
            onPrevious={previousListingImage}
            onNext={nextListingImage}
            tool={sharedTool}
            onToolChange={setSharedTool}
            markupColor={sharedMarkupColor}
            onMarkupColorChange={setSharedMarkupColor}
          />
          {listingImages.length > 1 && (
            <ImageThumbnails images={listingImages} activeIndex={safeListingIndex} onSelect={setListingImageIndex} label="Listing image" />
          )}
        </div>
      </div>
    </div>
  );
}

function ZoomPanImageViewer({
  src,
  alt,
  entityType,
  sellerId,
  recordId,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  tool,
  onToolChange,
  markupColor,
  onMarkupColorChange,
}: {
  src?: string;
  alt: string;
  entityType: "listing" | "purchase";
  sellerId?: string;
  recordId?: string;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  tool: SharedMarkupTool;
  onToolChange: (tool: SharedMarkupTool) => void;
  markupColor: SharedMarkupColor;
  onMarkupColorChange: (color: SharedMarkupColor) => void;
}) {
  type Point = { x: number; y: number };
  type MarkupColor = SharedMarkupColor;
  type Markup =
    | {
        type: "draw";
        points: Point[];
        color: MarkupColor;
      }
    | {
        type: "circle";
        start: Point;
        end: Point;
        color: MarkupColor;
      };

  const MARKUP_COLORS: Record<
    MarkupColor,
    string
  > = {
    yellow: "#facc15",
    red: "#ef4444",
    blue: "#3b82f6",
  };

  const viewerRef =
    useRef<HTMLDivElement | null>(null);

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({
    x: 0,
    y: 0,
  });
  const [dragging, setDragging] =
    useState(false);
  const [dragStart, setDragStart] =
    useState({
      x: 0,
      y: 0,
      panX: 0,
      panY: 0,
    });

  const [markups, setMarkups] =
    useState<Markup[]>([]);

  const [activeMarkup, setActiveMarkup] =
    useState<Markup | null>(null);

  const [saving, setSaving] =
    useState(false);

  const [saveMessage, setSaveMessage] =
    useState("");

  const [saveError, setSaveError] =
    useState("");

  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
    setDragging(false);
    setMarkups([]);
    setActiveMarkup(null);
    setSaveMessage("");
    setSaveError("");
  }, [src]);

  function changeZoom(nextZoom: number) {
    const clamped = Math.min(
      5,
      Math.max(
        1,
        Math.round(nextZoom * 4) / 4
      )
    );

    setZoom(clamped);

    if (clamped === 1) {
      setPan({ x: 0, y: 0 });
      setDragging(false);
    }
  }

  function resetView() {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
    setDragging(false);
  }

  function rotateImage() {
    setRotation((current) =>
      (current + 90) % 360
    );
    setPan({ x: 0, y: 0 });
    setDragging(false);
  }

  useEffect(() => {
    const viewer =
      viewerRef.current;

    if (!viewer || !src) {
      return;
    }

    const handleNativeWheel = (
      event: WheelEvent
    ) => {
      event.preventDefault();
      event.stopPropagation();

      const direction =
        event.deltaY < 0
          ? 0.25
          : -0.25;

      setZoom((currentZoom) => {
        const nextZoom =
          currentZoom + direction;

        const clamped = Math.min(
          5,
          Math.max(
            1,
            Math.round(
              nextZoom * 4
            ) / 4
          )
        );

        if (clamped === 1) {
          setPan({
            x: 0,
            y: 0,
          });
          setDragging(false);
        }

        return clamped;
      });
    };

    viewer.addEventListener(
      "wheel",
      handleNativeWheel,
      {
        passive: false,
      }
    );

    return () => {
      viewer.removeEventListener(
        "wheel",
        handleNativeWheel
      );
    };
  }, [src]);


  function getMarkupPoint(
    event: ReactPointerEvent<HTMLDivElement>
  ): Point {
    const target =
      event.currentTarget.querySelector(
        "[data-markup-surface]"
      ) as HTMLElement | null;

    if (!target) {
      return { x: 0, y: 0 };
    }

    const rect =
      target.getBoundingClientRect();

    return {
      x:
        ((event.clientX - rect.left) /
          rect.width) *
        1000,
      y:
        ((event.clientY - rect.top) /
          rect.height) *
        1000,
    };
  }

  function handlePointerDown(
    event: ReactPointerEvent<HTMLDivElement>
  ) {
    if (!src) {
      return;
    }

    if (
      (event.target as HTMLElement).closest(
        "button"
      )
    ) {
      return;
    }

    event.currentTarget.setPointerCapture(
      event.pointerId
    );

    const wantsPan =
      event.button === 2 ||
      tool === "pan";

    if (wantsPan) {
      if (zoom <= 1) {
        return;
      }

      setDragging(true);

      setDragStart({
        x: event.clientX,
        y: event.clientY,
        panX: pan.x,
        panY: pan.y,
      });

      return;
    }

    if (
      event.button === 0 &&
      tool === "draw"
    ) {
      const point =
        getMarkupPoint(event);

      setActiveMarkup({
        type: "draw",
        points: [point],
        color: markupColor,
      });
      return;
    }

    if (
      event.button === 0 &&
      tool === "circle"
    ) {
      const point =
        getMarkupPoint(event);

      setActiveMarkup({
        type: "circle",
        start: point,
        end: point,
        color: markupColor,
      });
    }
  }

  function handlePointerMove(
    event: ReactPointerEvent<HTMLDivElement>
  ) {
    if (
      tool === "draw" &&
      activeMarkup?.type === "draw"
    ) {
      const point =
        getMarkupPoint(event);

      setActiveMarkup({
        ...activeMarkup,
        points: [
          ...activeMarkup.points,
          point,
        ],
      });
      return;
    }

    if (
      tool === "circle" &&
      activeMarkup?.type === "circle"
    ) {
      setActiveMarkup({
        ...activeMarkup,
        end: getMarkupPoint(event),
      });
      return;
    }

    if (!dragging) {
      return;
    }

    setPan({
      x:
        dragStart.panX +
        event.clientX -
        dragStart.x,
      y:
        dragStart.panY +
        event.clientY -
        dragStart.y,
    });
  }

  function handlePointerUp(
    event: ReactPointerEvent<HTMLDivElement>
  ) {
    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      );
    }

    if (activeMarkup) {
      setMarkups((current) => [
        ...current,
        activeMarkup,
      ]);
      setActiveMarkup(null);
    }

    setDragging(false);
  }

  function undoMarkup() {
    setActiveMarkup(null);
    setMarkups((current) =>
      current.length > 0
        ? current.slice(0, -1)
        : current
    );
    setSaveMessage("");
    setSaveError("");
  }

  function clearMarkup() {
    setMarkups([]);
    setActiveMarkup(null);
    setSaveMessage("");
    setSaveError("");
  }

  function renderMarkup(
    markup: Markup,
    key: string
  ) {
    const stroke =
      MARKUP_COLORS[markup.color];

    if (markup.type === "draw") {
      const points =
        markup.points
          .map(
            (point) =>
              `${point.x},${point.y}`
          )
          .join(" ");

      return (
        <polyline
          key={key}
          points={points}
          fill="none"
          stroke={stroke}
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      );
    }

    const x =
      Math.min(
        markup.start.x,
        markup.end.x
      );

    const y =
      Math.min(
        markup.start.y,
        markup.end.y
      );

    const width =
      Math.abs(
        markup.end.x -
          markup.start.x
      );

    const height =
      Math.abs(
        markup.end.y -
          markup.start.y
      );

    return (
      <ellipse
        key={key}
        cx={x + width / 2}
        cy={y + height / 2}
        rx={width / 2}
        ry={height / 2}
        fill="none"
        stroke={stroke}
        strokeWidth="8"
        vectorEffect="non-scaling-stroke"
      />
    );
  }

  async function loadImageForSave(
    imageUrl: string
  ) {
    return new Promise<HTMLImageElement>(
      (resolve, reject) => {
        const image = new Image();

        image.crossOrigin =
          "anonymous";

        image.onload = () =>
          resolve(image);

        image.onerror = () =>
          reject(
            new Error(
              "The archived image could not be loaded for saving."
            )
          );

        image.src = imageUrl;
      }
    );
  }

  async function buildMarkupPng() {
    if (!src) {
      throw new Error(
        "There is no image to save."
      );
    }

    const image =
      await loadImageForSave(src);

    const width =
      image.naturalWidth ||
      image.width;

    const height =
      image.naturalHeight ||
      image.height;

    if (!width || !height) {
      throw new Error(
        "The image dimensions could not be determined."
      );
    }

    const canvas =
      document.createElement(
        "canvas"
      );

    const normalizedRotation =
      ((rotation % 360) + 360) % 360;

    const swapsDimensions =
      normalizedRotation === 90 ||
      normalizedRotation === 270;

    const outputWidth =
      swapsDimensions ? height : width;

    const outputHeight =
      swapsDimensions ? width : height;

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const context =
      canvas.getContext("2d");

    if (!context) {
      throw new Error(
        "Your browser could not create the markup image."
      );
    }

    context.save();

    if (normalizedRotation === 90) {
      context.translate(outputWidth, 0);
      context.rotate(Math.PI / 2);
    } else if (normalizedRotation === 180) {
      context.translate(outputWidth, outputHeight);
      context.rotate(Math.PI);
    } else if (normalizedRotation === 270) {
      context.translate(0, outputHeight);
      context.rotate((Math.PI * 3) / 2);
    }

    context.drawImage(
      image,
      0,
      0,
      width,
      height
    );

    context.restore();

    const scaleX =
      width / 1000;

    const scaleY =
      height / 1000;

    const lineWidth =
      Math.max(
        4,
        Math.min(
          width,
          height
        ) / 125
      );

    for (const markup of markups) {
      context.save();

      if (normalizedRotation === 90) {
        context.translate(outputWidth, 0);
        context.rotate(Math.PI / 2);
      } else if (normalizedRotation === 180) {
        context.translate(outputWidth, outputHeight);
        context.rotate(Math.PI);
      } else if (normalizedRotation === 270) {
        context.translate(0, outputHeight);
        context.rotate((Math.PI * 3) / 2);
      }

      context.strokeStyle =
        MARKUP_COLORS[
          markup.color
        ];

      context.lineWidth =
        lineWidth;

      context.lineCap =
        "round";

      context.lineJoin =
        "round";

      if (
        markup.type === "draw"
      ) {
        if (
          markup.points.length >
          0
        ) {
          context.beginPath();

          context.moveTo(
            markup.points[0].x *
              scaleX,
            markup.points[0].y *
              scaleY
          );

          for (
            let i = 1;
            i <
            markup.points.length;
            i++
          ) {
            context.lineTo(
              markup.points[i].x *
                scaleX,
              markup.points[i].y *
                scaleY
            );
          }

          context.stroke();
        }
      } else {
        const startX =
          markup.start.x *
          scaleX;

        const startY =
          markup.start.y *
          scaleY;

        const endX =
          markup.end.x *
          scaleX;

        const endY =
          markup.end.y *
          scaleY;

        const centerX =
          (startX + endX) / 2;

        const centerY =
          (startY + endY) / 2;

        const radiusX =
          Math.abs(
            endX - startX
          ) / 2;

        const radiusY =
          Math.abs(
            endY - startY
          ) / 2;

        if (
          radiusX > 0 &&
          radiusY > 0
        ) {
          context.beginPath();

          context.ellipse(
            centerX,
            centerY,
            radiusX,
            radiusY,
            0,
            0,
            Math.PI * 2
          );

          context.stroke();
        }
      }

      context.restore();
    }

    try {
      return canvas.toDataURL(
        "image/png"
      );
    } catch {
      throw new Error(
        "The browser blocked saving this archived image because of image security settings."
      );
    }
  }

  async function saveMarkup() {
    if (
      !src ||
      !sellerId ||
      !recordId ||
      markups.length === 0 ||
      saving
    ) {
      return;
    }

    setSaving(true);
    setSaveMessage("");
    setSaveError("");

    try {
      const imageData =
        await buildMarkupPng();

      const response =
        await fetch(
          "/api/seller-tracker",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              action: "saveMarkup",
              entityType,
              sellerId,
              recordId,
              imageData,
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data?.ok
      ) {
        throw new Error(
          data?.error ||
            "Unable to save markup."
        );
      }

      setSaveMessage(
        "Markup saved as a new image."
      );

      onToolChange("pan");
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Unable to save markup."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-2">
        <button
          type="button"
          onClick={() =>
            changeZoom(
              zoom - 0.25
            )
          }
          disabled={
            !src ||
            zoom <= 1 ||
            saving
          }
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-lg font-bold text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Zoom out"
        >
          −
        </button>

        <div className="min-w-[64px] text-center text-xs font-bold text-zinc-300">
          {Math.round(
            zoom * 100
          )}
          %
        </div>

        <button
          type="button"
          onClick={() =>
            changeZoom(
              zoom + 0.25
            )
          }
          disabled={
            !src ||
            zoom >= 5 ||
            saving
          }
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-lg font-bold text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Zoom in"
        >
          +
        </button>

        <button
          type="button"
          onClick={resetView}
          disabled={
            !src ||
            saving
          }
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reset
        </button>

        <button
          type="button"
          onClick={rotateImage}
          disabled={
            !src ||
            saving
          }
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Rotate image 90 degrees clockwise"
          title="Rotate 90° clockwise"
        >
          Rotate
        </button>

        <div className="mx-1 h-6 w-px bg-zinc-700" />

        <button
          type="button"
          onClick={() =>
            onToolChange(
              tool === "draw"
                ? "pan"
                : "draw"
            )
          }
          disabled={
            !src ||
            saving
          }
          className={`rounded-lg border px-3 py-2 text-xs font-bold ${
            tool === "draw"
              ? "border-blue-500 bg-blue-950 text-blue-200"
              : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
          } disabled:cursor-not-allowed disabled:opacity-40`}
        >
          Draw
        </button>

        <button
          type="button"
          onClick={() =>
            onToolChange(
              tool === "circle"
                ? "pan"
                : "circle"
            )
          }
          disabled={
            !src ||
            saving
          }
          className={`rounded-lg border px-3 py-2 text-xs font-bold ${
            tool === "circle"
              ? "border-blue-500 bg-blue-950 text-blue-200"
              : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
          } disabled:cursor-not-allowed disabled:opacity-40`}
        >
          Circle
        </button>

        <div className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 p-1">
          {(
            [
              [
                "yellow",
                "#facc15",
                "Yellow — matching feature",
              ],
              [
                "red",
                "#ef4444",
                "Red — changed feature",
              ],
              [
                "blue",
                "#3b82f6",
                "Blue — general note",
              ],
            ] as const
          ).map(
            ([
              color,
              hex,
              label,
            ]) => (
              <button
                key={color}
                type="button"
                onClick={() =>
                  onMarkupColorChange(
                    color
                  )
                }
                disabled={
                  !src ||
                  saving
                }
                title={label}
                aria-label={label}
                className={`flex h-7 w-7 items-center justify-center rounded-md border ${
                  markupColor ===
                  color
                    ? "border-white ring-2 ring-white/40"
                    : "border-zinc-600"
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <span
                  className="h-4 w-4 rounded-full border border-black/30"
                  style={{
                    backgroundColor:
                      hex,
                  }}
                />
              </button>
            )
          )}
        </div>

        <button
          type="button"
          onClick={undoMarkup}
          disabled={
            !src ||
            saving ||
            markups.length === 0
          }
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Undo
        </button>

        <button
          type="button"
          onClick={clearMarkup}
          disabled={
            !src ||
            saving ||
            (markups.length === 0 &&
              !activeMarkup)
          }
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Clear
        </button>

        <button
          type="button"
          onClick={saveMarkup}
          disabled={
            !src ||
            !sellerId ||
            !recordId ||
            saving ||
            markups.length === 0
          }
          className="rounded-lg border border-emerald-700 bg-emerald-950 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving
            ? "Saving..."
            : "Save Markup"}
        </button>

        <p className="ml-auto hidden text-xs text-zinc-600 sm:block">
          {tool === "pan"
            ? "Wheel to zoom · Left-drag to pan when zoomed"
            : tool === "draw"
              ? "Left-drag to draw · Wheel to zoom · Right-drag to pan"
              : "Left-drag to circle · Wheel to zoom · Right-drag to pan"}
        </p>
      </div>

      {(saveMessage ||
        saveError) && (
        <div
          className={`mb-3 rounded-lg border px-3 py-2 text-xs font-semibold ${
            saveError
              ? "border-red-900 bg-red-950/60 text-red-300"
              : "border-emerald-900 bg-emerald-950/60 text-emerald-300"
          }`}
        >
          {saveError ||
            saveMessage}
        </div>
      )}

      <div
        ref={viewerRef}
        className={`relative flex min-h-[350px] touch-none items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-black sm:min-h-[500px] ${
          tool === "pan" &&
          zoom > 1
            ? dragging
              ? "cursor-grabbing"
              : "cursor-grab"
            : tool !== "pan"
              ? "cursor-crosshair"
              : ""
        }`}
        onContextMenu={(event) =>
          event.preventDefault()
        }
        onPointerDown={
          handlePointerDown
        }
        onPointerMove={
          handlePointerMove
        }
        onPointerUp={
          handlePointerUp
        }
        onPointerCancel={
          handlePointerUp
        }
      >
        {isMarkupImage(src) && (
          <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-md border border-amber-400/70 bg-black/85 px-2 py-1 text-[10px] font-bold tracking-[0.18em] text-amber-300">
            MARKUP
          </div>
        )}

        {src ? (
          <div
            data-markup-surface
            className="relative inline-block"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin:
                "center center",
              transition:
                dragging ||
                activeMarkup
                  ? "none"
                  : "transform 120ms ease-out",
            }}
          >
            <img
              src={src}
              alt={alt}
              draggable={false}
              className="block max-h-[62vh] max-w-full select-none object-contain"
            />

            <svg
              viewBox="0 0 1000 1000"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 h-full w-full"
              aria-hidden="true"
            >
              {markups.map(
                (
                  markup,
                  index
                ) =>
                  renderMarkup(
                    markup,
                    `markup-${index}`
                  )
              )}

              {activeMarkup &&
                renderMarkup(
                  activeMarkup,
                  "active-markup"
                )}
            </svg>
          </div>
        ) : (
          <p className="text-sm text-zinc-600">
            No archived image
          </p>
        )}

        {hasPrevious && (
          <button
            type="button"
            onPointerDown={(
              event
            ) =>
              event.stopPropagation()
            }
            onClick={onPrevious}
            disabled={saving}
            className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-700 bg-black/75 text-2xl text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous image"
          >
            ‹
          </button>
        )}

        {hasNext && (
          <button
            type="button"
            onPointerDown={(
              event
            ) =>
              event.stopPropagation()
            }
            onClick={onNext}
            disabled={saving}
            className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-700 bg-black/75 text-2xl text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next image"
          >
            ›
          </button>
        )}
      </div>
    </div>
  );
}

function isMarkupImage(
  image?: string
) {
  return Boolean(
    image &&
      /\/markup-[^/]+\.png(?:\?|$)/i.test(
        image
      )
  );
}

function ImageThumbnails({
  images,
  activeIndex,
  onSelect,
  label,
}: {
  images: string[];
  activeIndex: number;
  onSelect: (index: number) => void;
  label: string;
}) {
  return (
    <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
      {images.map(
        (image, index) => (
          <button
            key={`${image}-${index}`}
            type="button"
            onClick={() =>
              onSelect(index)
            }
            className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-black ${
              activeIndex === index
                ? "border-blue-500 ring-1 ring-blue-500"
                : "border-zinc-700 hover:border-zinc-500"
            }`}
          >
            <img
              src={image}
              alt={`${label} ${index + 1}`}
              className="h-full w-full object-contain"
            />
            {isMarkupImage(image) && (
              <span className="absolute bottom-1 left-1 rounded border border-amber-400/70 bg-black/85 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-amber-300">
                MARKUP
              </span>
            )}
          </button>
        )
      )}
    </div>
  );
}

