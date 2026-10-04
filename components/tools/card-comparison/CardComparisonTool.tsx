"use client";







import {

  ChangeEvent,

  PointerEvent as ReactPointerEvent,

  useEffect,

  useRef,

  useState,

} from "react";


import CardAlignment, {
  AlignmentTransform,
  DEFAULT_ALIGNMENT,
} from "@/components/tools/card-comparison/CardAlignment";

import ContributionModal from "@/components/tnce/ContributionModal";

type Side = "A" | "B";



type View = "front" | "back";



type ComparisonMode = "side-by-side" | "overlay" | "swipe";

type AlignmentStep = "card-a" | "card-b";

type MarkupTool = "pan" | "select" | "draw" | "circle" | "rectangle" | "triangle" | "arrow" | "original" | "authentic" | "altered" | "fake";
type MarkupColor = "yellow" | "red" | "blue";

type MarkupMark = {
  id: string;
  tool: Exclude<MarkupTool, "pan" | "select">;
  color: MarkupColor;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  points?: Array<{ x: number; y: number }>;
};

type MarkupViewState = {
  front: MarkupMark[];
  back: MarkupMark[];
};

type MarkupState = {
  A: MarkupViewState;
  B: MarkupViewState;
};

type PerspectiveCorners = {
  topLeftX: number;
  topLeftY: number;
  topRightX: number;
  topRightY: number;
  bottomRightX: number;
  bottomRightY: number;
  bottomLeftX: number;
  bottomLeftY: number;
};

type CardAlignmentTransform = AlignmentTransform & {
  perspective: PerspectiveCorners;
};

type PerspectiveCorner = "topLeft" | "topRight" | "bottomRight" | "bottomLeft";

const DEFAULT_PERSPECTIVE: PerspectiveCorners = {
  topLeftX: 0, topLeftY: 0,
  topRightX: 0, topRightY: 0,
  bottomRightX: 0, bottomRightY: 0,
  bottomLeftX: 0, bottomLeftY: 0,
};







type CardImage = {



  src: string | null;



  source: "upload" | "url" | null;



};







type CardImages = {



  front: CardImage;



  back: CardImage;



};







type CardAlignmentState = {



  front: CardAlignmentTransform;



  back: CardAlignmentTransform;



};







type AppliedAlignmentState = {



  front: boolean;



  back: boolean;



};


type AlignmentFrameSize = {
  width: number;
  height: number;
};

type AlignmentFrameSizeState = {
  front: AlignmentFrameSize | null;
  back: AlignmentFrameSize | null;
};



type ComparisonTransform = {



  scale: number;



  x: number;



  y: number;



};







type ComparisonTransformState = {



  front: ComparisonTransform;



  back: ComparisonTransform;



};







type ComparisonLockState = {



  front: boolean;



  back: boolean;



};







const DEFAULT_COMPARISON_TRANSFORM: ComparisonTransform = {



  scale: 1,



  x: 0,



  y: 0,



};



// Keep a small, identical gutter around both normalized cards in the final
// comparison workspace. The approved A/B geometry remains locked together.
const FINAL_NORMALIZED_DISPLAY_FIT = 0.94;







function cloneDefaultComparisonTransform(): ComparisonTransform {



  return {



    ...DEFAULT_COMPARISON_TRANSFORM,



  };



}







function createComparisonTransformState(): ComparisonTransformState {



  return {



    front: cloneDefaultComparisonTransform(),



    back: cloneDefaultComparisonTransform(),



  };



}







function createComparisonLockState(): ComparisonLockState {



  return {



    front: true,



    back: true,



  };



}







function createEmptyCard(): CardImages {



  return {



    front: {



      src: null,



      source: null,



    },



    back: {



      src: null,



      source: null,



    },



  };



}







function cloneDefaultAlignment(): CardAlignmentTransform {
  return {
    ...DEFAULT_ALIGNMENT,
    perspective: { ...DEFAULT_PERSPECTIVE },
  };
}

function withPerspective(value: AlignmentTransform | CardAlignmentTransform): CardAlignmentTransform {
  const current = value as CardAlignmentTransform;
  const portrait = value.orientation === "portrait";
  return {
    ...value,
    referencePreset: value.referencePreset ?? "standard",
    referenceWidth: value.referenceWidth ?? (portrait ? 2.5 : 3.5),
    referenceHeight: value.referenceHeight ?? (portrait ? 3.5 : 2.5),
    perspective: current.perspective ? { ...current.perspective } : { ...DEFAULT_PERSPECTIVE },
  };
}

function solveLinearSystem(matrix: number[][], values: number[]): number[] | null {
  const n = values.length;
  const a = matrix.map((row, i) => [...row, values[i]]);

  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    }
    if (Math.abs(a[pivot][col]) < 1e-10) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const divisor = a[col][col];
    for (let j = col; j <= n; j += 1) a[col][j] /= divisor;
    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = a[row][col];
      for (let j = col; j <= n; j += 1) a[row][j] -= factor * a[col][j];
    }
  }
  return a.map((row) => row[n]);
}

function perspectiveMatrix3d(width: number, height: number, corners?: PerspectiveCorners): string {
  if (width <= 0 || height <= 0) return "matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)";
  const safeCorners = corners ?? DEFAULT_PERSPECTIVE;
  const px = (value: number) => (value / 100) * width;
  const py = (value: number) => (value / 100) * height;
  const left = -width / 2;
  const right = width / 2;
  const top = -height / 2;
  const bottom = height / 2;
  const source = [[left,top],[right,top],[right,bottom],[left,bottom]];
  const dest = [
    [left + px(safeCorners.topLeftX), top + py(safeCorners.topLeftY)],
    [right + px(safeCorners.topRightX), top + py(safeCorners.topRightY)],
    [right + px(safeCorners.bottomRightX), bottom + py(safeCorners.bottomRightY)],
    [left + px(safeCorners.bottomLeftX), bottom + py(safeCorners.bottomLeftY)],
  ];
  const m: number[][] = [];
  const v: number[] = [];
  for (let i = 0; i < 4; i += 1) {
    const [x,y] = source[i];
    const [X,Y] = dest[i];
    m.push([x,y,1,0,0,0,-X*x,-X*y]); v.push(X);
    m.push([0,0,0,x,y,1,-Y*x,-Y*y]); v.push(Y);
  }
  const h = solveLinearSystem(m,v);
  if (!h) return "matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)";
  const [a,b,c,d,e,f,g,hh] = h;
  return `matrix3d(${a},${d},0,${g},${b},${e},0,${hh},0,0,1,0,${c},${f},0,1)`;
}








function createAlignmentState(): CardAlignmentState {



  return {



    front: cloneDefaultAlignment(),



    back: cloneDefaultAlignment(),



  };



}







function createAppliedAlignmentState(): AppliedAlignmentState {



  return {



    front: false,



    back: false,



  };



}



function createMarkupState(): MarkupState {
  return {
    A: { front: [], back: [] },
    B: { front: [], back: [] },
  };
}

function markupColorValue(color: MarkupColor) {
  if (color === "red") return "#ef4444";
  if (color === "blue") return "#3b82f6";
  return "#facc15";
}

function isStampTool(tool: MarkupTool): tool is "original" | "authentic" | "altered" | "fake" {
  return tool === "original" || tool === "authentic" || tool === "altered" || tool === "fake";
}

function stampLabel(tool: MarkupTool) {
  if (tool === "original") return "ORIGINAL";
  if (tool === "authentic") return "AUTHENTIC";
  if (tool === "altered") return "ALTERED";
  if (tool === "fake") return "FAKE";
  return "";
}

function stampColor(tool: MarkupTool) {
  return tool === "original" || tool === "authentic" ? "#22c55e" : "#ef4444";
}


