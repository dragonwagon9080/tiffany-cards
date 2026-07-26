"use client";

export type SubmissionProgressController = {
  update: (stage: string) => void;
  close: () => void;
};

const MINIMUM_VISIBLE_MS = 1500;

function applyStyles(
  element: HTMLElement,
  styles: Partial<CSSStyleDeclaration>
) {
  Object.assign(
    element.style,
    styles
  );
}

/**
 * Creates the TNCE progress screen directly in the
 * browser DOM. It intentionally does not use React so
 * development Fast Refresh cannot interrupt it.
 */
export function openSubmissionProgress(
  projectLabel: string,
  initialStage: string
): SubmissionProgressController {
  if (
    typeof document === "undefined"
  ) {
    return {
      update: () => {},
      close: () => {},
    };
  }

  /*
   * Remove a stale screen left by an interrupted upload.
   */
  document
    .querySelectorAll(
      "[data-tnce-progress]"
    )
    .forEach((element) =>
      element.remove()
    );

  const openedAt = Date.now();
  let closed = false;

  const overlay =
    document.createElement("div");

  overlay.setAttribute(
    "data-tnce-progress",
    "true"
  );

  overlay.setAttribute(
    "role",
    "status"
  );

  overlay.setAttribute(
    "aria-live",
    "polite"
  );

  overlay.setAttribute(
    "aria-busy",
    "true"
  );

  applyStyles(overlay, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    background:
      "rgba(0, 0, 0, 0.94)",
    backdropFilter: "blur(6px)",
  });

  const card =
    document.createElement("div");

  applyStyles(card, {
    width: "100%",
    maxWidth: "448px",
    padding: "28px",
    textAlign: "center",
    color: "#ffffff",
    background: "#0a0a0a",
    border:
      "1px solid rgba(212, 175, 55, 0.75)",
    borderRadius: "16px",
    boxShadow:
      "0 0 45px rgba(212, 175, 55, 0.22)",
  });

  const spinner =
    document.createElement("div");

  applyStyles(spinner, {
    width: "72px",
    height: "72px",
    margin: "0 auto",
    border:
      "5px solid #262626",
    borderTopColor: "#d4af37",
    borderRightColor: "#d4af37",
    borderRadius: "9999px",
  });

  spinner.animate(
    [
      {
        transform:
          "rotate(0deg)",
      },
      {
        transform:
          "rotate(360deg)",
      },
    ],
    {
      duration: 850,
      iterations: Infinity,
    }
  );

  const project =
    document.createElement("div");

  project.textContent =
    projectLabel;

  applyStyles(project, {
    marginTop: "24px",
    color: "#d4af37",
    fontSize: "12px",
    fontWeight: "900",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
  });

  const heading =
    document.createElement("div");

  heading.textContent =
    "Processing Submission";

  applyStyles(heading, {
    marginTop: "12px",
    fontSize: "24px",
    lineHeight: "32px",
    fontWeight: "900",
  });

  const stage =
    document.createElement("div");

  stage.textContent =
    initialStage ||
    "Preparing submission...";

  applyStyles(stage, {
    minHeight: "24px",
    marginTop: "12px",
    color: "#e5e5e5",
    fontSize: "14px",
    lineHeight: "22px",
    fontWeight: "600",
  });

  const dots =
    document.createElement("div");

  applyStyles(dots, {
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    marginTop: "20px",
  });

  for (
    let index = 0;
    index < 3;
    index++
  ) {
    const dot =
      document.createElement("span");

    applyStyles(dot, {
      display: "block",
      width: "8px",
      height: "8px",
      background: "#d4af37",
      borderRadius: "9999px",
    });

    dot.animate(
      [
        { opacity: "0.25" },
        { opacity: "1" },
        { opacity: "0.25" },
      ],
      {
        duration: 900,
        iterations: Infinity,
        delay: index * 160,
      }
    );

    dots.appendChild(dot);
  }

  const message =
    document.createElement("div");

  message.textContent =
    "Images and publishing may take a moment. Please do not close or refresh this page.";

  applyStyles(message, {
    marginTop: "20px",
    color: "#737373",
    fontSize: "12px",
    lineHeight: "20px",
  });

  card.append(
    spinner,
    project,
    heading,
    stage,
    dots,
    message
  );

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  function ensureAttached() {
    if (
      !closed &&
      !overlay.isConnected
    ) {
      document.body.appendChild(
        overlay
      );
    }
  }

  /*
   * Next.js may run Fast Refresh the first time an upload
   * API route compiles in development. Fast Refresh can
   * remove DOM nodes outside the React application. Keep
   * this screen attached until the submission completes.
   */
  const attachmentWatch =
    window.setInterval(
      ensureAttached,
      100
    );

  function removeOverlay() {
    if (closed) return;
    closed = true;

    window.clearInterval(
      attachmentWatch
    );

    overlay.remove();
  }

  return {
    update(nextStage: string) {
      if (closed) return;

      ensureAttached();

      stage.textContent =
        nextStage ||
        "Processing submission...";
    },

    close() {
      if (closed) return;

      const remaining =
        MINIMUM_VISIBLE_MS -
        (Date.now() - openedAt);

      if (remaining > 0) {
        window.setTimeout(
          removeOverlay,
          remaining
        );
        return;
      }

      removeOverlay();
    },
  };
}