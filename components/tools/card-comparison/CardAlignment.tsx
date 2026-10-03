"use client";



import {

  PointerEvent as ReactPointerEvent,

  useEffect,

  useRef,

  useState,

} from "react";



export type CardOrientation =
  | "portrait"
  | "landscape";

export type ReferencePreset = "standard" | "psa" | "custom";



export type AlignmentTransform = {

  scale: number;

  x: number;

  y: number;



  // Fine rotation in degrees.

  rotation: number;



  // Small alignment corrections in degrees.

  skewX: number;

  skewY: number;



  orientation: CardOrientation;

  referencePreset: ReferencePreset;
  referenceWidth: number;
  referenceHeight: number;

};



type CardAlignmentProps = {

  title: string;

  image: string;

  value: AlignmentTransform;

  onChange: (

    value: AlignmentTransform

  ) => void;

};



const MIN_SCALE = 0.25;

const MAX_SCALE = 8;



const ZOOM_STEP = 0.01;



const ROTATION_STEP = 0.1;

const MIN_FINE_ROTATION = -10;

const MAX_FINE_ROTATION = 10;



const SKEW_STEP = 0.1;

const MIN_SKEW = -10;

const MAX_SKEW = 10;



export const DEFAULT_ALIGNMENT: AlignmentTransform = {

  scale: 1,

  x: 0,

  y: 0,

  rotation: 0,

  skewX: 0,

  skewY: 0,

  orientation: "portrait",
  referencePreset: "standard",
  referenceWidth: 2.5,
  referenceHeight: 3.5,

};