function createMarkupId() {
  return `markup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function canvasToPngFile(
  canvas: HTMLCanvasElement,
  fileName: string
): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error(`Could not create ${fileName}`));
          return;
        }

        resolve(
          new File([blob], fileName, {
            type: "image/png",
          })
        );
      },
      "image/png",
      1
    );
  });
}

export default function CardComparisonTool({
  sports = [],
  reasons = [],
}: {
  sports?: string[];
  reasons?: string[];
}) {

  const [showCardsAlertChoice, setShowCardsAlertChoice] = useState(false);
  const [showCardsAlertModal, setShowCardsAlertModal] = useState(false);
  const [cardsAlertCurrentSide, setCardsAlertCurrentSide] =
    useState<Side | null>(null);

  const [cardsAlertHandoff, setCardsAlertHandoff] = useState<any>(null);
  const [preparingCardsAlert, setPreparingCardsAlert] = useState(false);

  const [cardA, setCardA] =



    useState<CardImages>(createEmptyCard);







  const [cardB, setCardB] =



    useState<CardImages>(createEmptyCard);







  const [view, setView] =



    useState<View>("front");







  const [alignmentA, setAlignmentA] =



    useState<CardAlignmentState>(



      createAlignmentState



    );







  const [alignmentB, setAlignmentB] =



    useState<CardAlignmentState>(



      createAlignmentState



    );







  const [alignmentApplied, setAlignmentApplied] =



    useState<AppliedAlignmentState>(



      createAppliedAlignmentState



    );







  const [approvedAlignmentFrame, setApprovedAlignmentFrame] =
    useState<AlignmentFrameSizeState>({ front: null, back: null });

  const [workingAlignmentFrame, setWorkingAlignmentFrame] =
    useState<AlignmentFrameSize | null>(null);



  const [showAlignment, setShowAlignment] =



    useState(false);

  const [alignmentStep, setAlignmentStep] =

    useState<AlignmentStep>("card-a");



  const [comparisonMode, setComparisonMode] =

    useState<ComparisonMode>("side-by-side");



  const [overlayOpacity, setOverlayOpacity] =

    useState(50);







  const [comparisonA, setComparisonA] =



    useState<ComparisonTransformState>(



      createComparisonTransformState



    );







  const [comparisonB, setComparisonB] =



    useState<ComparisonTransformState>(



      createComparisonTransformState



    );







  const [comparisonLocked, setComparisonLocked] =



    useState<ComparisonLockState>(



      createComparisonLockState



    );



  const [markupTool, setMarkupTool] =
    useState<MarkupTool>("pan");

  const [markupColor, setMarkupColor] =
    useState<MarkupColor>("yellow");

  const [markup, setMarkup] =
    useState<MarkupState>(createMarkupState);

  const [exporting, setExporting] =
    useState<"A" | "B" | "side-by-side" | null>(null);







  function resetAlignmentForImage(



    side: Side,



    imageSide: View



  ) {



    const alignmentSetter =



      side === "A"



        ? setAlignmentA



        : setAlignmentB;







    alignmentSetter((current) => ({



      ...current,



      [imageSide]:



        cloneDefaultAlignment(),



    }));







    setAlignmentApplied((current) => ({



      ...current,



      [imageSide]: false,



    }));







    const comparisonSetter =



      side === "A"



        ? setComparisonA



        : setComparisonB;







    comparisonSetter((current) => ({



      ...current,



      [imageSide]:



        cloneDefaultComparisonTransform(),



    }));



  }







  function updateImage(



    side: Side,



    imageSide: View,



    image: CardImage



  ) {



    const setter =



      side === "A"



        ? setCardA



        : setCardB;







    setter((current) => {



      const previous =



        current[imageSide];







      if (



        previous.source === "upload" &&



        previous.src



      ) {



        URL.revokeObjectURL(



          previous.src



        );



      }







      return {



        ...current,



        [imageSide]: image,



      };



    });







    resetAlignmentForImage(



      side,



      imageSide



    );



  }







  function handleUpload(



    side: Side,



    imageSide: View,



    event: ChangeEvent<HTMLInputElement>



  ) {



    const file =



      event.target.files?.[0];







    if (!file) {



      return;



    }







    if (



      !file.type.startsWith("image/")



    ) {



      event.target.value = "";



      return;



    }







    const imageUrl =



      URL.createObjectURL(file);







    updateImage(



      side,



      imageSide,



      {



        src: imageUrl,



        source: "upload",



      }



    );







    event.target.value = "";



  }







  function handleUrl(



    side: Side,



    imageSide: View,



    url: string



  ) {



    const cleanUrl =



      url.trim();







    if (!cleanUrl) {



      return;



    }







    updateImage(



      side,



      imageSide,



      {



        src: cleanUrl,



        source: "url",



      }



    );



  }







  function removeImage(



    side: Side,



    imageSide: View



  ) {



    updateImage(



      side,



      imageSide,



      {



        src: null,



        source: null,



      }



    );



  }







  function updateAlignment(



    side: Side,



    imageSide: View,



    value: AlignmentTransform | CardAlignmentTransform



  ) {



    const setter =



      side === "A"



        ? setAlignmentA



        : setAlignmentB;







    setter((current) => ({



      ...current,



      [imageSide]: withPerspective(value),



    }));







    setAlignmentApplied((current) => ({



      ...current,



      [imageSide]: false,



    }));



  }







  function openAlignment() {
    setComparisonMode("side-by-side");
    setAlignmentStep("card-a");
    setShowAlignment(true);
  }

  function cancelAlignment() {
    setAlignmentStep("card-a");
    setShowAlignment(false);
  }

  function setCardAReference() {
    setAlignmentStep("card-b");
  }

  function backToCardAReference() {
    setAlignmentStep("card-a");
  }

  function applyAlignment() {
    // Preserve the exact Step-2 coordinate system. Alignment x/y values are
    // pixel offsets, so the final viewers must scale those offsets from the
    // frame in which the alignment was approved instead of reinterpreting
    // them as pixels in a smaller side-by-side frame.
    if (workingAlignmentFrame?.width && workingAlignmentFrame?.height) {
      setApprovedAlignmentFrame((current) => ({
        ...current,
        [view]: { ...workingAlignmentFrame },
      }));
    }

    // Card A defines the normalized comparison frame. Persist Card B in the
    // same approved orientation so a B card rotated horizontal in Step 2
    // remains horizontal in Side-by-Side and Opacity Overlay.
    setAlignmentB((current) => ({
      ...current,
      [view]: withPerspective({
        ...current[view],
        orientation: alignmentA[view].orientation,
        referencePreset: alignmentA[view].referencePreset,
        referenceWidth: alignmentA[view].referenceWidth,
        referenceHeight: alignmentA[view].referenceHeight,
      }),
    }));

    setAlignmentApplied((current) => ({
      ...current,
      [view]: true,
    }));

    const reset = cloneDefaultComparisonTransform();
    setComparisonA((current) => ({ ...current, [view]: { ...reset } }));
    setComparisonB((current) => ({ ...current, [view]: { ...reset } }));
    setComparisonLocked((current) => ({ ...current, [view]: true }));
    setAlignmentStep("card-a");
    setShowAlignment(false);
  }

  function updateComparisonTransform(



    side: Side,



    nextTransform: ComparisonTransform



  ) {



    const sideSetter =



      side === "A"



        ? setComparisonA



        : setComparisonB;







    sideSetter((current) => ({



      ...current,



      [view]: nextTransform,



    }));







    if (comparisonLocked[view]) {



      const otherSetter =



        side === "A"



          ? setComparisonB



          : setComparisonA;







      otherSetter((current) => ({



        ...current,



        [view]: {



          ...nextTransform,



        },



      }));



    }



  }







  function toggleComparisonLock() {



    const nextLocked =



      !comparisonLocked[view];







    setComparisonLocked((current) => ({



      ...current,



      [view]: nextLocked,



    }));







    if (nextLocked) {



      setComparisonB((current) => ({



        ...current,



        [view]: {



          ...comparisonA[view],



        },



      }));



    }



  }







  function resetComparisonView() {



    const reset =



      cloneDefaultComparisonTransform();







    setComparisonA((current) => ({



      ...current,



      [view]: {



        ...reset,



      },



    }));







    setComparisonB((current) => ({



      ...current,



      [view]: {



        ...reset,



      },



    }));



  }

  function addMarkupMark(side: Side, mark: MarkupMark) {
  setMarkup((current) => {
    const next: MarkupState = {
      A: {
        front: [...current.A.front],
        back: [...current.A.back],
      },
      B: {
        front: [...current.B.front],
        back: [...current.B.back],
      },
    };

    next[side][view].push(mark);

    if (comparisonLocked[view] && !isStampTool(mark.tool)) {
      const otherSide: Side = side === "A" ? "B" : "A";

      next[otherSide][view].push({
        ...mark,
        id: createMarkupId(),
      });
    }

    return next;
  });
}

function updateMarkupMark(
  side: Side,
  markId: string,
  patch: Partial<MarkupMark>
) {
  setMarkup((current) => ({
    ...current,
    [side]: {
      ...current[side],
      [view]: current[side][view].map((mark) =>
        mark.id === markId
          ? { ...mark, ...patch }
          : mark
      ),
    },
  }));
}

  function undoMarkup() {
    setMarkup((current) => {
      const next: MarkupState = {
        A: {
          front: [...current.A.front],
          back: [...current.A.back],
        },
        B: {
          front: [...current.B.front],
          back: [...current.B.back],
        },
      };

      if (comparisonLocked[view]) {
        const lastA = next.A[view][next.A[view].length - 1];
        const lastB = next.B[view][next.B[view].length - 1];

        if (lastA && isStampTool(lastA.tool) && (!lastB || !isStampTool(lastB.tool))) {
          next.A[view].pop();
        } else if (lastB && isStampTool(lastB.tool) && (!lastA || !isStampTool(lastA.tool))) {
          next.B[view].pop();
        } else if (lastA && lastB && !isStampTool(lastA.tool) && !isStampTool(lastB.tool)) {
          next.A[view].pop();
          next.B[view].pop();
        } else {
          const aCount = next.A[view].length;
          const bCount = next.B[view].length;
          if (aCount >= bCount && aCount > 0) next.A[view].pop();
          else if (bCount > 0) next.B[view].pop();
        }
      } else {
        const aCount = next.A[view].length;
        const bCount = next.B[view].length;
        if (aCount >= bCount && aCount > 0) next.A[view].pop();
        else if (bCount > 0) next.B[view].pop();
      }

      return next;
    });
  }

  function clearMarkup() {
    setMarkup((current) => ({
      ...current,
      A: { ...current.A, [view]: [] },
      B: { ...current.B, [view]: [] },
    }));
  }

  function changeView(



    nextView: View



  ) {



    setView(nextView);



    setShowAlignment(false);



  }







  async function exportComparison(
    target: "A" | "B" | "side-by-side"
  ) {
    if (exporting) return;

    if (!activeA || !activeB || !currentAlignmentApplied) {
      window.alert("Align both cards before exporting.");
      return;
    }

    setExporting(target);

    try {
      const renderA = () =>
        renderCleanCardExport({
          imageSrc: activeA,
          alignment: activeAlignmentA,
          comparisonTransform: activeComparisonA,
          referenceFrameSize: approvedAlignmentFrame[view],
          marks: markup.A[view],
        });

      const renderB = () =>
        renderCleanCardExport({
          imageSrc: activeB,
          alignment: {
            ...activeAlignmentB,
            orientation: activeAlignmentA.orientation,
            referencePreset: activeAlignmentA.referencePreset,
            referenceWidth: activeAlignmentA.referenceWidth,
            referenceHeight: activeAlignmentA.referenceHeight,
          },
          comparisonTransform: activeComparisonB,
          referenceFrameSize: approvedAlignmentFrame[view],
          marks: markup.B[view],
        });

      if (target === "A") {
        const canvas = await renderA();
        downloadExportCanvas(
          addExportFooter(canvas),
          `tiffanycards-card-a-${view}.png`
        );
        return;
      }

      if (target === "B") {
        const canvas = await renderB();
        downloadExportCanvas(
          addExportFooter(canvas),
          `tiffanycards-card-b-${view}.png`
        );
        return;
      }

      const [canvasA, canvasB] = await Promise.all([renderA(), renderB()]);
      const combined = combineExportCanvases(canvasA, canvasB);

      downloadExportCanvas(
        addExportFooter(combined),
        `tiffanycards-side-by-side-${view}.png`
      );
    } catch (error) {
      console.error("Card comparison export failed:", error);
      window.alert(
        "The export could not be created. If the card was added from an image URL, that website may block direct browser access. Upload the image file directly and try again."
      );
    } finally {
      setExporting(null);
    }
  }


  const activeA =



    view === "front"



      ? cardA.front.src



      : cardA.back.src;







  const activeB =



    view === "front"



      ? cardB.front.src



      : cardB.back.src;







  const activeAlignmentA =



    alignmentA[view];







  const activeAlignmentB =



    alignmentB[view];







  const currentAlignmentApplied =



    alignmentApplied[view];







  const activeComparisonA =



    comparisonA[view];







  const activeComparisonB =



    comparisonB[view];




   async function prepareCardsAlertHandoff(currentSide: Side) {
    if (preparingCardsAlert) return;

    setPreparingCardsAlert(true);

    try {
      async function renderMarkedCard(
        side: Side,
        targetView: View
      ): Promise<File | null> {
        const sourceCard = side === "A" ? cardA : cardB;
        const imageSrc =
          targetView === "front"
            ? sourceCard.front.src
            : sourceCard.back.src;

        if (!imageSrc) return null;

        const alignmentForA = alignmentA[targetView];
        const alignmentForB = alignmentB[targetView];

        const comparisonForSide =
          side === "A"
            ? comparisonA[targetView]
            : comparisonB[targetView];

        const alignmentForSide =
          side === "A"
            ? alignmentForA
            : {
                ...alignmentForB,
                orientation: alignmentForA.orientation,
                referencePreset: alignmentForA.referencePreset,
                referenceWidth: alignmentForA.referenceWidth,
                referenceHeight: alignmentForA.referenceHeight,
              };

        const canvas = await renderCleanCardExport({
          imageSrc,
          alignment: alignmentForSide,
          comparisonTransform: comparisonForSide,
          referenceFrameSize:
            approvedAlignmentFrame[targetView],
          marks: markup[side][targetView],
        });

        return canvasToPngFile(
          addExportFooter(canvas),
          `tiffanycards-card-${side.toLowerCase()}-${targetView}-marked.png`
        );
      }

      const [
        markedAFront,
        markedABack,
        markedBFront,
        markedBBack,
      ] = await Promise.all([
        renderMarkedCard("A", "front"),
        renderMarkedCard("A", "back"),
        renderMarkedCard("B", "front"),
        renderMarkedCard("B", "back"),
      ]);

      const currentCard =
        currentSide === "A" ? cardA : cardB;

      const previousCard =
        currentSide === "A" ? cardB : cardA;

      const currentMarkedFront =
        currentSide === "A"
          ? markedAFront
          : markedBFront;

      const currentMarkedBack =
        currentSide === "A"
          ? markedABack
          : markedBBack;

      const previousMarkedFront =
        currentSide === "A"
          ? markedBFront
          : markedAFront;

      const previousMarkedBack =
        currentSide === "A"
          ? markedBBack
          : markedABack;

      setCardsAlertHandoff({
        source: "card-comparison",
        currentSide,

        current: {
          frontSrc: currentCard.front.src,
          backSrc: currentCard.back.src,
          markedFrontFile: currentMarkedFront,
          markedBackFile: currentMarkedBack,
        },

        previous: {
          frontSrc: previousCard.front.src,
          backSrc: previousCard.back.src,
          markedFrontFile: previousMarkedFront,
          markedBackFile: previousMarkedBack,
        },

        description:
          "Comparison created using the TiffanyCards.com Card Comparison Tool.",
      });

      setShowCardsAlertChoice(false);
      setShowCardsAlertModal(true);
    } catch (error) {
      console.error(
        "Cards Alert comparison handoff failed:",
        error
      );

      window.alert(
        "The comparison images could not be prepared for Cards Alert. If an image was added from an external URL, that website may block direct browser access. Try uploading the image file directly."
      );
    } finally {
      setPreparingCardsAlert(false);
    }
  }


  const currentComparisonLocked =



    comparisonLocked[view];







  const hasAnyImage =



    Boolean(cardA.front.src) ||



    Boolean(cardA.back.src) ||



    Boolean(cardB.front.src) ||



    Boolean(cardB.back.src);







  const canAlignCurrentView =



    Boolean(activeA) &&



    Boolean(activeB);







  return (



    <section className="bg-black px-3 pb-12 pt-4 text-white md:px-6 md:pb-16 md:pt-5">



      <div className="mx-auto max-w-7xl">







        {/* CARD INPUTS */}



        <div className="grid grid-cols-2 gap-3 md:gap-4">



          <CardPanel



            title="Card A"



            images={cardA}



            onUpload={(imageSide, event) =>



              handleUpload(



                "A",



                imageSide,



                event



              )



            }



            onUrl={(imageSide, url) =>



              handleUrl(



                "A",



                imageSide,



                url



              )



            }



            onRemove={(imageSide) =>



              removeImage(



                "A",



                imageSide



              )



            }



          />







          <CardPanel



            title="Card B"



            images={cardB}



            onUpload={(imageSide, event) =>



              handleUpload(



                "B",



                imageSide,



                event



              )



            }



            onUrl={(imageSide, url) =>



              handleUrl(



                "B",



                imageSide,



                url



              )



            }



            onRemove={(imageSide) =>



              removeImage(



                "B",



                imageSide



              )



            }



          />



        </div>







        {/* COMPARISON WORKSPACE */}



        {hasAnyImage && (



          <div className="mt-8 overflow-hidden rounded-xl border border-purple-800/70 bg-[#0b0b0d]">







            {/* WORKSPACE TOOLBAR */}



            <div className="flex flex-col gap-4 border-b border-neutral-800 p-4 xl:flex-row xl:items-center xl:justify-between">







              <div>



                <div className="text-sm font-black uppercase tracking-widest text-purple-300">



                  Comparison Workspace



                </div>







                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">



                  <span>



                    Viewing{" "}



                    <span className="font-bold text-purple-300">



                      {view === "front"



                        ? "Front"



                        : "Back"}



                    </span>



                  </span>







                  {canAlignCurrentView && (



                    <AlignmentStatus



                      applied={



                        currentAlignmentApplied



                      }



                    />



                  )}



                </div>



              </div>







              <div className="flex flex-wrap items-center gap-2">







                {canAlignCurrentView && currentAlignmentApplied && (

                  <>

                    <button

                      type="button"

                      onClick={() => setComparisonMode("side-by-side")}

                      aria-pressed={comparisonMode === "side-by-side"}

                      className={`rounded border px-4 py-2.5 text-xs font-black uppercase tracking-wider transition ${

                        comparisonMode === "side-by-side"

                          ? "border-purple-400 bg-purple-600 text-white"

                          : "border-neutral-700 bg-black text-purple-300 hover:border-purple-500"

                      }`}

                    >

                      Side-by-Side

                    </button>



                    <button

                      type="button"

                      onClick={() => setComparisonMode("overlay")}

                      aria-pressed={comparisonMode === "overlay"}

                      className={`rounded border px-4 py-2.5 text-xs font-black uppercase tracking-wider transition ${

                        comparisonMode === "overlay"

                          ? "border-purple-400 bg-purple-600 text-white"

                          : "border-neutral-700 bg-black text-purple-300 hover:border-purple-500"

                      }`}

                    >

                      Opacity Overlay

                    </button>

                    <button
                      type="button"
                      onClick={() => setComparisonMode("swipe")}
                      aria-pressed={comparisonMode === "swipe"}
                      className={`rounded border px-4 py-2.5 text-xs font-black uppercase tracking-wider transition ${
                        comparisonMode === "swipe"
                          ? "border-purple-400 bg-purple-600 text-white"
                          : "border-neutral-700 bg-black text-purple-300 hover:border-purple-500"
                      }`}
                    >
                      Before / After Swipe
                    </button>

                  </>

                )}



                <button



                  type="button"



                  onClick={() =>



                    changeView("front")



                  }



                  aria-pressed={



                    view === "front"



                  }



                  className={`min-w-[82px] rounded border px-5 py-2.5 text-xs font-black uppercase tracking-wider transition ${



                    view === "front"



                      ? "border-purple-400 bg-purple-600 text-white"



                      : "border-neutral-700 bg-black text-purple-300 hover:border-purple-500"



                  }`}



                >



                  Front



                </button>







                <button



                  type="button"



                  onClick={() =>



                    changeView("back")



                  }



                  aria-pressed={



                    view === "back"



                  }



                  className={`min-w-[82px] rounded border px-5 py-2.5 text-xs font-black uppercase tracking-wider transition ${



                    view === "back"



                      ? "border-purple-400 bg-purple-600 text-white"



                      : "border-neutral-700 bg-black text-purple-300 hover:border-purple-500"



                  }`}



                >



                  Back



                </button>







                {canAlignCurrentView &&



                  currentAlignmentApplied && (



                    <>



                      <button



                        type="button"



                        onClick={



                          toggleComparisonLock



                        }



                        aria-pressed={



                          currentComparisonLocked



                        }



                        className={`rounded border px-5 py-2.5 text-xs font-black uppercase tracking-wider transition ${



                          currentComparisonLocked



                            ? "border-green-600 bg-green-950/40 text-green-300 hover:bg-green-950/70"



                            : "border-yellow-700 bg-yellow-950/30 text-yellow-300 hover:bg-yellow-950/50"



                        }`}



                      >



                        {currentComparisonLocked



                          ? "A + B Locked"



                          : "A + B Unlocked"}



                      </button>







                      <button



                        type="button"



                        onClick={



                          resetComparisonView



                        }



                        className="rounded border border-neutral-700 bg-black px-5 py-2.5 text-xs font-black uppercase tracking-wider text-neutral-300 transition hover:border-purple-500 hover:text-purple-300"



                      >



                        Reset View



                      </button>



                    </>



                  )}







                {canAlignCurrentView && (



                  <button



                    type="button"



                    onClick={



                      openAlignment



                    }



                    className="rounded border border-purple-400 bg-purple-950/60 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-purple-200 transition hover:bg-purple-900/70"



                  >



                    {currentAlignmentApplied



                      ? "Adjust Alignment"



                      : "Align Cards"}



                  </button>



                )}



              </div>



            </div>

            {canAlignCurrentView && currentAlignmentApplied && !showAlignment && (
              <MarkupToolbar
                tool={markupTool}
                color={markupColor}
                markCount={markup.A[view].length + markup.B[view].length}
                locked={currentComparisonLocked}
                onToolChange={setMarkupTool}
                onColorChange={setMarkupColor}
                onUndo={undoMarkup}
                onClear={clearMarkup}
              />
            )}







            {/* ALIGNMENT WORKSPACE */}

            {showAlignment && activeA && activeB ? (
              <div>
                {alignmentStep === "card-a" ? (
                  <>
                    <div className="border-b border-neutral-800 bg-purple-950/20 px-4 py-5 text-center">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400">Alignment Step 1 of 2</div>
                      <div className="mt-1 text-lg font-black uppercase tracking-wider text-white">Align Card A Reference</div>
                      <p className="mx-auto mt-2 max-w-3xl text-xs leading-5 text-neutral-400">
                        Card A establishes the reference frame. Align its actual card edges first, then lock it as the reference for Card B.
                      </p>
                    </div>

                    <div className="mx-auto w-full max-w-6xl border-x border-neutral-800">
                      <CardAlignment
                        title={`Card A ${view === "front" ? "Front" : "Back"}`}
                        image={activeA}
                        value={activeAlignmentA}
                        onChange={(value) => updateAlignment("A", view, withPerspective(value))}
                      />
                    </div>

                    <div className="border-t border-neutral-800 bg-[#0d0d0f] p-4">
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <button type="button" onClick={cancelAlignment} className="rounded border border-neutral-700 bg-black px-5 py-3 text-xs font-black uppercase tracking-wider text-neutral-300 transition hover:border-neutral-500">Cancel</button>
                        <button type="button" onClick={setCardAReference} className="rounded border border-purple-400 bg-purple-600 px-6 py-3 text-xs font-black uppercase tracking-wider text-white transition hover:bg-purple-500">Set Card A Reference</button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="border-b border-neutral-800 bg-purple-950/20 px-4 py-5 text-center">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400">Alignment Step 2 of 2</div>
                      <div className="mt-1 text-lg font-black uppercase tracking-wider text-white">Overlay & Align Card B</div>
                      <p className="mx-auto mt-2 max-w-3xl text-xs leading-5 text-neutral-400">
                        Card A is locked as the reference. Adjust Card B only until its borders and details register with Card A.
                      </p>
                    </div>

                    <OverlayAlignmentEditor
                      imageA={activeA}
                      imageB={activeB}
                      view={view}
                      alignmentA={activeAlignmentA}
                      alignmentB={activeAlignmentB}
                      opacity={overlayOpacity}
                      onOpacityChange={setOverlayOpacity}
                      onAlignmentBChange={(value) => updateAlignment("B", view, value)}
                      onFrameSizeChange={setWorkingAlignmentFrame}
                    />

                    <div className="border-t border-neutral-800 bg-[#0d0d0f] p-4">
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <button type="button" onClick={backToCardAReference} className="rounded border border-neutral-700 bg-black px-5 py-3 text-xs font-black uppercase tracking-wider text-neutral-300 transition hover:border-purple-500">Back to Card A</button>
                        <button type="button" onClick={cancelAlignment} className="rounded border border-neutral-700 bg-black px-5 py-3 text-xs font-black uppercase tracking-wider text-neutral-300 transition hover:border-neutral-500">Cancel</button>
                        <button type="button" onClick={applyAlignment} className="rounded border border-purple-400 bg-purple-600 px-6 py-3 text-xs font-black uppercase tracking-wider text-white transition hover:bg-purple-500">Apply Alignment</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* VIEWERS */}



                {comparisonMode === "overlay" &&

                currentAlignmentApplied &&

                activeA &&

                activeB ? (

                  <OverlayComparisonViewer

                    imageA={activeA}

                    imageB={activeB}

                    view={view}

                    alignmentA={activeAlignmentA}

                    alignmentB={activeAlignmentB}

                    comparisonTransform={activeComparisonA}

                    referenceFrameSize={approvedAlignmentFrame[view]}

                    opacity={overlayOpacity}

                    onOpacityChange={setOverlayOpacity}

                    onComparisonChange={(nextTransform) =>

                      updateComparisonTransform("A", nextTransform)

                    }

                  />

                ) : comparisonMode === "swipe" &&
                  currentAlignmentApplied &&
                  activeA &&
                  activeB ? (
                  <SwipeComparisonViewer
                    imageA={activeA}
                    imageB={activeB}
                    view={view}
                    alignmentA={activeAlignmentA}
                    alignmentB={activeAlignmentB}
                    comparisonTransform={activeComparisonA}
                    referenceFrameSize={approvedAlignmentFrame[view]}
                    onComparisonChange={(nextTransform) =>
                      updateComparisonTransform("A", nextTransform)
                    }
                  />
                ) : (

                  <div className="grid grid-cols-2 gap-px bg-neutral-800">

                    <CardViewer

                      title="Card A"

                      image={activeA}

                      view={view}

                      alignment={activeAlignmentA}

                      normalized={currentAlignmentApplied && Boolean(activeA)}

                      comparisonTransform={activeComparisonA}

                      comparisonLocked={currentComparisonLocked}

                      referenceFrameSize={approvedAlignmentFrame[view]}
                      markupTool={markupTool}
                      markupColor={markupColor}
                      marks={markup.A[view]}
                      onMarkupAdd={(mark) => addMarkupMark("A", mark)}
onMarkupUpdate={(markId, patch) =>
  updateMarkupMark("A", markId, patch)
}

                      onComparisonChange={(nextTransform) =>

                        updateComparisonTransform("A", nextTransform)

                      }

                    />



                    <CardViewer

                      title="Card B"

                      image={activeB}

                      view={view}

                      alignment={{
                        ...activeAlignmentB,
                        orientation: activeAlignmentA.orientation,
                        referencePreset: activeAlignmentA.referencePreset,
                        referenceWidth: activeAlignmentA.referenceWidth,
                        referenceHeight: activeAlignmentA.referenceHeight,
                      }}

                      normalized={currentAlignmentApplied && Boolean(activeB)}

                      comparisonTransform={activeComparisonB}

                      comparisonLocked={currentComparisonLocked}

                      referenceFrameSize={approvedAlignmentFrame[view]}
                      markupTool={markupTool}
                      markupColor={markupColor}
                      marks={markup.B[view]}
                      onMarkupAdd={(mark) => addMarkupMark("B", mark)}
onMarkupUpdate={(markId, patch) =>
  updateMarkupMark("B", markId, patch)
}

                      onComparisonChange={(nextTransform) =>

                        updateComparisonTransform("B", nextTransform)

                      }

                    />

                  </div>

                )}



                {currentAlignmentApplied && activeA && activeB && (
                  <div className="border-t border-purple-900/50 bg-[#0d0d10] px-4 py-4">
                    <div className="mx-auto flex max-w-5xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-xs font-black uppercase tracking-widest text-purple-300">
                          Export Comparison
                        </div>
                        <div className="mt-1 text-[10px] uppercase tracking-wider text-neutral-500">
                          Creates a new PNG • Originals are never changed
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => exportComparison("A")}
                          disabled={Boolean(exporting) || comparisonMode !== "side-by-side"}
                          className="rounded border border-purple-700 bg-black px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-purple-300 transition hover:border-purple-400 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          {exporting === "A" ? "Creating..." : "Export Card A"}
                        </button>

                        <button
                          type="button"
                          onClick={() => exportComparison("B")}
                          disabled={Boolean(exporting) || comparisonMode !== "side-by-side"}
                          className="rounded border border-purple-700 bg-black px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-purple-300 transition hover:border-purple-400 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          {exporting === "B" ? "Creating..." : "Export Card B"}
                        </button>

                        <button
                          type="button"
                          onClick={() => exportComparison("side-by-side")}
                          disabled={Boolean(exporting) || comparisonMode !== "side-by-side"}
                          className="rounded border border-purple-400 bg-purple-600 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          {exporting === "side-by-side"
                            ? "Creating..."
                            : "Export Side-by-Side"}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setCardsAlertCurrentSide(null);
                            setShowCardsAlertChoice(true);
                          }}
                          disabled={
                            Boolean(exporting) ||
                            comparisonMode !== "side-by-side"
                          }
                          className="rounded border border-red-400 bg-red-600 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-white transition hover:border-red-300 hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          Report to Cards Alert
                        </button>

                                            </div>

                      <ContributionModal
                        open={showCardsAlertModal}
                        onClose={() => {
                          setShowCardsAlertModal(false);
                          setCardsAlertCurrentSide(null);
                        }}
                        project="cards-alert"
                        projectLabel="Cards Alert"
                        mode="new"
                        sports={sports}
                        reasons={reasons}
                        activeObject={{
  id: "cards-alert-main-page",
  title: "Cards Alert Main Page",
  source: "card-comparison",
  currentSide: cardsAlertCurrentSide,
  comparisonHandoff: cardsAlertHandoff,
}}
                      />


                      {showCardsAlertChoice && (
                        <div
                          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
                          onClick={() => setShowCardsAlertChoice(false)}
                        >
                          <div
                            className="w-full max-w-2xl rounded-lg border border-red-700 bg-[#0a0a0a] p-5 shadow-2xl"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <div className="text-center">
                              <div className="text-xs font-black uppercase tracking-[0.18em] text-red-500">
                                Cards Alert
                              </div>

                              <h3 className="mt-1 text-xl font-black uppercase text-white">
                                Which card is the current card?
                              </h3>

                              <p className="mx-auto mt-2 max-w-lg text-xs text-neutral-400">
                                Select the card in its current condition. The other
                                card will be treated as the previous or comparison
                                card.
                              </p>
                            </div>

                            <div className="mt-5 grid grid-cols-2 gap-3">
                              {(["A", "B"] as Side[]).map((side) => {
                                const card = side === "A" ? cardA : cardB;
                                const preview =
                                  card.front.src || card.back.src;

                                const selected =
                                  cardsAlertCurrentSide === side;

                                return (
                                  <button
                                    key={side}
                                    type="button"
                                    onClick={() =>
                                      setCardsAlertCurrentSide(side)
                                    }
                                    className={`overflow-hidden rounded-lg border-2 p-3 text-center transition ${
                                      selected
                                        ? "border-red-400 bg-red-950/40 ring-2 ring-red-500/30"
                                        : "border-neutral-800 bg-black hover:border-red-800"
                                    }`}
                                  >
                                    <div className="mb-2 text-xs font-black uppercase tracking-wider text-white">
                                      Card {side}
                                    </div>

                                    <div className="flex h-48 items-center justify-center overflow-hidden rounded border border-neutral-800 bg-[#050505]">
                                      {preview ? (
                                        <img
                                          src={preview}
                                          alt={`Card ${side}`}
                                          className="h-full w-full object-contain"
                                        />
                                      ) : (
                                        <span className="text-xs font-bold uppercase text-neutral-600">
                                          No Image
                                        </span>
                                      )}
                                    </div>

                                    <div
                                      className={`mt-3 rounded px-3 py-2 text-[10px] font-black uppercase tracking-wider ${
                                        selected
                                          ? "bg-red-600 text-white"
                                          : "bg-neutral-900 text-neutral-400"
                                      }`}
                                    >
                                      {selected
                                        ? "Current Card Selected"
                                        : `Select Card ${side}`}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>

                            <div className="mt-5 flex items-center justify-end gap-2 border-t border-neutral-800 pt-4">
                              <button
                                type="button"
                                onClick={() => {
                                  setCardsAlertCurrentSide(null);
                                  setShowCardsAlertChoice(false);
                                }}
                                className="rounded border border-neutral-700 bg-black px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-neutral-300 transition hover:border-neutral-500 hover:text-white"
                              >
                                Cancel
                              </button>

                              <button
                                type="button"
                                disabled={!cardsAlertCurrentSide || preparingCardsAlert}
                                onClick={() => {
  if (!cardsAlertCurrentSide) return;
  void prepareCardsAlertHandoff(cardsAlertCurrentSide);
}}
                                className="rounded border border-red-400 bg-red-600 px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-35"
                              >
                                {preparingCardsAlert
  ? "Preparing Images..."
  : "Continue to Cards Alert"}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {comparisonMode !== "side-by-side" && (
                      <div className="mx-auto mt-3 max-w-5xl text-[10px] font-bold uppercase tracking-wider text-neutral-600">
                        Switch to Side-by-Side to export the marked card images.
                      </div>
                    )}
                  </div>
                )}

                {canAlignCurrentView &&



                  !currentAlignmentApplied && (



                    <div className="border-t border-purple-900/60 bg-purple-950/20 px-4 py-4 text-center">



                      <div className="text-xs font-black uppercase tracking-wider text-purple-300">



                        Card sizes have not been



                        normalized yet



                      </div>







                      <p className="mx-auto mt-1 max-w-2xl text-[11px] leading-5 text-neutral-400">



                        Align both cards before



                        comparing details so the



                        actual card boundaries are



                        displayed at matching



                        dimensions.



                      </p>







                      <button



                        type="button"



                        onClick={



                          openAlignment



                        }



                        className="mt-3 rounded border border-purple-400 bg-purple-600 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-purple-500"



                      >



                        Align Cards



                      </button>



                    </div>



                  )}



              </>



            )}



          </div>



        )}







        <div className="mt-7 text-center text-xs leading-5 text-neutral-500">
          Images are used in your browser while comparing cards. Original uploaded images
          are never overwritten.
        </div>

        <div className="mx-auto mt-5 max-w-4xl border-t border-neutral-800 pt-5 text-center text-[11px] leading-5 text-neutral-600">
  <span className="font-bold text-neutral-500">Disclaimer:</span>{" "}
  Image comparisons are provided for educational and illustrative purposes only.
  Any annotations, labels, or conclusions reflect the opinions of the user who
  created the comparison and should not be considered authentication or a
  definitive determination of a card&apos;s condition, authenticity, or alteration
  status. Image quality, resolution, lighting, scanner or camera settings,
  compression, and other image-processing factors may affect how a card appears
  and may create or obscure apparent differences between images. Opinions may
  vary based on the images, information, and individual perspectives available.
</div>







      </div>



    </section>



  );



}







function MarkupToolbar({
  tool,
  color,
  markCount,
  locked,
  onToolChange,
  onColorChange,
  onUndo,
  onClear,
}: {
  tool: MarkupTool;
  color: MarkupColor;
  markCount: number;
  locked: boolean;
  onToolChange: (tool: MarkupTool) => void;
  onColorChange: (color: MarkupColor) => void;
  onUndo: () => void;
  onClear: () => void;
}) {
  const tools: Array<{ value: MarkupTool; label: string }> = [
    { value: "pan", label: "Pan / Zoom" },
    { value: "select", label: "Select / Resize" },
    { value: "draw", label: "Draw" },
    { value: "circle", label: "Circle" },
    { value: "rectangle", label: "Rectangle" },
    { value: "triangle", label: "Triangle" },
    { value: "arrow", label: "Arrow" },
  ];

  const colors: Array<{ value: MarkupColor; label: string; swatch: string }> = [
    { value: "yellow", label: "Similarity", swatch: "bg-yellow-400" },
    { value: "red", label: "Difference", swatch: "bg-red-500" },
    { value: "blue", label: "Other", swatch: "bg-blue-500" },
  ];

  return (
    <div className="border-b border-purple-900/50 bg-[#0d0d10] px-4 py-4">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-purple-300">
              Markup Tools
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-wider text-neutral-500">
              {locked
                ? "A + B locked • New marks mirror to both cards"
                : "A + B unlocked • Marks apply only to the card you draw on"}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {tools.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => onToolChange(item.value)}
                aria-pressed={tool === item.value}
                className={`rounded border px-3 py-2 text-[10px] font-black uppercase tracking-wider transition ${
                  tool === item.value
                    ? "border-purple-400 bg-purple-600 text-white"
                    : "border-neutral-700 bg-black text-neutral-300 hover:border-purple-500"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[9px] font-black uppercase tracking-wider text-neutral-500">
                Stamps
              </span>
              {[
                { value: "original", label: "Original", green: true },
                { value: "authentic", label: "Authentic", green: true },
                { value: "altered", label: "Altered", green: false },
                { value: "fake", label: "Fake", green: false },
              ].map((stamp) => {
                const selected = tool === stamp.value;
                return (
                  <button
                    key={stamp.value}
                    type="button"
                    onClick={() => onToolChange(stamp.value as MarkupTool)}
                    className={`rounded border px-3 py-2 text-[10px] font-black uppercase tracking-wider transition ${
                      selected
                        ? stamp.green
                          ? "border-green-300 bg-green-600 text-white"
                          : "border-red-300 bg-red-600 text-white"
                        : stamp.green
                          ? "border-green-900 bg-black text-green-400 hover:border-green-500"
                          : "border-red-900 bg-black text-red-400 hover:border-red-500"
                    }`}
                  >
                    {stamp.label}
                  </button>
                );
              })}
            </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-800 pt-3">
          <span className="mr-1 text-[10px] font-black uppercase tracking-wider text-neutral-500">
            Evidence Color
          </span>

          {colors.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onColorChange(item.value)}
              aria-pressed={color === item.value}
              className={`flex items-center gap-2 rounded border px-3 py-2 text-[10px] font-black uppercase tracking-wider transition ${
                color === item.value
                  ? "border-white/70 bg-neutral-900 text-white"
                  : "border-neutral-700 bg-black text-neutral-400 hover:border-neutral-500"
              }`}
            >
              <span className={`h-3 w-3 rounded-full ${item.swatch}`} />
              {item.label}
            </button>
          ))}

          <div className="mx-2 hidden h-8 w-px bg-neutral-700 md:block" />

          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-600">
            {markCount} {markCount === 1 ? "mark" : "marks"}
          </span>

          <button
            type="button"
            onClick={onUndo}
            disabled={markCount === 0}
            className="rounded border border-neutral-700 bg-black px-3 py-2 text-[10px] font-black uppercase tracking-wider text-neutral-300 transition hover:border-purple-500 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Undo
          </button>

          <button
            type="button"
            onClick={onClear}
            disabled={markCount === 0}
            className="rounded border border-red-900/70 bg-black px-3 py-2 text-[10px] font-black uppercase tracking-wider text-red-400 transition hover:border-red-600 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Clear Marks
          </button>
        </div>
      </div>
    </div>
  );
}


function AlignmentStatus({



  applied,



}: {



  applied: boolean;



}) {



  return (



    <span



      className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-wider ${



        applied



          ? "border-green-800 bg-green-950/40 text-green-300"



          : "border-yellow-800 bg-yellow-950/30 text-yellow-300"



      }`}



    >



      {applied



        ? "Aligned"



        : "Needs Alignment"}



    </span>



  );



}







function CardPanel({



  title,



  images,



  onUpload,



  onUrl,



  onRemove,



}: {



  title: string;



  images: CardImages;







  onUpload: (



    imageSide: View,



    event: ChangeEvent<HTMLInputElement>



  ) => void;







  onUrl: (



    imageSide: View,



    url: string



  ) => void;







  onRemove: (



    imageSide: View



  ) => void;



}) {



  return (



    <div className="rounded-xl border border-purple-900/80 bg-[#111113] p-3 md:p-4">







      <div className="mb-3 flex items-center justify-between">



        <h3 className="text-sm font-black uppercase tracking-wider text-white md:text-base">



          {title}



        </h3>







        <span className="rounded-full border border-purple-800 bg-purple-950/50 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-purple-300 md:text-[9px]">



          Add a Card



        </span>



      </div>







      <div className="grid grid-cols-2 gap-2">







        <ImageSlot



          label="Front"



          image={images.front}



          onUpload={(event) =>



            onUpload(



              "front",



              event



            )



          }



          onUrl={(url) =>



            onUrl(



              "front",



              url



            )



          }



          onRemove={() =>



            onRemove("front")



          }



        />







        <ImageSlot



          label="Back"



          image={images.back}



          onUpload={(event) =>



            onUpload(



              "back",



              event



            )



          }



          onUrl={(url) =>



            onUrl(



              "back",



              url



            )



          }



          onRemove={() =>



            onRemove("back")



          }



        />







      </div>



    </div>



  );



}







function ImageSlot({



  label,



  image,



  onUpload,



  onUrl,



  onRemove,



}: {



  label: string;



  image: CardImage;







  onUpload: (



    event: ChangeEvent<HTMLInputElement>



  ) => void;







  onUrl: (



    url: string



  ) => void;







  onRemove: () => void;



}) {



  const [urlInput, setUrlInput] =



    useState("");







  const [showUrl, setShowUrl] =



    useState(false);







  function submitUrl() {



    const cleanUrl =



      urlInput.trim();







    if (!cleanUrl) {



      return;



    }







    onUrl(cleanUrl);







    setUrlInput("");



    setShowUrl(false);



  }







  return (



    <div className="overflow-hidden rounded-lg border border-neutral-700 bg-black">







      <div className="border-b border-neutral-800 px-3 py-2 text-center text-xs font-black uppercase tracking-widest text-neutral-300">



        {label}



      </div>







      {image.src ? (



        <>



          <div className="flex h-32 items-center justify-center bg-[#080808] p-2 md:h-36">



            <img



              src={image.src}



              alt={`${label} card`}



              draggable={false}



              className="h-full w-full select-none object-contain"



            />



          </div>







          <div className="border-t border-neutral-800 p-2">







            <div className="grid grid-cols-3 gap-2">







              <label className="cursor-pointer rounded border border-neutral-700 bg-[#151517] px-2 py-2 text-center text-[10px] font-black uppercase text-purple-300 transition hover:border-purple-600">



                Upload







                <input



                  type="file"



                  accept="image/\\*"



                  className="hidden"



                  onChange={onUpload}



                />



              </label>







              <button



                type="button"



                onClick={() =>



                  setShowUrl(



                    (current) =>



                      !current



                  )



                }



                className="rounded border border-neutral-700 bg-[#151517] px-2 py-2 text-[10px] font-black uppercase text-purple-300 transition hover:border-purple-600"



              >



                URL



              </button>







              <button



                type="button"



                onClick={onRemove}



                className="rounded border border-neutral-700 bg-[#151517] px-2 py-2 text-[10px] font-black uppercase text-red-400 transition hover:border-red-800"



              >



                Remove



              </button>







            </div>







            {showUrl && (



              <UrlInput



                value={urlInput}



                onChange={setUrlInput}



                onSubmit={submitUrl}



              />



            )}







          </div>



        </>



      ) : (



        <div className="p-3">







          <div className="flex h-20 items-center justify-center md:h-24">



            <div className="text-center">







              <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-purple-600 text-base text-purple-300">



                +



              </div>







              <div className="mt-2 text-[9px] font-black uppercase tracking-wider text-white md:text-[10px]">



                Add {label}



              </div>







            </div>



          </div>







          <div className="grid grid-cols-2 gap-2">







            <label className="cursor-pointer rounded border border-purple-800 bg-purple-950/30 px-2 py-2 text-center text-[8px] font-black uppercase tracking-wider text-purple-300 transition hover:bg-purple-950/60 md:text-[9px]">



              Upload Image







              <input



                type="file"



                accept="image/\\*"



                className="hidden"



                onChange={onUpload}



              />



            </label>







            <button



              type="button"



              onClick={() =>



                setShowUrl(



                  (current) =>



                    !current



                )



              }



              className="rounded border border-purple-800 bg-purple-950/30 px-2 py-2 text-[8px] font-black uppercase tracking-wider text-purple-300 transition hover:bg-purple-950/60 md:text-[9px]"



            >



              Image URL



            </button>







          </div>







          {showUrl && (



            <UrlInput



              value={urlInput}



              onChange={setUrlInput}



              onSubmit={submitUrl}



            />



          )}







        </div>



      )}







    </div>



  );



}







function UrlInput({



  value,



  onChange,



  onSubmit,



}: {



  value: string;







  onChange: (



    value: string



  ) => void;







  onSubmit: () => void;



}) {



  return (



    <div className="mt-2 flex gap-2">







      <input



        type="url"



        value={value}



        onChange={(event) =>



          onChange(



            event.target.value



          )



        }



        onKeyDown={(event) => {



          if (



            event.key === "Enter"



          ) {



            event.preventDefault();



            onSubmit();



          }



        }}



        placeholder="Paste image URL..."



        className="min-w-0 flex-1 rounded border border-neutral-700 bg-black px-3 py-2 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-purple-500"



      />







      <button



        type="button"



        onClick={onSubmit}



        className="rounded bg-purple-600 px-3 py-2 text-[10px] font-black uppercase text-white transition hover:bg-purple-500"



      >



        Add



      </button>







    </div>



  );



}







function useFrameSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setSize({ width: element.clientWidth, height: element.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

function CardViewer({

  title,

  image,

  view,

  alignment,

  normalized,

  comparisonTransform,

  comparisonLocked,

  referenceFrameSize,
  markupTool = "pan",
  markupColor = "yellow",
    marks = [],
  onMarkupAdd = () => {},
  onMarkupUpdate = () => {},

  onComparisonChange,

}: {

  title: string;

  image: string | null;

  view: View;

  alignment: CardAlignmentTransform;

  normalized: boolean;

  comparisonTransform?: ComparisonTransform;

  comparisonLocked?: boolean;

  referenceFrameSize?: AlignmentFrameSize | null;
  markupTool?: MarkupTool;
  markupColor?: MarkupColor;
    marks?: MarkupMark[];
  onMarkupAdd?: (mark: MarkupMark) => void;
  onMarkupUpdate?: (
    markId: string,
    patch: Partial<MarkupMark>
  ) => void;

  onComparisonChange?: (

    value: ComparisonTransform

  ) => void;

}) {

  const safeComparisonTransform =

    comparisonTransform ??

    cloneDefaultComparisonTransform();



  const safeComparisonLocked =

    comparisonLocked ?? true;



  const safeOnComparisonChange =

    onComparisonChange ??

    (() => {});



  const referenceWidth =
    alignment.referenceWidth ||
    (alignment.orientation === "portrait" ? 2.5 : 3.5);
  const referenceHeight =
    alignment.referenceHeight ||
    (alignment.orientation === "portrait" ? 3.5 : 2.5);
  const frameAspect = `${referenceWidth} / ${referenceHeight}`;



  return (

    <div className="bg-black">

      <div className="border-b border-neutral-800 px-4 py-3 text-center">

        <div className="text-sm font-black uppercase tracking-wider text-white">

          {title}

        </div>



        <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-purple-400">

          <span>

            {view === "front"

              ? "Front"

              : "Back"}

          </span>



          {normalized && (

            <span className="rounded-full border border-green-900 bg-green-950/40 px-2 py-0.5 text-[8px] text-green-300">

              Normalized

            </span>

          )}



          {normalized && (

            <span

              className={`rounded-full border px-2 py-0.5 text-[8px] ${

                safeComparisonLocked

                  ? "border-green-900 bg-green-950/40 text-green-300"

                  : "border-yellow-900 bg-yellow-950/30 text-yellow-300"

              }`}

            >

              {safeComparisonLocked

                ? "Locked"

                : "Independent"}

            </span>

          )}

        </div>

      </div>



      <div className="flex min-h-[460px] items-center justify-center overflow-hidden bg-[#050505] p-4 md:min-h-[600px]">

        {image ? (

          normalized ? (

            <NormalizedCardImage

              key={`${title}-${view}-${image}`}

              image={image}

              title={title}

              view={view}

              alignment={alignment}

              frameAspect={

                frameAspect

              }

              comparisonTransform={

                safeComparisonTransform

              }

              referenceFrameSize={referenceFrameSize}
              markupTool={markupTool}
markupColor={markupColor}
marks={marks}
onMarkupAdd={onMarkupAdd}
onMarkupUpdate={onMarkupUpdate}

              onComparisonChange={

                safeOnComparisonChange

              }

            />

          ) : (

            <img

              key={`${title}-${view}-${image}`}

              src={image}

              alt={`${title} ${view}`}

              draggable={false}

              className="max-h-[570px] max-w-full select-none object-contain"

            />

          )

        ) : (

          <div className="px-6 text-center">

            <div className="text-4xl text-neutral-800">

              +

            </div>



            <div className="mt-3 text-xs font-black uppercase tracking-wider text-neutral-600">

              No {view} image

            </div>

          </div>

        )}

      </div>

    </div>

  );

}



function NormalizedCardImage({

  image,

  title,

  view,

  alignment,

  frameAspect,

  comparisonTransform,

  referenceFrameSize,
  markupTool,
    markupColor,
  marks,
  onMarkupAdd,
  onMarkupUpdate,

  onComparisonChange,

}: {

  image: string;

  title: string;

  view: View;

  alignment: CardAlignmentTransform;

  frameAspect: string;

  comparisonTransform: ComparisonTransform;

  referenceFrameSize?: AlignmentFrameSize | null;
  markupTool: MarkupTool;
    markupColor: MarkupColor;
  marks: MarkupMark[];
  onMarkupAdd: (mark: MarkupMark) => void;
  onMarkupUpdate: (
    markId: string,
    patch: Partial<MarkupMark>
  ) => void;

  onComparisonChange: (

    value: ComparisonTransform

  ) => void;

}) {

  const frameRef =

    useRef<HTMLDivElement | null>(null);

  const frameSize = useFrameSize(frameRef);

  const alignmentX = referenceFrameSize?.width
    ? alignment.x * (frameSize.width / referenceFrameSize.width)
    : alignment.x;

  const alignmentY = referenceFrameSize?.height
    ? alignment.y * (frameSize.height / referenceFrameSize.height)
    : alignment.y;



  const transformRef =

    useRef(comparisonTransform);



  const onChangeRef =

    useRef(onComparisonChange);



  const dragRef = useRef<{

    pointerId: number;

    startX: number;

    startY: number;

    originX: number;

    originY: number;

  } | null>(null);



  const pointersRef =

    useRef(

      new Map<

        number,

        {

          x: number;

          y: number;

        }

      >()

    );



  const pinchRef = useRef<{

    distance: number;

    midpointX: number;

    midpointY: number;

    scale: number;

    x: number;

    y: number;

  } | null>(null);



  const [dragging, setDragging] =

    useState(false);



  const [draftMark, setDraftMark] =
    useState<MarkupMark | null>(null);

  const drawPointerRef = useRef<number | null>(null);

const stampDragRef = useRef<{
  pointerId: number;
  markId: string;
  offsetX: number;
  offsetY: number;
} | null>(null);

  const [selectedMarkId, setSelectedMarkId] = useState<string | null>(null);

  const shapeEditRef = useRef<{
    pointerId: number;
    markId: string;
    mode: "move" | "resize-start" | "resize-end";
    startPoint: { x: number; y: number };
    original: MarkupMark;
  } | null>(null);



  useEffect(() => {

    transformRef.current =

      comparisonTransform;

  }, [comparisonTransform]);



  useEffect(() => {

    onChangeRef.current =

      onComparisonChange;

  }, [onComparisonChange]);



  useEffect(() => {

    const frame =

      frameRef.current;



    if (!frame) {

      return;

    }



    function handleWheel(

      event: WheelEvent

    ) {

      event.preventDefault();

      event.stopPropagation();



      const current =

        transformRef.current;



      const rect =

        frame!.getBoundingClientRect();



      const cursorX =

        event.clientX -

        rect.left -

        rect.width / 2;



      const cursorY =

        event.clientY -

        rect.top -

        rect.height / 2;



      const direction =

        event.deltaY < 0

          ? 0.1

          : -0.1;



      const nextScale =

        clampComparisonScale(

          current.scale +

            direction

        );



      if (

        nextScale ===

        current.scale

      ) {

        return;

      }



      const ratio =

        nextScale /

        current.scale;



      const next = {

        scale: nextScale,

        x:

          cursorX -

          (cursorX -

            current.x) *

            ratio,

        y:

          cursorY -

          (cursorY -

            current.y) *

            ratio,

      };



      transformRef.current =

        next;



      onChangeRef.current(

        next

      );

    }



    frame.addEventListener(

      "wheel",

      handleWheel,

      {

        passive: false,

      }

    );



  return () => {

      frame.removeEventListener(

        "wheel",

        handleWheel

      );

    };

  }, []);



  function emitTransform(

    next: ComparisonTransform

  ) {

    const normalized = {

      scale:

        clampComparisonScale(

          next.scale

        ),

      x: next.x,

      y: next.y,

    };



    transformRef.current =

      normalized;



    onComparisonChange(

      normalized

    );

  }



  function getPinchValues() {

    const points =

      Array.from(

        pointersRef.current.values()

      );



    if (points.length < 2) {

      return null;

    }



    const first =

      points[0];



    const second =

      points[1];



    const dx =

      second.x - first.x;



    const dy =

      second.y - first.y;



    return {

      distance:

        Math.hypot(dx, dy),

      midpointX:

        (first.x +

          second.x) /

        2,

      midpointY:

        (first.y +

          second.y) /

        2,

    };

  }



  function beginPinch() {

    const pinch =

      getPinchValues();



    const frame =

      frameRef.current;



    if (!pinch || !frame) {

      return;

    }



    const rect =

      frame.getBoundingClientRect();



    pinchRef.current = {

      distance:

        pinch.distance,

      midpointX:

        pinch.midpointX -

        rect.left -

        rect.width / 2,

      midpointY:

        pinch.midpointY -

        rect.top -

        rect.height / 2,

      scale:

        comparisonTransform.scale,

      x:

        comparisonTransform.x,

      y:

        comparisonTransform.y,

    };



    dragRef.current =

      null;

  }



  function markupPointFromEvent(event: ReactPointerEvent<HTMLDivElement>) {
    const frame = frameRef.current;
    if (!frame) return null;

    const rect = frame.getBoundingClientRect();
    const displayScale = comparisonTransform.scale * FINAL_NORMALIZED_DISPLAY_FIT;
    if (displayScale <= 0) return null;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const localX =
      (event.clientX - rect.left - centerX - comparisonTransform.x) /
        displayScale +
      centerX;
    const localY =
      (event.clientY - rect.top - centerY - comparisonTransform.y) /
        displayScale +
      centerY;

        return {
      x: Math.max(0, Math.min(1000, (localX / rect.width) * 1000)),
      y: Math.max(0, Math.min(1000, (localY / rect.height) * 1000)),
    };
  }

  function findStampAtPoint(point: { x: number; y: number }) {
    const referenceWidth =
      alignment.referenceWidth ||
      (alignment.orientation === "portrait" ? 2.5 : 3.5);

    const referenceHeight =
      alignment.referenceHeight ||
      (alignment.orientation === "portrait" ? 3.5 : 2.5);

    const visualAspect =
      referenceWidth > 0 && referenceHeight > 0
        ? referenceWidth / referenceHeight
        : 1;

    // Work backwards so the most recently placed stamp is selected
    // when two stamps overlap.
    for (let index = marks.length - 1; index >= 0; index -= 1) {
      const mark = marks[index];

      if (!isStampTool(mark.tool)) {
        continue;
      }

      const label = stampLabel(mark.tool);
      const hasOpinion =
        mark.tool === "altered" || mark.tool === "fake";

      // These match the current stamp dimensions in MarkupSvg.
      const stampWidth = Math.max(176, label.length * 32);
      const stampHeight = hasOpinion ? 55 : 45;

      const halfWidth = stampWidth / 2;
      const halfHeight =
        stampHeight / (2 * visualAspect);

      if (
        point.x >= mark.x1 - halfWidth &&
        point.x <= mark.x1 + halfWidth &&
        point.y >= mark.y1 - halfHeight &&
        point.y <= mark.y1 + halfHeight
      ) {
        return mark;
      }
    }

    return null;
  }

  function isEditableShape(mark: MarkupMark) {
    return (
      mark.tool === "circle" ||
      mark.tool === "rectangle" ||
      mark.tool === "triangle" ||
      mark.tool === "arrow"
    );
  }

  function distanceToSegment(
    point: { x: number; y: number },
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared <= 0) return Math.hypot(point.x - x1, point.y - y1);
    const t = Math.max(
      0,
      Math.min(1, ((point.x - x1) * dx + (point.y - y1) * dy) / lengthSquared)
    );
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;
    return Math.hypot(point.x - closestX, point.y - closestY);
  }

  function findEditableShapeAtPoint(point: { x: number; y: number }) {
    const hitPadding = 28;

    for (let index = marks.length - 1; index >= 0; index -= 1) {
      const mark = marks[index];
      if (!isEditableShape(mark)) continue;

      if (mark.tool === "arrow") {
        if (distanceToSegment(point, mark.x1, mark.y1, mark.x2, mark.y2) <= hitPadding) {
          return mark;
        }
        continue;
      }

      const left = Math.min(mark.x1, mark.x2) - hitPadding;
      const right = Math.max(mark.x1, mark.x2) + hitPadding;
      const top = Math.min(mark.y1, mark.y2) - hitPadding;
      const bottom = Math.max(mark.y1, mark.y2) + hitPadding;

      if (point.x >= left && point.x <= right && point.y >= top && point.y <= bottom) {
        return mark;
      }
    }

    return null;
  }

  function beginMarkup(event: ReactPointerEvent<HTMLDivElement>) {
  if (event.pointerType === "mouse" && event.button !== 0) {
    return markupTool !== "pan";
  }

  const initialPoint = markupPointFromEvent(event);

  if (markupTool === "select" && initialPoint) {
    const selected = marks.find((mark) => mark.id === selectedMarkId);
    const handleRadius = 32;

    if (selected && isEditableShape(selected)) {
      const nearStart = Math.hypot(initialPoint.x - selected.x1, initialPoint.y - selected.y1) <= handleRadius;
      const nearEnd = Math.hypot(initialPoint.x - selected.x2, initialPoint.y - selected.y2) <= handleRadius;

      if (nearStart || nearEnd) {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        shapeEditRef.current = {
          pointerId: event.pointerId,
          markId: selected.id,
          mode: nearStart ? "resize-start" : "resize-end",
          startPoint: initialPoint,
          original: { ...selected },
        };
        return true;
      }
    }

    const hit = findEditableShapeAtPoint(initialPoint);
    if (!hit) {
      setSelectedMarkId(null);
      return true;
    }

    setSelectedMarkId(hit.id);
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    shapeEditRef.current = {
      pointerId: event.pointerId,
      markId: hit.id,
      mode: "move",
      startPoint: initialPoint,
      original: { ...hit },
    };
    return true;
  }

  if (initialPoint) {
    const existingStamp = findStampAtPoint(initialPoint);

    if (existingStamp) {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);

      stampDragRef.current = {
        pointerId: event.pointerId,
        markId: existingStamp.id,
        offsetX: initialPoint.x - existingStamp.x1,
        offsetY: initialPoint.y - existingStamp.y1,
      };

      return true;
    }
  }

  if (markupTool === "pan") return false;
  if (markupTool === "select") return true;

       const point = markupPointFromEvent(event);
    if (!point) return true;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

        drawPointerRef.current = event.pointerId;

    if (isStampTool(markupTool)) {
      onMarkupAdd({
        id: createMarkupId(),
        tool: markupTool,
        color: markupColor,
        x1: point.x,
        y1: point.y,
        x2: point.x,
        y2: point.y,
      });
      drawPointerRef.current = null;
      return true;
    }

    setDraftMark({
      id: createMarkupId(),
      tool: markupTool,
      color: markupColor,
      x1: point.x,
      y1: point.y,
      x2: point.x,
      y2: point.y,
      points: markupTool === "draw" ? [{ x: point.x, y: point.y }] : undefined,
    });

    return true;
  }

  function moveMarkup(event: ReactPointerEvent<HTMLDivElement>) {
    if (shapeEditRef.current?.pointerId === event.pointerId) {
      const point = markupPointFromEvent(event);
      if (!point) return true;

      event.preventDefault();
      event.stopPropagation();

      const edit = shapeEditRef.current;
      const original = edit.original;

      if (edit.mode === "resize-start") {
        onMarkupUpdate(edit.markId, { x1: point.x, y1: point.y });
      } else if (edit.mode === "resize-end") {
        onMarkupUpdate(edit.markId, { x2: point.x, y2: point.y });
      } else {
        const dx = point.x - edit.startPoint.x;
        const dy = point.y - edit.startPoint.y;
        const minX = Math.min(original.x1, original.x2);
        const maxX = Math.max(original.x1, original.x2);
        const minY = Math.min(original.y1, original.y2);
        const maxY = Math.max(original.y1, original.y2);
        const clampedDx = Math.max(-minX, Math.min(1000 - maxX, dx));
        const clampedDy = Math.max(-minY, Math.min(1000 - maxY, dy));

        onMarkupUpdate(edit.markId, {
          x1: original.x1 + clampedDx,
          y1: original.y1 + clampedDy,
          x2: original.x2 + clampedDx,
          y2: original.y2 + clampedDy,
        });
      }

      return true;
    }

        if (stampDragRef.current?.pointerId === event.pointerId) {
      const point = markupPointFromEvent(event);

      if (!point) {
        return true;
      }

      event.preventDefault();
      event.stopPropagation();

      const drag = stampDragRef.current;

      const nextX = Math.max(
        0,
        Math.min(1000, point.x - drag.offsetX)
      );

      const nextY = Math.max(
        0,
        Math.min(1000, point.y - drag.offsetY)
      );

      onMarkupUpdate(drag.markId, {
        x1: nextX,
        y1: nextY,
        x2: nextX,
        y2: nextY,
      });

      return true;
    }
    if (markupTool === "pan" || drawPointerRef.current !== event.pointerId) {
      return false;
    }

    const point = markupPointFromEvent(event);
    if (!point) return true;

    event.preventDefault();
    event.stopPropagation();
    setDraftMark((current) => {
      if (!current) return current;

      if (current.tool === "draw") {
        const points = current.points ?? [{ x: current.x1, y: current.y1 }];
        const lastPoint = points[points.length - 1];
        const distance = lastPoint
          ? Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y)
          : Infinity;

        // Avoid storing excessive nearly-identical pointer samples.
        const nextPoints =
          distance >= 1.5
            ? [...points, { x: point.x, y: point.y }]
            : points;

        return {
          ...current,
          x2: point.x,
          y2: point.y,
          points: nextPoints,
        };
      }

      return { ...current, x2: point.x, y2: point.y };
    });
    return true;
  }

  function endMarkup(event: ReactPointerEvent<HTMLDivElement>) {
    if (shapeEditRef.current?.pointerId === event.pointerId) {
      event.preventDefault();
      event.stopPropagation();
      shapeEditRef.current = null;
      return true;
    }

      if (stampDragRef.current?.pointerId === event.pointerId) {
    event.preventDefault();
    event.stopPropagation();

    stampDragRef.current = null;

    return true;
  }
  if (drawPointerRef.current !== event.pointerId) return false;

  event.preventDefault();
  event.stopPropagation();
  drawPointerRef.current = null;

  const completedMark = draftMark;
  setDraftMark(null);

  if (completedMark) {
    const width = Math.abs(completedMark.x2 - completedMark.x1);
    const height = Math.abs(completedMark.y2 - completedMark.y1);

    if (completedMark.tool === "draw") {
      const points = completedMark.points ?? [];
      if (points.length >= 2) {
        onMarkupAdd(completedMark);
      }
    } else if (width >= 4 || height >= 4) {
      onMarkupAdd(completedMark);
    }
  }

  return true;
}

  function handlePointerDown(

    event: ReactPointerEvent<HTMLDivElement>

  ) {
    if (beginMarkup(event)) return;

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



    pointersRef.current.set(

      event.pointerId,

      {

        x: event.clientX,

        y: event.clientY,

      }

    );



    if (

      pointersRef.current.size >=

      2

    ) {

      beginPinch();

      setDragging(false);

      return;

    }



    dragRef.current = {

      pointerId:

        event.pointerId,

      startX:

        event.clientX,

      startY:

        event.clientY,

      originX:

        comparisonTransform.x,

      originY:

        comparisonTransform.y,

    };



    setDragging(true);

  }



  function handlePointerMove(

    event: ReactPointerEvent<HTMLDivElement>

  ) {
    if (moveMarkup(event)) return;

    if (

      !pointersRef.current.has(

        event.pointerId

      )

    ) {

      return;

    }



    event.preventDefault();



    pointersRef.current.set(

      event.pointerId,

      {

        x: event.clientX,

        y: event.clientY,

      }

    );



    if (

      pointersRef.current.size >=

      2 &&

      pinchRef.current

    ) {

      const pinch =

        getPinchValues();



      const frame =

        frameRef.current;



      if (

        !pinch ||

        !frame ||

        pinchRef.current

          .distance <= 0

      ) {

        return;

      }



      const rect =

        frame.getBoundingClientRect();



      const midpointX =

        pinch.midpointX -

        rect.left -

        rect.width / 2;



      const midpointY =

        pinch.midpointY -

        rect.top -

        rect.height / 2;



      const ratio =

        pinch.distance /

        pinchRef.current

          .distance;



      const nextScale =

        clampComparisonScale(

          pinchRef.current

            .scale * ratio

        );



      const scaleRatio =

        nextScale /

        pinchRef.current

          .scale;



      emitTransform({

        scale: nextScale,

        x:

          midpointX -

          (pinchRef.current

            .midpointX -

            pinchRef.current.x) *

            scaleRatio,

        y:

          midpointY -

          (pinchRef.current

            .midpointY -

            pinchRef.current.y) *

            scaleRatio,

      });



      return;

    }



    const drag =

      dragRef.current;



    if (

      !drag ||

      drag.pointerId !==

        event.pointerId

    ) {

      return;

    }



    emitTransform({

      ...comparisonTransform,

      x:

        drag.originX +

        event.clientX -

        drag.startX,

      y:

        drag.originY +

        event.clientY -

        drag.startY,

    });

  }



  function handlePointerEnd(

    event: ReactPointerEvent<HTMLDivElement>

  ) {
    if (endMarkup(event)) return;

    pointersRef.current.delete(

      event.pointerId

    );



    if (

      dragRef.current

        ?.pointerId ===

      event.pointerId

    ) {

      dragRef.current =

        null;

    }



    if (

      pointersRef.current.size <

      2

    ) {

      pinchRef.current =

        null;

    }



    setDragging(false);

  }



  function handleDoubleClick() {

    emitTransform(

      cloneDefaultComparisonTransform()

    );

  }



  return (

    <div

      ref={frameRef}
      data-export-card={title}

      onPointerDown={

        handlePointerDown

      }

      onPointerMove={

        handlePointerMove

      }

      onPointerUp={

        handlePointerEnd

      }

      onPointerCancel={

        handlePointerEnd

      }

      onDoubleClick={

        handleDoubleClick

      }

      className={`relative w-full overflow-hidden bg-black touch-none overscroll-contain ${

        alignment.orientation ===

        "portrait"

          ? "max-w-[300px]"

          : "max-w-[420px]"

      } ${

        markupTool !== "pan"
          ? "cursor-crosshair"
          : dragging
            ? "cursor-grabbing"
            : "cursor-grab"

      }`}
      style={{ aspectRatio: frameAspect }}

      title={
        markupTool === "pan"
          ? "Drag to pan • Wheel or pinch to zoom • Double-click to reset view"
          : `Draw ${markupTool} markup`
      }

    >

      <div

        className="pointer-events-none absolute inset-0"

        style={{

          transform: `

            translate(

              ${comparisonTransform.x}px,

              ${comparisonTransform.y}px

            )

            scale(${comparisonTransform.scale * FINAL_NORMALIZED_DISPLAY_FIT})

          `,

          transformOrigin:

            "center center",

        }}

      >

        <img

          src={image}

          alt={`${title} ${view}`}

          draggable={false}

          className="pointer-events-none absolute left-1/2 top-1/2 h-full w-full max-w-none select-none object-contain"

          style={{

            transform: `

              translate(

                calc(-50% + ${alignmentX}px),

                calc(-50% + ${alignmentY}px)

              )

              scale(${alignment.scale})

              rotate(${alignment.rotation}deg)

              skewX(${alignment.skewX}deg)

              skewY(${alignment.skewY}deg)
              ${perspectiveMatrix3d(frameSize.width, frameSize.height, alignment.perspective)}

            `,

            transformOrigin:

              "center center",

          }}

        />

        <MarkupSvg
          marks={draftMark ? [...marks, draftMark] : marks}
          markerPrefix={`${title}-${view}`}
          alignment={alignment}
          selectedMarkId={markupTool === "select" ? selectedMarkId : null}
        />

      </div>



      <div
        data-export-ignore="true"
        className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white/60"
      >

        Drag to pan • Wheel / pinch to zoom

      </div>

    </div>

  );

}




async function loadExportImage(src: string) {
  const image = new Image();

  if (!src.startsWith("blob:") && !src.startsWith("data:")) {
    image.crossOrigin = "anonymous";
  }

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () =>
      reject(new Error("Unable to load the card image for export."));
    image.src = src;
  });

  return image;
}

function applyCanvasAlignmentTransform(
  context: CanvasRenderingContext2D,
  alignment: CardAlignmentTransform,
  outputWidth: number,
  outputHeight: number,
  referenceFrameSize?: AlignmentFrameSize | null
) {
  const alignmentX = referenceFrameSize?.width
    ? alignment.x * (outputWidth / referenceFrameSize.width)
    : alignment.x;

  const alignmentY = referenceFrameSize?.height
    ? alignment.y * (outputHeight / referenceFrameSize.height)
    : alignment.y;

  context.translate(outputWidth / 2 + alignmentX, outputHeight / 2 + alignmentY);
  context.scale(alignment.scale, alignment.scale);
  context.rotate((alignment.rotation * Math.PI) / 180);

  const skewX = Math.tan((alignment.skewX * Math.PI) / 180);
  const skewY = Math.tan((alignment.skewY * Math.PI) / 180);
  context.transform(1, skewY, skewX, 1, 0, 0);
}

function drawExportMarkup(
  context: CanvasRenderingContext2D,
  marks: MarkupMark[],
  alignment: CardAlignmentTransform,
  width: number,
  height: number
) {
  /*
   * The live markup SVG is always a 1000 x 1000 coordinate system and its
   * regular strokes use vectorEffect="non-scaling-stroke". Recreate that
   * visual sizing here instead of letting the high-resolution export make
   * the lines and stamp borders heavier.
   */
  const sx = width / 1000;
  const sy = height / 1000;

  // Match the live viewer's visual stroke widths at export resolution.
  const viewerReferenceWidth =
    alignment.orientation === "portrait" ? 300 : 420;
  const exportDisplayScale = width / viewerReferenceWidth;
  const regularStrokeWidth = 4 * exportDisplayScale;
  const stampStrokeWidth = 3 * exportDisplayScale;

  for (const mark of marks) {
    if (isStampTool(mark.tool)) {
      const label = stampLabel(mark.tool);
      const color = stampColor(mark.tool);
      const hasOpinion = mark.tool === "altered" || mark.tool === "fake";

      // These are the exact live MarkupSvg stamp dimensions.
      const stampWidth1000 = Math.max(176, label.length * 32);
      const stampHeight1000 = hasOpinion ? 55 : 45;

      const referenceWidth =
        alignment.referenceWidth ||
        (alignment.orientation === "portrait" ? 2.5 : 3.5);
      const referenceHeight =
        alignment.referenceHeight ||
        (alignment.orientation === "portrait" ? 3.5 : 2.5);
      const visualAspect =
        referenceWidth > 0 && referenceHeight > 0
          ? referenceWidth / referenceHeight
          : 1;
      const stampScaleY = visualAspect > 0 ? visualAspect : 1;

      const halfWidth = stampWidth1000 / 2;
      const halfHeightInSvg = stampHeight1000 / (2 * stampScaleY);

      const x1000 = Math.max(
        halfWidth + 10,
        Math.min(1000 - halfWidth - 10, mark.x1)
      );
      const y1000 = Math.max(
        halfHeightInSvg + 10,
        Math.min(1000 - halfHeightInSvg - 10, mark.y1)
      );

      const x = x1000 * sx;
      const y = y1000 * sy;

      /*
       * MarkupSvg renders the stamp group with:
       *   scale(1, 1 / stampScaleY)
       * Reproduce that exact counter-scale here so the exported border hugs
       * the lettering exactly like the live stamp.
       */
      context.save();
      context.translate(x, y);
      context.scale(sx, sy / stampScaleY);

      context.strokeStyle = color;
      context.fillStyle = color;
      context.lineWidth = stampStrokeWidth / sx;
      context.textAlign = "center";
      context.textBaseline = "middle";

      context.beginPath();
      context.roundRect(
        -stampWidth1000 / 2,
        -stampHeight1000 / 2,
        stampWidth1000,
        stampHeight1000,
        10
      );
      context.stroke();

      if (hasOpinion) {
        context.font = "800 15px Arial, sans-serif";
        context.fillText("OPINION", 0, -13);
      }

      context.font = "900 36px Arial, sans-serif";
      context.fillText(label, 0, hasOpinion ? 10 : 0);

      context.restore();
      continue;
    }

    const stroke = markupColorValue(mark.color);
    const x1 = mark.x1 * sx;
    const y1 = mark.y1 * sy;
    const x2 = mark.x2 * sx;
    const y2 = mark.y2 * sy;
    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const shapeWidth = Math.abs(x2 - x1);
    const shapeHeight = Math.abs(y2 - y1);

    context.save();
    context.strokeStyle = stroke;
    context.lineWidth = regularStrokeWidth;
    context.lineCap = "round";
    context.lineJoin = "round";

    if (mark.tool === "draw") {
      const points = mark.points ?? [];
      if (points.length >= 2) {
        context.beginPath();
        context.moveTo(points[0].x * sx, points[0].y * sy);
        for (let index = 1; index < points.length; index += 1) {
          context.lineTo(points[index].x * sx, points[index].y * sy);
        }
        context.stroke();
      }
      context.restore();
      continue;
    }

    if (mark.tool === "circle") {
      context.beginPath();
      context.ellipse(
        (x1 + x2) / 2,
        (y1 + y2) / 2,
        Math.max(2, shapeWidth / 2),
        Math.max(2, shapeHeight / 2),
        0,
        0,
        Math.PI * 2
      );
      context.stroke();
      context.restore();
      continue;
    }

    if (mark.tool === "rectangle") {
      context.strokeRect(
        left,
        top,
        Math.max(2, shapeWidth),
        Math.max(2, shapeHeight)
      );
      context.restore();
      continue;
    }

    if (mark.tool === "triangle") {
      context.beginPath();
      context.moveTo((x1 + x2) / 2, top);
      context.lineTo(left + shapeWidth, top + shapeHeight);
      context.lineTo(left, top + shapeHeight);
      context.closePath();
      context.stroke();
      context.restore();
      continue;
    }

    const dx1000 = mark.x2 - mark.x1;
    const dy1000 = mark.y2 - mark.y1;
    const length1000 = Math.hypot(dx1000, dy1000);

    if (length1000 >= 1) {
      const unitX = dx1000 / length1000;
      const unitY = dy1000 / length1000;

      // Exact same arrowhead math as the live MarkupSvg.
      const arrowLength1000 = Math.min(
        42,
        Math.max(24, length1000 * 0.12)
      );
      const arrowWidth1000 = arrowLength1000 * 0.48;

      const baseX1000 = mark.x2 - unitX * arrowLength1000;
      const baseY1000 = mark.y2 - unitY * arrowLength1000;
      const perpendicularX = -unitY;
      const perpendicularY = unitX;

      const head1X =
        (baseX1000 + perpendicularX * arrowWidth1000) * sx;
      const head1Y =
        (baseY1000 + perpendicularY * arrowWidth1000) * sy;
      const head2X =
        (baseX1000 - perpendicularX * arrowWidth1000) * sx;
      const head2Y =
        (baseY1000 - perpendicularY * arrowWidth1000) * sy;

      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.stroke();

      context.beginPath();
      context.moveTo(x2, y2);
      context.lineTo(head1X, head1Y);
      context.stroke();

      context.beginPath();
      context.moveTo(x2, y2);
      context.lineTo(head2X, head2Y);
      context.stroke();
    }

    context.restore();
  }
}

async function renderCleanCardExport({
  imageSrc,
  alignment,
  comparisonTransform,
  referenceFrameSize,
  marks,
}: {
  imageSrc: string;
  alignment: CardAlignmentTransform;
  comparisonTransform: ComparisonTransform;
  referenceFrameSize?: AlignmentFrameSize | null;
  marks: MarkupMark[];
}) {
  const referenceWidth =
    alignment.referenceWidth ||
    (alignment.orientation === "portrait" ? 2.5 : 3.5);
  const referenceHeight =
    alignment.referenceHeight ||
    (alignment.orientation === "portrait" ? 3.5 : 2.5);

  const longEdge = 1800;
  const portrait = referenceHeight >= referenceWidth;
  const width = portrait
    ? Math.round(longEdge * (referenceWidth / referenceHeight))
    : longEdge;
  const height = portrait
    ? longEdge
    : Math.round(longEdge * (referenceHeight / referenceWidth));

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available.");

  context.fillStyle = "#000000";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const image = await loadExportImage(imageSrc);

  context.save();

  const comparisonScale =
    comparisonTransform.scale * FINAL_NORMALIZED_DISPLAY_FIT;

  const displayReferenceWidth =
    alignment.orientation === "portrait" ? 300 : 420;

  const comparisonX =
    comparisonTransform.x * (canvas.width / displayReferenceWidth);
  const comparisonY =
    comparisonTransform.y * (canvas.width / displayReferenceWidth);

  context.translate(
    canvas.width / 2 + comparisonX,
    canvas.height / 2 + comparisonY
  );
  context.scale(comparisonScale, comparisonScale);
  context.translate(-canvas.width / 2, -canvas.height / 2);

  context.save();
  applyCanvasAlignmentTransform(
    context,
    alignment,
    canvas.width,
    canvas.height,
    referenceFrameSize
  );

  const imageRatio = image.naturalWidth / image.naturalHeight;
  const frameRatio = canvas.width / canvas.height;

  let drawWidth = canvas.width;
  let drawHeight = canvas.height;

  if (imageRatio > frameRatio) {
    drawHeight = drawWidth / imageRatio;
  } else {
    drawWidth = drawHeight * imageRatio;
  }

  context.drawImage(
    image,
    -drawWidth / 2,
    -drawHeight / 2,
    drawWidth,
    drawHeight
  );
  context.restore();

  drawExportMarkup(
    context,
    marks,
    alignment,
    canvas.width,
    canvas.height
  );

  context.restore();

  return canvas;
}


function copyComputedStylesForExport(
  source: Element,
  clone: Element
) {
  if (source instanceof HTMLElement && clone instanceof HTMLElement) {
    const computed = window.getComputedStyle(source);
    const cssText = Array.from(computed)
      .map((property) => `${property}:${computed.getPropertyValue(property)};`)
      .join("");
    clone.setAttribute("style", `${cssText}${clone.getAttribute("style") ?? ""}`);
  }

  const sourceChildren = Array.from(source.children);
  const cloneChildren = Array.from(clone.children);

  sourceChildren.forEach((child, index) => {
    const clonedChild = cloneChildren[index];
    if (clonedChild) {
      copyComputedStylesForExport(child, clonedChild);
    }
  });
}

async function imageSourceToDataUrl(src: string) {
  if (src.startsWith("data:")) return src;

  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`Unable to load export image: ${response.status}`);
  }

  const blob = await response.blob();

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function prepareExportClone(
  source: HTMLElement
) {
  const clone = source.cloneNode(true) as HTMLElement;
  copyComputedStylesForExport(source, clone);

  clone.querySelectorAll('[data-export-ignore="true"]').forEach((node) => {
    node.remove();
  });

  const sourceImages = Array.from(source.querySelectorAll("img"));
  const cloneImages = Array.from(clone.querySelectorAll("img"));

  await Promise.all(
    sourceImages.map(async (image, index) => {
      const cloneImage = cloneImages[index];
      if (!cloneImage) return;

      const dataUrl = await imageSourceToDataUrl(image.currentSrc || image.src);
      cloneImage.setAttribute("src", dataUrl);
      cloneImage.removeAttribute("srcset");
    })
  );

  return clone;
}

async function captureComparisonElement(
  source: HTMLElement
) {
  const rect = source.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const scale = 2;

  const clone = await prepareExportClone(source);
  clone.style.width = `${width}px`;
  clone.style.height = `${height}px`;
  clone.style.maxWidth = "none";
  clone.style.margin = "0";
  clone.style.position = "relative";

  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapper.style.width = `${width}px`;
  wrapper.style.height = `${height}px`;
  wrapper.style.overflow = "hidden";
  wrapper.style.background = "#000000";
  wrapper.appendChild(clone);

  const serialized = new XMLSerializer().serializeToString(wrapper);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg"
         width="${width}"
         height="${height}"
         viewBox="0 0 ${width} ${height}">
      <foreignObject x="0" y="0" width="100%" height="100%">
        ${serialized}
      </foreignObject>
    </svg>
  `;

  const svgBlob = new Blob([svg], {
    type: "image/svg+xml;charset=utf-8",
  });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const exportImage = new Image();
      exportImage.onload = () => resolve(exportImage);
      exportImage.onerror = () =>
        reject(new Error("Unable to render comparison export."));
      exportImage.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas is not available.");
    }

    context.fillStyle = "#000000";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.scale(scale, scale);
    context.drawImage(image, 0, 0, width, height);

    return canvas;
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function combineExportCanvases(
  canvasA: HTMLCanvasElement,
  canvasB: HTMLCanvasElement
) {
  const gap = 8;
  const height = Math.max(canvasA.height, canvasB.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvasA.width + canvasB.width + gap;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is not available.");
  }

  context.fillStyle = "#000000";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const yA = Math.round((height - canvasA.height) / 2);
  const yB = Math.round((height - canvasB.height) / 2);

  context.drawImage(canvasA, 0, yA);
  context.drawImage(canvasB, canvasA.width + gap, yB);

  return canvas;
}

function addExportFooter(
  source: HTMLCanvasElement
) {
  const footerHeight = 132;
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height + footerHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is not available.");
  }

  context.fillStyle = "#000000";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0);

  context.fillStyle = "#0a0a0a";
  context.fillRect(0, source.height, canvas.width, footerHeight);

  context.strokeStyle = "#581c87";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, source.height + 1);
  context.lineTo(canvas.width, source.height + 1);
  context.stroke();

  const centerX = canvas.width / 2;

  context.fillStyle = "#d4d4d8";
  context.font = "700 22px Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(
    "Created using Card Comparison by TiffanyCards.com",
    centerX,
    source.height + 31
  );

  const disclaimerFontSize = Math.max(
    20,
    Math.min(16, Math.round(canvas.width / 90))
  );

  context.fillStyle = "#a3a3a3";
  context.font = `500 ${disclaimerFontSize}px Arial, sans-serif`;

  context.fillText(
  "Disclaimer: For educational and illustrative purposes only. Annotations, labels, and conclusions reflect the user's opinion.",
  centerX,
  source.height + 70
);