export default function CardAlignment({

  title,

  image,

  value,

  onChange,

}: CardAlignmentProps) {

  const frameRef =

    useRef<HTMLDivElement | null>(null);



  const valueRef =

    useRef(value);



  const onChangeRef =

    useRef(onChange);



  const dragRef = useRef<{

    pointerId: number;

    startX: number;

    startY: number;

    originX: number;

    originY: number;

  } | null>(null);



  const [dragging, setDragging] =

    useState(false);

  type AlignmentControlTab =
    | "zoom"
    | "position"
    | "rotation"
    | "skewX"
    | "skewY";

  const [activeControlTab, setActiveControlTab] =
    useState<AlignmentControlTab>("zoom");

  type CustomBox = {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  const customWorkspaceRef = useRef<HTMLDivElement | null>(null);
  const customDrawRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);

  const [drawingCustomFrame, setDrawingCustomFrame] = useState(false);
  const [customBox, setCustomBox] = useState<CustomBox | null>(null);



  useEffect(() => {

    valueRef.current = value;

  }, [value]);



  useEffect(() => {

    onChangeRef.current = onChange;

  }, [onChange]);



  /*

   * Native non-passive wheel listener.

   * Prevents the page itself from scrolling while

   * the pointer is over the alignment frame.

   */

  useEffect(() => {

    const frame =

      frameRef.current;



    if (!frame) {

      return;

    }



    function handleNativeWheel(

      event: WheelEvent

    ) {

      event.preventDefault();

      event.stopPropagation();



      const current =

        valueRef.current;



      const direction =

        event.deltaY < 0

          ? ZOOM_STEP

          : -ZOOM_STEP;



      const nextScale =

        clampScale(

          current.scale +

            direction

        );



      onChangeRef.current({

        ...current,

        scale: nextScale,

      });

    }



    frame.addEventListener(

      "wheel",

      handleNativeWheel,

      {

        passive: false,

      }

    );



    return () => {

      frame.removeEventListener(

        "wheel",

        handleNativeWheel

      );

    };

  }, []);



  function update(

    patch: Partial<AlignmentTransform>

  ) {

    onChange({

      ...value,

      ...patch,

    });

  }



  function zoomBy(

    amount: number

  ) {

    update({

      scale: clampScale(

        value.scale + amount

      ),

    });

  }



  function setZoom(

    nextScale: number

  ) {

    update({

      scale:

        clampScale(nextScale),

    });

  }



  function moveBy(

    x: number,

    y: number

  ) {

    update({

      x: value.x + x,

      y: value.y + y,

    });

  }



  function handlePointerDown(

    event: ReactPointerEvent<HTMLDivElement>

  ) {

    if (

      event.pointerType ===

        "mouse" &&

      event.button !== 0

    ) {

      return;

    }



    event.currentTarget.setPointerCapture(

      event.pointerId

    );



    dragRef.current = {

      pointerId:

        event.pointerId,

      startX:

        event.clientX,

      startY:

        event.clientY,

      originX:

        value.x,

      originY:

        value.y,

    };



    setDragging(true);

  }



  function handlePointerMove(

    event: ReactPointerEvent<HTMLDivElement>

  ) {

    const drag =

      dragRef.current;



    if (

      !drag ||

      drag.pointerId !==

        event.pointerId

    ) {

      return;

    }



    event.preventDefault();



    const dx =

      event.clientX -

      drag.startX;



    const dy =

      event.clientY -

      drag.startY;



    onChange({

      ...value,

      x:

        drag.originX +

        dx,

      y:

        drag.originY +

        dy,

    });

  }



  function stopDragging(

    event: ReactPointerEvent<HTMLDivElement>

  ) {

    if (

      dragRef.current

        ?.pointerId ===

      event.pointerId

    ) {

      dragRef.current =

        null;



      setDragging(false);

    }

  }



  function setOrientation(
    orientation: CardOrientation
  ) {
    const width = value.referenceWidth || 2.5;
    const height = value.referenceHeight || 3.5;
    const currentPortrait = width <= height;
    const wantsPortrait = orientation === "portrait";

    onChange({
      ...value,
      orientation,
      referenceWidth: currentPortrait === wantsPortrait ? width : height,
      referenceHeight: currentPortrait === wantsPortrait ? height : width,
      x: 0,
      y: 0,
    });
  }

  function setReferencePreset(preset: ReferencePreset) {
    const portrait = value.orientation === "portrait";

    if (preset === "standard") {
      onChange({
        ...value,
        referencePreset: preset,
        referenceWidth: portrait ? 2.5 : 3.5,
        referenceHeight: portrait ? 3.5 : 2.5,
        x: 0,
        y: 0,
      });
      return;
    }

    if (preset === "psa") {
      onChange({
        ...value,
        referencePreset: preset,
        referenceWidth: portrait ? 3.16 : 5.32,
        referenceHeight: portrait ? 5.32 : 3.16,
        x: 0,
        y: 0,
      });
      return;
    }

    onChange({ ...value, referencePreset: "custom" });
    setCustomBox(null);
    setDrawingCustomFrame(true);
  }

  function customPoint(event: ReactPointerEvent<HTMLDivElement>) {
    const workspace = customWorkspaceRef.current;
    if (!workspace) return null;

    const rect = workspace.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)),
      width: rect.width,
      height: rect.height,
    };
  }

  function beginCustomFrame(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const point = customPoint(event);
    if (!point) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    customDrawRef.current = {
      pointerId: event.pointerId,
      startX: point.x,
      startY: point.y,
    };

    setCustomBox({
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
    });
  }

  function moveCustomFrame(event: ReactPointerEvent<HTMLDivElement>) {
    const draw = customDrawRef.current;
    if (!draw || draw.pointerId !== event.pointerId) return;

    const point = customPoint(event);
    if (!point) return;

    event.preventDefault();

    const left = Math.min(draw.startX, point.x);
    const top = Math.min(draw.startY, point.y);
    const right = Math.max(draw.startX, point.x);
    const bottom = Math.max(draw.startY, point.y);

    setCustomBox({
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    });
  }

  function endCustomFrame(event: ReactPointerEvent<HTMLDivElement>) {
    if (customDrawRef.current?.pointerId !== event.pointerId) return;
    customDrawRef.current = null;
  }

  function nudgeCustomBox(dx: number, dy: number) {
    setCustomBox((box) => {
      if (!box) return box;
      const workspace = customWorkspaceRef.current;
      if (!workspace) return box;

      return {
        ...box,
        x: Math.max(0, Math.min(workspace.clientWidth - box.width, box.x + dx)),
        y: Math.max(0, Math.min(workspace.clientHeight - box.height, box.y + dy)),
      };
    });
  }

  function adjustCustomEdge(
    edge: "left" | "right" | "top" | "bottom",
    amount: number
  ) {
    setCustomBox((box) => {
      if (!box) return box;
      const workspace = customWorkspaceRef.current;
      if (!workspace) return box;

      const minSize = 8;
      let next = { ...box };

      if (edge === "left") {
        const nextX = Math.max(0, Math.min(box.x + amount, box.x + box.width - minSize));
        next.width = box.width + (box.x - nextX);
        next.x = nextX;
      } else if (edge === "right") {
        next.width = Math.max(
          minSize,
          Math.min(workspace.clientWidth - box.x, box.width + amount)
        );
      } else if (edge === "top") {
        const nextY = Math.max(0, Math.min(box.y + amount, box.y + box.height - minSize));
        next.height = box.height + (box.y - nextY);
        next.y = nextY;
      } else {
        next.height = Math.max(
          minSize,
          Math.min(workspace.clientHeight - box.y, box.height + amount)
        );
      }

      return next;
    });
  }

  function applyCustomFrame() {
    if (!customBox || customBox.width < 8 || customBox.height < 8) return;

    const portrait = customBox.width <= customBox.height;

    onChange({
      ...value,
      referencePreset: "custom",
      referenceWidth: Number(customBox.width.toFixed(2)),
      referenceHeight: Number(customBox.height.toFixed(2)),
      orientation: portrait ? "portrait" : "landscape",
      x: 0,
      y: 0,
    });

    setDrawingCustomFrame(false);
  }



  /*

   * Fine rotation.

   */

  function rotateFine(

    amount: number

  ) {

    update({

      rotation:

        clampNumber(

          value.rotation +

            amount,

          MIN_FINE_ROTATION,

          MAX_FINE_ROTATION,

          1

        ),

    });

  }



  function setFineRotation(

    rotation: number

  ) {

    update({

      rotation:

        clampNumber(

          rotation,

          MIN_FINE_ROTATION,

          MAX_FINE_ROTATION,

          1

        ),

    });

  }



  /*

   * 90-degree rotation is still useful when an

   * uploaded image itself is sideways.

   *

   * Because the fine rotation slider is intentionally

   * limited to +/-10 degrees, we normalize the

   * resulting value back into that fine range.

   *

   * The orientation is also swapped so the alignment

   * frame follows the card.

   */

  function rotate90(

    direction: -1 | 1

  ) {

    const nextOrientation =

      value.orientation ===

      "portrait"

        ? "landscape"

        : "portrait";



    onChange({

      ...value,

      rotation: 0,

      orientation:

        nextOrientation,
      referenceWidth: value.referenceHeight,
      referenceHeight: value.referenceWidth,

      x: 0,

      y: 0,

    });

  }



  function resetRotation() {

    update({

      rotation: 0,

    });

  }



  function changeSkewX(

    amount: number

  ) {

    update({

      skewX:

        clampNumber(

          value.skewX +

            amount,

          MIN_SKEW,

          MAX_SKEW,

          1

        ),

    });

  }



  function changeSkewY(

    amount: number

  ) {

    update({

      skewY:

        clampNumber(

          value.skewY +

            amount,

          MIN_SKEW,

          MAX_SKEW,

          1

        ),

    });

  }



  function setSkewX(

    skewX: number

  ) {

    update({

      skewX:

        clampNumber(

          skewX,

          MIN_SKEW,

          MAX_SKEW,

          1

        ),

    });

  }



  function setSkewY(

    skewY: number

  ) {

    update({

      skewY:

        clampNumber(

          skewY,

          MIN_SKEW,

          MAX_SKEW,

          1

        ),

    });

  }



  function resetSkew() {

    update({

      skewX: 0,

      skewY: 0,

    });

  }



  function reset() {

    onChange({

      ...DEFAULT_ALIGNMENT,

      orientation:

        value.orientation,
      referencePreset: value.referencePreset,
      referenceWidth: value.referenceWidth,
      referenceHeight: value.referenceHeight,

    });

  }



  const safeReferenceWidth =
    value.referenceWidth > 0
      ? value.referenceWidth
      : value.orientation === "portrait" ? 2.5 : 3.5;

  const safeReferenceHeight =
    value.referenceHeight > 0
      ? value.referenceHeight
      : value.orientation === "portrait" ? 3.5 : 2.5;

  const referenceRatio = safeReferenceWidth / safeReferenceHeight;

  // Workspace dimensions stay unchanged; only the purple frame changes ratio.
  const frameWidth =
    referenceRatio <= 1
      ? Math.min(520, 680 * referenceRatio)
      : Math.min(900, 620 * referenceRatio);



  const zoomPercent =

    Math.round(

      value.scale * 100

    );



  return (

    <div className="overflow-hidden rounded-xl border border-purple-900/80 bg-[#111113]">



      {/* TITLE */}

      <div className="border-b border-neutral-800 px-4 py-3 text-center">



        <div className="text-sm font-black uppercase tracking-wider text-white">

          {title}

        </div>



        <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-purple-400">

          Position the card inside the frame

        </div>



      </div>



      {/* REFERENCE SIZE / ORIENTATION */}
      <div className="border-b border-neutral-800 bg-[#0d0d0f] px-3 py-4">
        <div className="mb-2 text-center text-[9px] font-black uppercase tracking-widest text-neutral-500">
          Reference Size
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <OrientationButton
            selected={value.referencePreset === "standard"}
            onClick={() => setReferencePreset("standard")}
          >
            Standard Card
          </OrientationButton>

          <OrientationButton
            selected={value.referencePreset === "psa"}
            onClick={() => setReferencePreset("psa")}
          >
            PSA Slab
          </OrientationButton>

          <OrientationButton
            selected={value.referencePreset === "custom"}
            onClick={() => setReferencePreset("custom")}
          >
            Custom
          </OrientationButton>
        </div>

        {value.referencePreset === "custom" && (
          <div className="mx-auto mt-4 max-w-md text-center">
            <div className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">
              {drawingCustomFrame
                ? "Draw a box around the card, slab, or object below."
                : "Custom reference frame is set."}
            </div>

          </div>
        )}

        <div className="mb-2 mt-4 text-center text-[9px] font-black uppercase tracking-widest text-neutral-500">
          Orientation
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <OrientationButton
            selected={value.orientation === "portrait"}
            onClick={() => setOrientation("portrait")}
          >
            Portrait
          </OrientationButton>

          <OrientationButton
            selected={value.orientation === "landscape"}
            onClick={() => setOrientation("landscape")}
          >
            Landscape
          </OrientationButton>
        </div>

        <div className="mt-3 text-center text-[10px] font-bold text-purple-300">
          {safeReferenceWidth.toFixed(2)} × {safeReferenceHeight.toFixed(2)}
          {value.referencePreset === "standard"
            ? " • Standard Card"
            : value.referencePreset === "psa"
              ? " • PSA Slab"
              : " • Custom"}
        </div>
      </div>

      {/* ALIGNMENT AREA */}
      {value.referencePreset === "custom" && drawingCustomFrame ? (
        <div className="bg-[#050505] px-3 py-5 md:px-5 md:py-6">
          <div className="flex min-h-[600px] flex-col items-center justify-center gap-4 md:min-h-[700px]">
            <div
              ref={customWorkspaceRef}
              onPointerDown={beginCustomFrame}
              onPointerMove={moveCustomFrame}
              onPointerUp={endCustomFrame}
              onPointerCancel={endCustomFrame}
              className="relative h-[520px] w-full max-w-[900px] cursor-crosshair overflow-hidden border-2 border-purple-500 bg-black touch-none overscroll-contain md:h-[620px]"
              title="Drag a box around the object"
            >
              <img
                src={image}
                alt={`${title} custom reference`}
                draggable={false}
                className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
              />

              {customBox && (
                <div
                  className="pointer-events-none absolute"
                  style={{
                    left: customBox.x,
                    top: customBox.y,
                    width: customBox.width,
                    height: customBox.height,
                  }}
                >
                  <div className="absolute inset-0 border-4 border-dashed border-red-500" />
                </div>
              )}

              <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white/70">
                Drag around the object to create the reference frame
              </div>
            </div>

            {customBox && customBox.width >= 8 && customBox.height >= 8 && (
              <div className="w-full max-w-2xl rounded-xl border border-neutral-800 bg-[#0d0d0f] p-4">
                <div className="mb-3 text-center text-[9px] font-black uppercase tracking-widest text-neutral-500">
                  Fine Tune Custom Frame • 1 px
                </div>

                <div className="flex flex-wrap items-center justify-center gap-5">
                  <div>
                    <div className="mb-2 text-center text-[8px] font-black uppercase tracking-wider text-neutral-600">
                      Move Frame
                    </div>
                    <div className="mx-auto grid w-fit grid-cols-3 gap-1">
                      <div />
                      <NudgeButton label="Move frame up 1 pixel" onClick={() => nudgeCustomBox(0, -1)}>↑</NudgeButton>
                      <div />
                      <NudgeButton label="Move frame left 1 pixel" onClick={() => nudgeCustomBox(-1, 0)}>←</NudgeButton>
                      <div className="flex h-9 min-w-9 items-center justify-center rounded border border-neutral-800 bg-black px-2 text-[8px] font-black uppercase text-neutral-600">1 px</div>
                      <NudgeButton label="Move frame right 1 pixel" onClick={() => nudgeCustomBox(1, 0)}>→</NudgeButton>
                      <div />
                      <NudgeButton label="Move frame down 1 pixel" onClick={() => nudgeCustomBox(0, 1)}>↓</NudgeButton>
                      <div />
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-center text-[8px] font-black uppercase tracking-wider text-neutral-600">
                      Adjust Edges
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[9px]">
                      <ControlButton onClick={() => adjustCustomEdge("left", -1)}>Left Out</ControlButton>
                      <ControlButton onClick={() => adjustCustomEdge("left", 1)}>Left In</ControlButton>
                      <ControlButton onClick={() => adjustCustomEdge("right", -1)}>Right In</ControlButton>
                      <ControlButton onClick={() => adjustCustomEdge("right", 1)}>Right Out</ControlButton>
                      <ControlButton onClick={() => adjustCustomEdge("top", -1)}>Top Out</ControlButton>
                      <ControlButton onClick={() => adjustCustomEdge("top", 1)}>Top In</ControlButton>
                      <ControlButton onClick={() => adjustCustomEdge("bottom", -1)}>Bottom In</ControlButton>
                      <ControlButton onClick={() => adjustCustomEdge("bottom", 1)}>Bottom Out</ControlButton>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-center text-[10px] font-bold text-purple-300">
                  Reference ratio: {customBox.width.toFixed(0)} × {customBox.height.toFixed(0)}
                </div>

                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={applyCustomFrame}
                    className="rounded border border-purple-400 bg-purple-600 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white transition hover:bg-purple-500"
                  >
                    Use This Frame
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (

      <div className="bg-[#050505] px-3 py-5 md:px-5 md:py-6">



        <div className="flex min-h-[600px] items-center justify-center md:min-h-[700px]">



          <div

            ref={frameRef}

            onPointerDown={

              handlePointerDown

            }

            onPointerMove={

              handlePointerMove

            }

            onPointerUp={

              stopDragging

            }

            onPointerCancel={

              stopDragging

            }

            className={`relative overflow-hidden border-2 border-purple-500 bg-black touch-none overscroll-contain ${
              dragging ? "cursor-grabbing" : "cursor-grab"
            }`}
            style={{
              width: `min(100%, ${frameWidth}px)`,
              aspectRatio: `${safeReferenceWidth} / ${safeReferenceHeight}`,
            }}

          >



            {/* IMAGE */}

            <img

              src={image}

              alt={`${title} alignment`}

              draggable={false}

              className="pointer-events-none absolute left-1/2 top-1/2 h-full w-full max-w-none select-none object-contain"

              style={{

                transform: `

                  translate(

                    calc(-50% + ${value.x}px),

                    calc(-50% + ${value.y}px)

                  )

                  scale(${value.scale})

                  rotate(${value.rotation}deg)

                  skewX(${value.skewX}deg)

                  skewY(${value.skewY}deg)

                `,

                transformOrigin:

                  "center center",

              }}

            />



            {/* ALIGNMENT GUIDE */}

            <div className="pointer-events-none absolute inset-0">



              <div className="absolute inset-[2%] border border-dashed border-white/90" />



              <div className="absolute left-1/2 top-0 h-full border-l border-purple-400/30" />



              <div className="absolute left-0 top-1/2 w-full border-t border-purple-400/30" />



              <div className="absolute left-[2%] top-[2%] h-5 w-5 border-l-2 border-t-2 border-purple-300" />



              <div className="absolute right-[2%] top-[2%] h-5 w-5 border-r-2 border-t-2 border-purple-300" />



              <div className="absolute bottom-[2%] left-[2%] h-5 w-5 border-b-2 border-l-2 border-purple-300" />



              <div className="absolute bottom-[2%] right-[2%] h-5 w-5 border-b-2 border-r-2 border-purple-300" />



            </div>



            <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white/70">

              Drag to move • Wheel = 1% zoom

            </div>



          </div>

        </div>

      </div>



      )}
      {/* CONTROLS */}

      <div className="border-t border-neutral-800 bg-[#0d0d0f] p-4">



        {/* ALIGNMENT CONTROL TABS */}
        <div className="mx-auto mb-5 flex max-w-3xl flex-wrap justify-center gap-2">
          {[
            { value: "zoom", label: "Fine Zoom" },
            { value: "position", label: "Position" },
            { value: "rotation", label: "Rotation" },
            { value: "skewX", label: "H-Skew" },
            { value: "skewY", label: "V-Skew" },
          ].map((tab) => {
            const selected =
              activeControlTab === tab.value;

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() =>
                  setActiveControlTab(
                    tab.value as AlignmentControlTab
                  )
                }
                className={`rounded border px-3 py-2 text-[10px] font-black uppercase tracking-wider transition ${
                  selected
                    ? "border-purple-400 bg-purple-600 text-white"
                    : "border-neutral-700 bg-black text-purple-300 hover:border-purple-500"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ONE VARIABLE AT A TIME */}
        {activeControlTab === "zoom" && (
          <ControlSection title="Fine Zoom">
            <div className="flex items-center gap-3">
              <ControlButton
                onClick={() =>
                  zoomBy(-ZOOM_STEP)
                }
              >
                − 1%
              </ControlButton>

              <input
                type="range"
                min="25"
                max="800"
                step="1"
                value={zoomPercent}
                onChange={(event) =>
                  setZoom(
                    Number(
                      event.target.value
                    ) / 100
                  )
                }
                className="min-w-0 flex-1 accent-purple-500"
                aria-label={`${title} zoom`}
              />

              <ControlButton
                onClick={() =>
                  zoomBy(ZOOM_STEP)
                }
              >
                + 1%
              </ControlButton>
            </div>

            <ValueDisplay>
              {zoomPercent}%
            </ValueDisplay>
          </ControlSection>
        )}

        {activeControlTab === "position" && (
          <ControlSection title="Fine Position">
            <div className="mx-auto grid w-fit grid-cols-3 gap-1">
              <div />

              <NudgeButton
                label="Move up 1 pixel"
                onClick={() =>
                  moveBy(0, -1)
                }
              >
                ↑
              </NudgeButton>

              <div />

              <NudgeButton
                label="Move left 1 pixel"
                onClick={() =>
                  moveBy(-1, 0)
                }
              >
                ←
              </NudgeButton>

              <div className="flex h-9 min-w-9 items-center justify-center rounded border border-neutral-800 bg-black px-2 text-[8px] font-black uppercase text-neutral-600">
                1 px
              </div>

              <NudgeButton
                label="Move right 1 pixel"
                onClick={() =>
                  moveBy(1, 0)
                }
              >
                →
              </NudgeButton>

              <div />

              <NudgeButton
                label="Move down 1 pixel"
                onClick={() =>
                  moveBy(0, 1)
                }
              >
                ↓
              </NudgeButton>

              <div />
            </div>
          </ControlSection>
        )}

        {activeControlTab === "rotation" && (
          <ControlSection title="Fine Rotation">
            <div className="flex items-center gap-3">
              <ControlButton
                onClick={() =>
                  rotateFine(
                    -ROTATION_STEP
                  )
                }
              >
                − 0.1°
              </ControlButton>

              <input
                type="range"
                min={MIN_FINE_ROTATION}
                max={MAX_FINE_ROTATION}
                step="0.1"
                value={value.rotation}
                onChange={(event) =>
                  setFineRotation(
                    Number(
                      event.target.value
                    )
                  )
                }
                className="min-w-0 flex-1 accent-purple-500"
                aria-label={`${title} fine rotation`}
              />

              <ControlButton
                onClick={() =>
                  rotateFine(
                    ROTATION_STEP
                  )
                }
              >
                + 0.1°
              </ControlButton>
            </div>

            <ValueDisplay>
              {formatDegrees(
                value.rotation
              )}
            </ValueDisplay>

            <div className="mt-2 text-center">
              <button
                type="button"
                onClick={resetRotation}
                className="text-[9px] font-black uppercase tracking-wider text-neutral-500 transition hover:text-purple-300"
              >
                Reset Rotation
              </button>
            </div>
          </ControlSection>
        )}

        {activeControlTab === "skewX" && (
          <ControlSection title="Horizontal Skew">
            <div className="flex items-center gap-3">
              <ControlButton
                onClick={() =>
                  changeSkewX(
                    -SKEW_STEP
                  )
                }
              >
                − 0.1°
              </ControlButton>

              <input
                type="range"
                min={MIN_SKEW}
                max={MAX_SKEW}
                step="0.1"
                value={value.skewX}
                onChange={(event) =>
                  setSkewX(
                    Number(
                      event.target.value
                    )
                  )
                }
                className="min-w-0 flex-1 accent-purple-500"
                aria-label={`${title} horizontal skew`}
              />

              <ControlButton
                onClick={() =>
                  changeSkewX(
                    SKEW_STEP
                  )
                }
              >
                + 0.1°
              </ControlButton>
            </div>

            <ValueDisplay>
              {formatDegrees(
                value.skewX
              )}
            </ValueDisplay>

            <div className="mt-2 text-center">
              <button
                type="button"
                onClick={resetSkew}
                className="text-[9px] font-black uppercase tracking-wider text-neutral-500 transition hover:text-purple-300"
              >
                Reset Skew
              </button>
            </div>
          </ControlSection>
        )}

        {activeControlTab === "skewY" && (
          <ControlSection title="Vertical Skew">
            <div className="flex items-center gap-3">
              <ControlButton
                onClick={() =>
                  changeSkewY(
                    -SKEW_STEP
                  )
                }
              >
                − 0.1°
              </ControlButton>

              <input
                type="range"
                min={MIN_SKEW}
                max={MAX_SKEW}
                step="0.1"
                value={value.skewY}
                onChange={(event) =>
                  setSkewY(
                    Number(
                      event.target.value
                    )
                  )
                }
                className="min-w-0 flex-1 accent-purple-500"
                aria-label={`${title} vertical skew`}
              />

              <ControlButton
                onClick={() =>
                  changeSkewY(
                    SKEW_STEP
                  )
                }
              >
                + 0.1°
              </ControlButton>
            </div>

            <ValueDisplay>
              {formatDegrees(
                value.skewY
              )}
            </ValueDisplay>

            <div className="mt-2 text-center">
              <button
                type="button"
                onClick={resetSkew}
                className="text-[9px] font-black uppercase tracking-wider text-neutral-500 transition hover:text-purple-300"
              >
                Reset Skew
              </button>
            </div>
          </ControlSection>
        )}

        {/* 90 DEGREE / RESET */}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">



          <ControlButton

            onClick={() =>

              rotate90(-1)

            }

          >

            ↺ Rotate 90°

          </ControlButton>



          <ControlButton

            onClick={() =>

              rotate90(1)

            }

          >

            Rotate 90° ↻

          </ControlButton>



          <button

            type="button"

            onClick={reset}

            className="rounded border border-yellow-700 bg-yellow-950/30 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-yellow-300 transition hover:border-yellow-500 hover:bg-yellow-950/60"

          >

            Reset All

          </button>



        </div>



        <div className="mt-4 text-center text-[10px] leading-4 text-neutral-500">

          Use fine rotation for a slightly crooked

          image. Use skew only for small angle

          corrections. More significant perspective

          distortion will be handled with corner

          alignment.

        </div>



      </div>

    </div>

  );

}



function clampScale(

  scale: number

) {

  return Math.min(

    MAX_SCALE,

    Math.max(

      MIN_SCALE,

      Number(

        scale.toFixed(2)

      )

    )

  );

}



function clampNumber(

  value: number,

  min: number,

  max: number,

  decimals: number

) {

  const factor =

    10 ** decimals;



  const rounded =

    Math.round(

      value * factor

    ) / factor;



  return Math.min(

    max,

    Math.max(

      min,

      rounded

    )

  );

}



function formatDegrees(

  value: number

) {

  const normalized =

    Math.abs(value) < 0.05

      ? 0

      : value;



  return `${normalized.toFixed(

    1

  )}°`;

}



function ControlSection({

  title,

  children,

}: {

  title: string;

  children: React.ReactNode;

}) {

  return (

    <div className="mx-auto mt-5 max-w-lg first:mt-0">



      <div className="mb-2 text-center text-[9px] font-black uppercase tracking-widest text-neutral-500">

        {title}

      </div>



      {children}



    </div>

  );

}



function ValueDisplay({

  children,

}: {

  children: React.ReactNode;

}) {

  return (

    <div className="mt-2 text-center">

      <span className="inline-block min-w-[76px] rounded border border-purple-800 bg-black px-3 py-2 text-xs font-black text-purple-300">

        {children}

      </span>

    </div>

  );

}



function OrientationButton({

  selected,

  onClick,

  children,

}: {

  selected: boolean;

  onClick: () => void;

  children: React.ReactNode;

}) {

  return (

    <button

      type="button"

      onClick={onClick}

      className={`rounded border px-3 py-2 text-[10px] font-black uppercase tracking-wider transition ${

        selected

          ? "border-purple-400 bg-purple-600 text-white"

          : "border-neutral-700 bg-black text-purple-300 hover:border-purple-500"

      }`}

    >

      {children}

    </button>

  );

}



function ControlButton({

  onClick,

  children,

}: {

  onClick: () => void;

  children: React.ReactNode;

}) {

  return (

    <button

      type="button"

      onClick={onClick}

      className="rounded border border-purple-800 bg-purple-950/30 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-purple-300 transition hover:border-purple-500 hover:bg-purple-950/60"

    >

      {children}

    </button>

  );

}



function NudgeButton({

  label,

  onClick,

  children,

}: {

  label: string;

  onClick: () => void;

  children: React.ReactNode;

}) {

  return (

    <button

      type="button"

      aria-label={label}

      title={label}

      onClick={onClick}

      className="flex h-9 min-w-9 items-center justify-center rounded border border-purple-800 bg-purple-950/30 px-3 text-base font-black text-purple-300 transition hover:border-purple-500 hover:bg-purple-950/60"

    >

      {children}

    </button>

  );

}