context.fillText(
  "Image quality, lighting, scanner/camera settings, compression, and processing may affect apparent differences.",
  centerX,
  source.height + 96
);

  return canvas;
}

function downloadExportCanvas(
  canvas: HTMLCanvasElement,
  filename: string
) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png", 1);
  document.body.appendChild(link);
  link.click();
  link.remove();
}


function MarkupSvg({
  marks,
  markerPrefix,
  alignment,
  selectedMarkId,
}: {
  marks: MarkupMark[];
  markerPrefix: string;
  alignment: CardAlignmentTransform;
  selectedMarkId?: string | null;
}) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible"
      viewBox="0 0 1000 1000"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {marks.map((mark) => {
        if (isStampTool(mark.tool)) {
          const label = stampLabel(mark.tool);
          const color = stampColor(mark.tool);
          const hasOpinion = mark.tool === "altered" || mark.tool === "fake";

          /*
           * IMPORTANT:
           * MarkupSvg uses preserveAspectRatio="none", so a rectangle drawn in the
           * 1000 x 1000 SVG coordinate system is visually stretched with the card.
           * That is why the earlier stamp borders looked tall/narrow and could cross
           * the lettering. Counter-scale the stamp group by the rendered SVG aspect
           * ratio so the stamp itself keeps normal proportions on screen.
           */
          const stampWidth = Math.max(176, label.length * 32);
          const stampHeight = hasOpinion ? 55 : 45;

          // MarkupSvg itself does not own the rendered frame dimensions.
          // Use the card's known reference aspect ratio to compensate for
          // preserveAspectRatio="none" without referencing an out-of-scope frameSize.
          const referenceWidth =
            alignment.referenceWidth ||
            (alignment.orientation === "portrait" ? 2.5 : 3.5);
          const referenceHeight =
            alignment.referenceHeight ||
            (alignment.orientation === "portrait" ? 3.5 : 2.5);
          const visualAspect =
            referenceWidth > 0 && referenceHeight > 0
              ? referenceWidth / referenceHeight
              : 1;

          const stampScaleY = visualAspect > 0 ? visualAspect : 1;

          const halfWidth = stampWidth / 2;
          const halfHeightInSvg = stampHeight / (2 * stampScaleY);

          const x = Math.max(
            halfWidth + 10,
            Math.min(1000 - halfWidth - 10, mark.x1)
          );
          const y = Math.max(
            halfHeightInSvg + 10,
            Math.min(1000 - halfHeightInSvg - 10, mark.y1)
          );

          return (
            <g
              key={mark.id}
              transform={`translate(${x} ${y}) scale(1 ${1 / stampScaleY})`}
            >
              <rect
                x={-stampWidth / 2}
                y={-stampHeight / 2}
                width={stampWidth}
                height={stampHeight}
                rx="10"
                fill="none"
                stroke={color}
                strokeWidth="3"
                vectorEffect="non-scaling-stroke"
              />

              {hasOpinion && (
  <text
    x="0"
    y="-13"
    fill={color}
    fontSize="15"
    fontWeight="800"
    textAnchor="middle"
    dominantBaseline="middle"
    letterSpacing="3"
  >
    OPINION
  </text>
)}

<text
  x="0"
  y={hasOpinion ? 10 : 0}
  fill={color}
  fontSize="36"
  fontWeight="900"
  textAnchor="middle"
  dominantBaseline="middle"
  letterSpacing="1.5"
>
  {label}
</text>
            </g>
          );
        }

        const stroke = markupColorValue(mark.color);
        const left = Math.min(mark.x1, mark.x2);
        const top = Math.min(mark.y1, mark.y2);
        const width = Math.abs(mark.x2 - mark.x1);
        const height = Math.abs(mark.y2 - mark.y1);
        const strokeWidth = 4;

        if (mark.tool === "draw") {
          const points = mark.points ?? [];
          if (points.length < 2) return null;

          return (
            <polyline
              key={mark.id}
              points={points.map((point) => `${point.x},${point.y}`).join(" ")}
              fill="none"
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          );
        }

        if (mark.tool === "circle") {
          return (
            <ellipse
              key={mark.id}
              cx={(mark.x1 + mark.x2) / 2}
              cy={(mark.y1 + mark.y2) / 2}
              rx={Math.max(2, width / 2)}
              ry={Math.max(2, height / 2)}
              fill="none"
              stroke={stroke}
              strokeWidth={strokeWidth}
              vectorEffect="non-scaling-stroke"
            />
          );
        }

        if (mark.tool === "rectangle") {
          return (
            <rect
              key={mark.id}
              x={left}
              y={top}
              width={Math.max(2, width)}
              height={Math.max(2, height)}
              fill="none"
              stroke={stroke}
              strokeWidth={strokeWidth}
              vectorEffect="non-scaling-stroke"
            />
          );
        }

        if (mark.tool === "triangle") {
          const midX = (mark.x1 + mark.x2) / 2;

          return (
            <polygon
              key={mark.id}
              points={`${midX},${top} ${left + width},${top + height} ${left},${top + height}`}
              fill="none"
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          );
        }

        const dx = mark.x2 - mark.x1;
        const dy = mark.y2 - mark.y1;
        const length = Math.hypot(dx, dy);

        if (length < 1) {
          return null;
        }

        const unitX = dx / length;
        const unitY = dy / length;

        // Small arrowhead that remains proportional and visible.
        const arrowLength = Math.min(42, Math.max(24, length * 0.12));
        const arrowWidth = arrowLength * 0.48;

        const baseX = mark.x2 - unitX * arrowLength;
        const baseY = mark.y2 - unitY * arrowLength;

        const perpendicularX = -unitY;
        const perpendicularY = unitX;

        const headPoint1X =
          baseX + perpendicularX * arrowWidth;

        const headPoint1Y =
          baseY + perpendicularY * arrowWidth;

        const headPoint2X =
          baseX - perpendicularX * arrowWidth;

        const headPoint2Y =
          baseY - perpendicularY * arrowWidth;

        return (
          <g key={mark.id}>
            <line
              x1={mark.x1}
              y1={mark.y1}
              x2={mark.x2}
              y2={mark.y2}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />

            <line
              x1={mark.x2}
              y1={mark.y2}
              x2={headPoint1X}
              y2={headPoint1Y}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />

            <line
              x1={mark.x2}
              y1={mark.y2}
              x2={headPoint2X}
              y2={headPoint2Y}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      })}

      {(() => {
        const selected = marks.find(
          (mark) => mark.id === selectedMarkId && !isStampTool(mark.tool) && mark.tool !== "draw"
        );
        if (!selected) return null;

        const left = Math.min(selected.x1, selected.x2);
        const top = Math.min(selected.y1, selected.y2);
        const width = Math.abs(selected.x2 - selected.x1);
        const height = Math.abs(selected.y2 - selected.y1);

        return (
          <g key={`selection-${selected.id}`}>
            <rect
              x={left - 12}
              y={top - 12}
              width={Math.max(24, width + 24)}
              height={Math.max(24, height + 24)}
              fill="none"
              stroke="#c084fc"
              strokeWidth="2"
              strokeDasharray="10 8"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={selected.x1}
              cy={selected.y1}
              r="11"
              fill="#c084fc"
              stroke="#ffffff"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={selected.x2}
              cy={selected.y2}
              r="11"
              fill="#c084fc"
              stroke="#ffffff"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      })()}
    </svg>
  );
}


function OverlayAlignmentEditor({
  imageA,
  imageB,
  view,
  alignmentA,
  alignmentB,
  opacity,
  onOpacityChange,
  onAlignmentBChange,
  onFrameSizeChange,
}: {
  imageA: string;
  imageB: string;
  view: View;
  alignmentA: CardAlignmentTransform;
  alignmentB: CardAlignmentTransform;
  opacity: number;
  onOpacityChange: (value: number) => void;
  onAlignmentBChange: (value: AlignmentTransform) => void;
  onFrameSizeChange: (value: AlignmentFrameSize) => void;
}) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const frameSize = useFrameSize(frameRef);

  useEffect(() => {
    if (frameSize.width > 0 && frameSize.height > 0) {
      onFrameSizeChange({ width: frameSize.width, height: frameSize.height });
    }
  }, [frameSize.width, frameSize.height, onFrameSizeChange]);

  const alignmentBRef = useRef(alignmentB);
  const cornerDragRef = useRef<{
    pointerId: number;
    corner: PerspectiveCorner;
    startX: number;
    startY: number;
    start: PerspectiveCorners;
  } | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const pointersRef = useRef(
    new Map<number, { x: number; y: number }>()
  );
  const pinchRef = useRef<{
    distance: number;
    scale: number;
    x: number;
    y: number;
    midpointX: number;
    midpointY: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);

  type CardBControlTab =
    | "zoom"
    | "position"
    | "rotation"
    | "skewX"
    | "skewY";

  const [cardBControlTab, setCardBControlTab] =
    useState<CardBControlTab>("zoom");

  useEffect(() => {
    alignmentBRef.current = alignmentB;
  }, [alignmentB]);

  function emitB(next: AlignmentTransform | CardAlignmentTransform) {
  const current = alignmentBRef.current;
  const incoming = next as CardAlignmentTransform;

  const completeNext: CardAlignmentTransform = {
    ...current,
    ...next,
    perspective: incoming.perspective
      ? { ...incoming.perspective }
      : { ...current.perspective },
  };

  alignmentBRef.current = completeNext;
  onAlignmentBChange(completeNext);
}

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      event.stopPropagation();

      const current = alignmentBRef.current;
      const rect = frame!.getBoundingClientRect();
      const cursorX = event.clientX - rect.left - rect.width / 2;
      const cursorY = event.clientY - rect.top - rect.height / 2;
      const nextScale = Math.min(
        8,
        Math.max(0.25, current.scale + (event.deltaY < 0 ? 0.01 : -0.01))
      );

      if (nextScale === current.scale) return;

      const ratio = nextScale / current.scale;
      const next = {
        ...current,
        scale: nextScale,
        x: cursorX - (cursorX - current.x) * ratio,
        y: cursorY - (cursorY - current.y) * ratio,
      };

      alignmentBRef.current = next;
      onAlignmentBChange(next);
    }

    frame.addEventListener("wheel", handleWheel, { passive: false });
    return () => frame.removeEventListener("wheel", handleWheel);
  }, [onAlignmentBChange]);

  function updateB(patch: Partial<CardAlignmentTransform>) {
    emitB({ ...alignmentBRef.current, ...patch });
  }

  function nudge(key: "x" | "y", amount: number) {
    const current = alignmentBRef.current;
    emitB({ ...current, [key]: current[key] + amount });
  }

  function getPinchValues() {
    const points = Array.from(pointersRef.current.values());
    if (points.length < 2) return null;

    const first = points[0];
    const second = points[1];
    const dx = second.x - first.x;
    const dy = second.y - first.y;

    return {
      distance: Math.hypot(dx, dy),
      midpointX: (first.x + second.x) / 2,
      midpointY: (first.y + second.y) / 2,
    };
  }

  function beginPinch() {
    const pinch = getPinchValues();
    const frame = frameRef.current;
    if (!pinch || !frame) return;

    const rect = frame.getBoundingClientRect();
    const current = alignmentBRef.current;

    pinchRef.current = {
      distance: pinch.distance,
      scale: current.scale,
      x: current.x,
      y: current.y,
      midpointX: pinch.midpointX - rect.left - rect.width / 2,
      midpointY: pinch.midpointY - rect.top - rect.height / 2,
    };

    dragRef.current = null;
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (pointersRef.current.size >= 2) {
      beginPinch();
      setDragging(false);
      return;
    }

    const current = alignmentBRef.current;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: current.x,
      originY: current.y,
    };
    setDragging(true);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointersRef.current.has(event.pointerId)) return;

    event.preventDefault();
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const pinch = getPinchValues();
      const frame = frameRef.current;
      if (!pinch || !frame || pinchRef.current.distance <= 0) return;

      const rect = frame.getBoundingClientRect();
      const midpointX = pinch.midpointX - rect.left - rect.width / 2;
      const midpointY = pinch.midpointY - rect.top - rect.height / 2;
      const ratio = pinch.distance / pinchRef.current.distance;
      const nextScale = Math.min(
        8,
        Math.max(0.25, pinchRef.current.scale * ratio)
      );
      const scaleRatio = nextScale / pinchRef.current.scale;

      emitB({
        ...alignmentBRef.current,
        scale: nextScale,
        x:
          midpointX -
          (pinchRef.current.midpointX - pinchRef.current.x) * scaleRatio,
        y:
          midpointY -
          (pinchRef.current.midpointY - pinchRef.current.y) * scaleRatio,
      });
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    emitB({
      ...alignmentBRef.current,
      x: drag.originX + event.clientX - drag.startX,
      y: drag.originY + event.clientY - drag.startY,
    });
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(event.pointerId);

    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }

    if (pointersRef.current.size < 2) {
      pinchRef.current = null;
    }

    setDragging(false);
  }

  function perspectiveKeys(corner: PerspectiveCorner): [keyof PerspectiveCorners, keyof PerspectiveCorners] {
    if (corner === "topLeft") return ["topLeftX", "topLeftY"];
    if (corner === "topRight") return ["topRightX", "topRightY"];
    if (corner === "bottomRight") return ["bottomRightX", "bottomRightY"];
    return ["bottomLeftX", "bottomLeftY"];
  }

  function beginCornerDrag(corner: PerspectiveCorner, event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    cornerDragRef.current = {
      pointerId: event.pointerId,
      corner,
      startX: event.clientX,
      startY: event.clientY,
      start: { ...alignmentBRef.current.perspective },
    };
  }

  function moveCorner(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = cornerDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || frameSize.width <= 0 || frameSize.height <= 0) return;
    event.preventDefault();
    event.stopPropagation();
    const [xKey, yKey] = perspectiveKeys(drag.corner);
    const scale = Math.max(0.25, alignmentBRef.current.scale);
    const dx = ((event.clientX - drag.startX) / (frameSize.width * scale)) * 100;
    const dy = ((event.clientY - drag.startY) / (frameSize.height * scale)) * 100;
    const nextPerspective = { ...drag.start };
    nextPerspective[xKey] = Math.max(-30, Math.min(30, drag.start[xKey] + dx));
    nextPerspective[yKey] = Math.max(-30, Math.min(30, drag.start[yKey] + dy));
    updateB({ perspective: nextPerspective });
  }

  function endCornerDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (cornerDragRef.current?.pointerId === event.pointerId) cornerDragRef.current = null;
    event.stopPropagation();
  }

  function resetPerspective() {
    cornerDragRef.current = null;

    // Build a completely fresh perspective object so React receives a new
    // nested reference and the overlay/corner handles update immediately.
    const nextPerspective: PerspectiveCorners = {
      topLeftX: 0,
      topLeftY: 0,
      topRightX: 0,
      topRightY: 0,
      bottomRightX: 0,
      bottomRightY: 0,
      bottomLeftX: 0,
      bottomLeftY: 0,
    };

    const next: CardAlignmentTransform = {
      ...alignmentBRef.current,
      perspective: nextPerspective,
    };

    // Update the ref first so a pending wheel/drag event cannot restore the
    // previous corner values before the parent state finishes rendering.
    alignmentBRef.current = next;
    dragRef.current = null;
    pinchRef.current = null;
    pointersRef.current.clear();
    setDragging(false);
    onAlignmentBChange(next);
  }

  function imageTransform(alignment: CardAlignmentTransform) {
    return `translate(calc(-50% + ${alignment.x}px), calc(-50% + ${alignment.y}px)) scale(${alignment.scale}) rotate(${alignment.rotation}deg) skewX(${alignment.skewX}deg) skewY(${alignment.skewY}deg) ${perspectiveMatrix3d(frameSize.width, frameSize.height, alignment.perspective)}`;
  }

  const referenceWidth =
    alignmentA.referenceWidth ||
    (alignmentA.orientation === "portrait" ? 2.5 : 3.5);
  const referenceHeight =
    alignmentA.referenceHeight ||
    (alignmentA.orientation === "portrait" ? 3.5 : 2.5);
  const frameAspect = `${referenceWidth} / ${referenceHeight}`;
  const frameWidth =
    alignmentA.orientation === "portrait"
      ? "max-w-[500px]"
      : "max-w-[690px]";

  return (
    <div className="grid gap-px bg-neutral-800 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-h-[540px] flex-col items-center justify-center bg-[#050505] p-3 md:min-h-[620px] md:p-5">
        <div className={`w-full ${frameWidth}`}>
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <div className="rounded border border-green-900 bg-black/85 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-green-300">
              Card A Locked
            </div>
            <div className="rounded border border-purple-900 bg-black/85 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-purple-300">
              Card B {opacity}%
            </div>
          </div>
          <div
          ref={frameRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          className={`relative w-full overflow-hidden border border-purple-900/60 bg-black touch-none overscroll-contain ${frameWidth} ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
          style={{ aspectRatio: frameAspect }}
          title="Drag Card B to position • Wheel or pinch to zoom Card B"
        >
          <img
            src={imageA}
            alt={`Card A ${view} reference`}
            draggable={false}
            className="pointer-events-none absolute left-1/2 top-1/2 h-full w-full max-w-none select-none object-contain"
            style={{
              transform: imageTransform(alignmentA),
              transformOrigin: "center center",
            }}
          />

          <img
            src={imageB}
            alt={`Card B ${view} overlay`}
            draggable={false}
            className="pointer-events-none absolute left-1/2 top-1/2 h-full w-full max-w-none select-none object-contain"
            style={{
              opacity: opacity / 100,
              transform: imageTransform(alignmentB),
              transformOrigin: "center center",
            }}
          />

          {/* Perspective handles intentionally stay inside the visible frame.
              The previous version transformed this entire handle layer with Card B.
              At zoom levels above 100%, that pushed the handles outside the frame's
              overflow-hidden area, which made them impossible to see or click. */}
          <div className="pointer-events-none absolute inset-0 z-30">
            {([
              ["topLeft", 18, 18, "TL"],
              ["topRight", frameSize.width - 18, 18, "TR"],
              ["bottomRight", frameSize.width - 18, frameSize.height - 18, "BR"],
              ["bottomLeft", 18, frameSize.height - 18, "BL"],
            ] as const).map(([corner, left, top, label]) => (
              <button
                key={corner}
                type="button"
                onPointerDown={(event) => beginCornerDrag(corner, event)}
                onPointerMove={moveCorner}
                onPointerUp={endCornerDrag}
                onPointerCancel={endCornerDrag}
                className="pointer-events-auto absolute z-40 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 touch-none select-none items-center justify-center rounded-full border-2 border-white bg-purple-600 text-[9px] font-black text-white shadow-[0_0_14px_rgba(168,85,247,1)] hover:bg-purple-500"
                style={{ left: `${left}px`, top: `${top}px` }}
                title={`Drag ${label} to perspective-correct Card B`}
                aria-label={`Drag ${label} corner to perspective-correct Card B`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white/60">
            Drag B to move • Wheel / pinch to zoom B
          </div>
          </div>
        </div>
      </div>

      <div className="bg-[#0b0b0d] p-4">
        <div className="text-xs font-black uppercase tracking-widest text-purple-300">
          Align Card B
        </div>
        <p className="mt-2 text-[11px] leading-5 text-neutral-500">
          Card A is fixed. Dragging and zooming in the image changes Card B only. The controls below also change Card B only.
        </p>

        <div className="mt-5 space-y-5">
          <AlignmentRange
            label="B Opacity"
            value={opacity}
            min={0}
            max={100}
            step={1}
            suffix="%"
            onChange={onOpacityChange}
          />
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { value: "zoom", label: "Fine Zoom" },
              { value: "position", label: "Position" },
              { value: "rotation", label: "Rotation" },
              { value: "skewX", label: "H-Skew" },
              { value: "skewY", label: "V-Skew" },
            ].map((tab) => {
              const selected = cardBControlTab === tab.value;

              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() =>
                    setCardBControlTab(tab.value as CardBControlTab)
                  }
                  className={`rounded border px-3 py-2 text-[9px] font-black uppercase tracking-wider transition ${
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

          {cardBControlTab === "zoom" && (
            <AlignmentRange
              label="Fine Zoom"
              value={Math.round(alignmentB.scale * 100)}
              min={25}
              max={800}
              step={1}
              suffix="%"
              onChange={(value) => updateB({ scale: value / 100 })}
            />
          )}

          {cardBControlTab === "position" && (
            <div className="grid grid-cols-2 gap-3">
              <AlignmentNudge
                label="Horizontal"
                value={alignmentB.x}
                onMinus={() => nudge("x", -1)}
                onPlus={() => nudge("x", 1)}
              />
              <AlignmentNudge
                label="Vertical"
                value={alignmentB.y}
                onMinus={() => nudge("y", -1)}
                onPlus={() => nudge("y", 1)}
              />
            </div>
          )}

          {cardBControlTab === "rotation" && (
            <div className="space-y-4">
              <AlignmentRange
                label="Fine Rotation"
                value={alignmentB.rotation}
                min={-180}
                max={180}
                step={0.1}
                suffix="°"
                onChange={(value) => updateB({ rotation: value })}
              />

              <div>
                <div className="mb-2 text-center text-[9px] font-black uppercase tracking-wider text-neutral-500">
                  Rotate 90° / Reset
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateB({
                        rotation: alignmentB.rotation - 90,
                        orientation: alignmentA.orientation,
                      })
                    }
                    className="rounded border border-neutral-700 bg-black px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-purple-300 transition hover:border-purple-500"
                  >
                    ↺ 90°
                  </button>
                  <button
                    type="button"
                    onClick={() => updateB({ rotation: 0 })}
                    className="rounded border border-neutral-700 bg-black px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-neutral-300 transition hover:border-purple-500"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateB({
                        rotation: alignmentB.rotation + 90,
                        orientation: alignmentA.orientation,
                      })
                    }
                    className="rounded border border-neutral-700 bg-black px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-purple-300 transition hover:border-purple-500"
                  >
                    90° ↻
                  </button>
                </div>
              </div>
            </div>
          )}

          {cardBControlTab === "skewX" && (
            <AlignmentRange
              label="Horizontal Skew"
              value={alignmentB.skewX}
              min={-10}
              max={10}
              step={0.1}
              suffix="°"
              onChange={(value) => updateB({ skewX: value })}
            />
          )}

          {cardBControlTab === "skewY" && (
            <AlignmentRange
              label="Vertical Skew"
              value={alignmentB.skewY}
              min={-10}
              max={10}
              step={0.1}
              suffix="°"
              onChange={(value) => updateB({ skewY: value })}
            />
          )}

          <div className="rounded-lg border border-purple-900/70 bg-purple-950/15 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-purple-300">Corner / Perspective Correction</div>
                <div className="mt-1 text-[10px] leading-4 text-neutral-500">Drag the TL, TR, BR, or BL handles directly on Card B to match each corner to Card A.</div>
              </div>
              <button
                type="button"
                onClick={resetPerspective}
                className="shrink-0 rounded border border-neutral-700 bg-black px-3 py-2 text-[9px] font-black uppercase tracking-wider text-neutral-300 hover:border-purple-500"
              >
                Reset Corners
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={() => onAlignmentBChange({
              ...cloneDefaultAlignment(),
              orientation: alignmentA.orientation,
              referencePreset: alignmentA.referencePreset,
              referenceWidth: alignmentA.referenceWidth,
              referenceHeight: alignmentA.referenceHeight,
            })}
            className="w-full rounded border border-neutral-700 bg-black px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-neutral-300 transition hover:border-purple-500"
          >
            Reset Card B
          </button>
        </div>
      </div>
    </div>
  );
}

function AlignmentRange({ label, value, min, max, step, suffix, onChange }: { label: string; value: number; min: number; max: number; step: number; suffix: string; onChange: (value: number) => void }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">{label}</span>
        <span className="text-xs font-black text-purple-300">{Number(value.toFixed(2))}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-purple-500" />
    </div>
  );
}

function AlignmentNudge({ label, value, onMinus, onPlus }: { label: string; value: number; onMinus: () => void; onPlus: () => void }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">{label}</span>
        <span className="text-[10px] font-black text-purple-300">{Number(value.toFixed(1))}px</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onMinus} className="rounded border border-neutral-700 bg-black px-3 py-2 text-sm font-black text-purple-300 transition hover:border-purple-500">−1</button>
        <button type="button" onClick={onPlus} className="rounded border border-neutral-700 bg-black px-3 py-2 text-sm font-black text-purple-300 transition hover:border-purple-500">+1</button>
      </div>
    </div>
  );
}

function OverlayComparisonViewer({

  imageA,

  imageB,

  view,

  alignmentA,

  alignmentB,

  comparisonTransform,

  referenceFrameSize,

  opacity,

  onOpacityChange,

  onComparisonChange,

}: {

  imageA: string;

  imageB: string;

  view: View;

  alignmentA: CardAlignmentTransform;

  alignmentB: CardAlignmentTransform;

  comparisonTransform: ComparisonTransform;

  referenceFrameSize?: AlignmentFrameSize | null;

  opacity: number;

  onOpacityChange: (value: number) => void;

  onComparisonChange: (value: ComparisonTransform) => void;

}) {

  const frameRef = useRef<HTMLDivElement | null>(null);

  const frameSize = useFrameSize(frameRef);

  const transformRef = useRef(comparisonTransform);

  const onChangeRef = useRef(onComparisonChange);

  const dragRef = useRef<{

    pointerId: number;

    startX: number;

    startY: number;

    originX: number;

    originY: number;

  } | null>(null);

  const [dragging, setDragging] = useState(false);



  useEffect(() => {

    transformRef.current = comparisonTransform;

  }, [comparisonTransform]);



  useEffect(() => {

    onChangeRef.current = onComparisonChange;

  }, [onComparisonChange]);



  useEffect(() => {

    const frame = frameRef.current;

    if (!frame) return;



    function handleWheel(event: WheelEvent) {

      event.preventDefault();

      event.stopPropagation();



      const current = transformRef.current;

      const rect = frame!.getBoundingClientRect();

      const cursorX = event.clientX - rect.left - rect.width / 2;

      const cursorY = event.clientY - rect.top - rect.height / 2;

      const direction = event.deltaY < 0 ? 0.1 : -0.1;

      const nextScale = clampComparisonScale(current.scale + direction);



      if (nextScale === current.scale) return;



      const ratio = nextScale / current.scale;

      const next = {

        scale: nextScale,

        x: cursorX - (cursorX - current.x) * ratio,

        y: cursorY - (cursorY - current.y) * ratio,

      };



      transformRef.current = next;

      onChangeRef.current(next);

    }



    frame.addEventListener("wheel", handleWheel, { passive: false });

    return () => frame.removeEventListener("wheel", handleWheel);

  }, []);



  function emitTransform(next: ComparisonTransform) {

    const normalized = {

      scale: clampComparisonScale(next.scale),

      x: next.x,

      y: next.y,

    };



    transformRef.current = normalized;

    onComparisonChange(normalized);

  }



  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {

    if (event.pointerType === "mouse" && event.button !== 0) return;



    event.currentTarget.setPointerCapture(event.pointerId);

    dragRef.current = {

      pointerId: event.pointerId,

      startX: event.clientX,

      startY: event.clientY,

      originX: comparisonTransform.x,

      originY: comparisonTransform.y,

    };

    setDragging(true);

  }



  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {

    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) return;



    event.preventDefault();

    emitTransform({

      ...comparisonTransform,

      x: drag.originX + event.clientX - drag.startX,

      y: drag.originY + event.clientY - drag.startY,

    });

  }



  function handlePointerEnd(event: ReactPointerEvent<HTMLDivElement>) {

    if (dragRef.current?.pointerId === event.pointerId) {

      dragRef.current = null;

    }

    setDragging(false);

  }



  function handleDoubleClick() {

    emitTransform(cloneDefaultComparisonTransform());

  }



  const referenceWidth =
    alignmentA.referenceWidth ||
    (alignmentA.orientation === "portrait" ? 2.5 : 3.5);
  const referenceHeight =
    alignmentA.referenceHeight ||
    (alignmentA.orientation === "portrait" ? 3.5 : 2.5);
  const frameAspect = `${referenceWidth} / ${referenceHeight}`;



  const frameWidth =

    alignmentA.orientation === "portrait"

      ? "max-w-[620px]"

      : "max-w-[880px]";



  function imageTransform(alignment: CardAlignmentTransform) {

    const alignmentX = referenceFrameSize?.width
      ? alignment.x * (frameSize.width / referenceFrameSize.width)
      : alignment.x;
    const alignmentY = referenceFrameSize?.height
      ? alignment.y * (frameSize.height / referenceFrameSize.height)
      : alignment.y;

    return `

      translate(

        calc(-50% + ${alignmentX}px),

        calc(-50% + ${alignmentY}px)

      )

      scale(${alignment.scale})

      rotate(${alignment.rotation}deg)

      skewX(${alignment.skewX}deg)

      skewY(${alignment.skewY}deg)
      ${perspectiveMatrix3d(frameSize.width, frameSize.height, alignment.perspective)}

    `;

  }



  return (

    <div className="bg-black">

      <div className="border-b border-neutral-800 bg-[#0b0b0d] px-4 py-4">

        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <div className="text-xs font-black uppercase tracking-widest text-purple-300">

              Opacity Overlay

            </div>

            <div className="mt-1 text-[10px] uppercase tracking-wider text-neutral-500">

              Card A is the base • Card B is the adjustable overlay

            </div>

          </div>



          <div className="flex min-w-0 items-center gap-3 sm:min-w-[320px]">

            <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-neutral-400">

              B Opacity

            </span>

            <input

              type="range"

              min="0"

              max="100"

              step="1"

              value={opacity}

              onChange={(event) => onOpacityChange(Number(event.target.value))}

              className="min-w-0 flex-1 accent-purple-500"

              aria-label="Card B overlay opacity"

            />

            <span className="w-10 text-right text-xs font-black text-purple-300">

              {opacity}%

            </span>

          </div>

        </div>

      </div>



      <div className="flex min-h-[520px] items-center justify-center overflow-hidden bg-[#050505] p-4 md:min-h-[680px]">

        <div

          ref={frameRef}

          onPointerDown={handlePointerDown}

          onPointerMove={handlePointerMove}

          onPointerUp={handlePointerEnd}

          onPointerCancel={handlePointerEnd}

          onDoubleClick={handleDoubleClick}

          className={`relative w-full overflow-hidden bg-black touch-none overscroll-contain ${frameWidth} ${

            dragging ? "cursor-grabbing" : "cursor-grab"

          }`}
          style={{ aspectRatio: frameAspect }}

          title="Drag to pan • Wheel to zoom • Double-click to reset view"

        >

          <div

            className="pointer-events-none absolute inset-0"

            style={{

              transform: `

                translate(

                  ${comparisonTransform.x}px,

                  ${comparisonTransform.y}px

                )

                scale(${comparisonTransform.scale * FINAL_NORMALIZED_DISPLAY_FIT})

              `,

              transformOrigin: "center center",

            }}

          >

            <img

              src={imageA}

              alt={`Card A ${view}`}

              draggable={false}

              className="pointer-events-none absolute left-1/2 top-1/2 h-full w-full max-w-none select-none object-contain"

              style={{

                transform: imageTransform(alignmentA),

                transformOrigin: "center center",

              }}

            />



            <img

              src={imageB}

              alt={`Card B ${view} overlay`}

              draggable={false}

              className="pointer-events-none absolute left-1/2 top-1/2 h-full w-full max-w-none select-none object-contain"

              style={{

                opacity: opacity / 100,

                transform: imageTransform(alignmentB),

                transformOrigin: "center center",

              }}

            />

          </div>



          <div className="pointer-events-none absolute left-3 top-3 rounded border border-neutral-700 bg-black/80 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white/70">

            A Base + B {opacity}%

          </div>



          <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white/60">

            Drag to pan • Wheel to zoom • Double-click to reset

          </div>

        </div>

      </div>

    </div>

  );

}






function SwipeComparisonViewer({
  imageA,
  imageB,
  view,
  alignmentA,
  alignmentB,
  comparisonTransform,
  referenceFrameSize,
  onComparisonChange,
}: {
  imageA: string;
  imageB: string;
  view: View;
  alignmentA: CardAlignmentTransform;
  alignmentB: CardAlignmentTransform;
  comparisonTransform: ComparisonTransform;
  referenceFrameSize?: AlignmentFrameSize | null;
  onComparisonChange: (value: ComparisonTransform) => void;
}) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const frameSize = useFrameSize(frameRef);
  const transformRef = useRef(comparisonTransform);
  const onChangeRef = useRef(onComparisonChange);
  const [swipePosition, setSwipePosition] = useState(50);
  const [draggingView, setDraggingView] = useState(false);

  const panDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const swipeDragRef = useRef<number | null>(null);

  useEffect(() => {
    transformRef.current = comparisonTransform;
  }, [comparisonTransform]);

  useEffect(() => {
    onChangeRef.current = onComparisonChange;
  }, [onComparisonChange]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      event.stopPropagation();

      const current = transformRef.current;
      const rect = frame!.getBoundingClientRect();
      const cursorX = event.clientX - rect.left - rect.width / 2;
      const cursorY = event.clientY - rect.top - rect.height / 2;
      const nextScale = clampComparisonScale(
        current.scale + (event.deltaY < 0 ? 0.1 : -0.1)
      );

      if (nextScale === current.scale) return;

      const ratio = nextScale / current.scale;
      const next = {
        scale: nextScale,
        x: cursorX - (cursorX - current.x) * ratio,
        y: cursorY - (cursorY - current.y) * ratio,
      };

      transformRef.current = next;
      onChangeRef.current(next);
    }

    frame.addEventListener("wheel", handleWheel, { passive: false });
    return () => frame.removeEventListener("wheel", handleWheel);
  }, []);

  function emitTransform(next: ComparisonTransform) {
    const normalized = {
      scale: clampComparisonScale(next.scale),
      x: next.x,
      y: next.y,
    };
    transformRef.current = normalized;
    onComparisonChange(normalized);
  }

  function updateSwipeFromClientX(clientX: number) {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const next = ((clientX - rect.left) / rect.width) * 100;
    setSwipePosition(Math.max(0, Math.min(100, next)));
  }

  function handleFramePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    panDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: comparisonTransform.x,
      originY: comparisonTransform.y,
    };
    setDraggingView(true);
  }

  function handleFramePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = panDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    emitTransform({
      ...comparisonTransform,
      x: drag.originX + event.clientX - drag.startX,
      y: drag.originY + event.clientY - drag.startY,
    });
  }

  function handleFramePointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (panDragRef.current?.pointerId === event.pointerId) {
      panDragRef.current = null;
    }
    setDraggingView(false);
  }

  function handleSwipePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    swipeDragRef.current = event.pointerId;
    updateSwipeFromClientX(event.clientX);
  }

  function handleSwipePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (swipeDragRef.current !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    updateSwipeFromClientX(event.clientX);
  }

  function handleSwipePointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (swipeDragRef.current !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    swipeDragRef.current = null;
  }

  function handleDoubleClick() {
    emitTransform(cloneDefaultComparisonTransform());
    setSwipePosition(50);
  }

  const referenceWidth =
    alignmentA.referenceWidth ||
    (alignmentA.orientation === "portrait" ? 2.5 : 3.5);
  const referenceHeight =
    alignmentA.referenceHeight ||
    (alignmentA.orientation === "portrait" ? 3.5 : 2.5);
  const frameAspect = `${referenceWidth} / ${referenceHeight}`;
  const frameWidth =
    alignmentA.orientation === "portrait"
      ? "max-w-[440px]"
      : "max-w-[680px]";

  function imageTransform(alignment: CardAlignmentTransform) {
    const alignmentX = referenceFrameSize?.width
      ? alignment.x * (frameSize.width / referenceFrameSize.width)
      : alignment.x;
    const alignmentY = referenceFrameSize?.height
      ? alignment.y * (frameSize.height / referenceFrameSize.height)
      : alignment.y;

    return `
      translate(
        calc(-50% + ${alignmentX}px),
        calc(-50% + ${alignmentY}px)
      )
      scale(${alignment.scale})
      rotate(${alignment.rotation}deg)
      skewX(${alignment.skewX}deg)
      skewY(${alignment.skewY}deg)
      ${perspectiveMatrix3d(
        frameSize.width,
        frameSize.height,
        alignment.perspective
      )}
    `;
  }

  const sharedTransform = `
    translate(${comparisonTransform.x}px, ${comparisonTransform.y}px)
    scale(${comparisonTransform.scale * FINAL_NORMALIZED_DISPLAY_FIT})
  `;

  return (
    <div className="bg-black">
      <div className="border-b border-neutral-800 bg-[#0b0b0d] px-4 py-4">
        <div className="mx-auto text-center">
          <div className="text-xs font-black uppercase tracking-widest text-purple-300">
            Before / After Swipe
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-neutral-500">
            Drag the purple divider to reveal Card A or Card B
          </div>
        </div>
      </div>

      <div className="flex min-h-[420px] items-center justify-center overflow-hidden bg-[#050505] p-4 md:min-h-[540px]">
        <div
          ref={frameRef}
          onPointerDown={handleFramePointerDown}
          onPointerMove={handleFramePointerMove}
          onPointerUp={handleFramePointerEnd}
          onPointerCancel={handleFramePointerEnd}
          onDoubleClick={handleDoubleClick}
          className={`relative w-full overflow-hidden bg-black touch-none overscroll-contain ${frameWidth} ${
            draggingView ? "cursor-grabbing" : "cursor-grab"
          }`}
          style={{ aspectRatio: frameAspect }}
          title="Drag image to pan • Wheel to zoom • Drag purple divider to compare • Double-click to reset"
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              transform: sharedTransform,
              transformOrigin: "center center",
            }}
          >
            <img
              src={imageB}
              alt={`Card B ${view}`}
              draggable={false}
              className="pointer-events-none absolute left-1/2 top-1/2 h-full w-full max-w-none select-none object-contain"
              style={{
                transform: imageTransform(alignmentB),
                transformOrigin: "center center",
              }}
            />
          </div>

          <div
            className="pointer-events-none absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 ${100 - swipePosition}% 0 0)` }}
          >
            <div
              className="absolute inset-0"
              style={{
                transform: sharedTransform,
                transformOrigin: "center center",
              }}
            >
              <img
                src={imageA}
                alt={`Card A ${view}`}
                draggable={false}
                className="pointer-events-none absolute left-1/2 top-1/2 h-full w-full max-w-none select-none object-contain"
                style={{
                  transform: imageTransform(alignmentA),
                  transformOrigin: "center center",
                }}
              />
            </div>
          </div>

          <div className="pointer-events-none absolute left-3 top-3 z-30 rounded border border-neutral-700 bg-black/80 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white">
            Card A
          </div>
          <div className="pointer-events-none absolute right-3 top-3 z-30 rounded border border-neutral-700 bg-black/80 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white">
            Card B
          </div>

          <div
            className="absolute bottom-0 top-0 z-40 w-10 -translate-x-1/2 cursor-ew-resize touch-none"
            style={{ left: `${swipePosition}%` }}
            onPointerDown={handleSwipePointerDown}
            onPointerMove={handleSwipePointerMove}
            onPointerUp={handleSwipePointerEnd}
            onPointerCancel={handleSwipePointerEnd}
            role="slider"
            aria-label="Card comparison divider"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(swipePosition)}
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                setSwipePosition((current) => Math.max(0, current - 2));
              } else if (event.key === "ArrowRight") {
                event.preventDefault();
                setSwipePosition((current) => Math.min(100, current + 2));
              } else if (event.key === "Home") {
                event.preventDefault();
                setSwipePosition(0);
              } else if (event.key === "End") {
                event.preventDefault();
                setSwipePosition(100);
              }
            }}
          >
            <div className="pointer-events-none absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.9)]" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-purple-300 bg-purple-600 text-sm font-black text-white shadow-lg">
              ↔
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-2 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white/60">
            Drag divider to compare • Drag image to pan • Wheel to zoom
          </div>
        </div>
      </div>
    </div>
  );
}


function clampComparisonScale(

  scale: number

) {

  return Math.min(

    6,

    Math.max(

      1,

      Number(

        scale.toFixed(2)

      )

    )

  );

}