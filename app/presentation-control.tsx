"use client";

export function PresentationControl({ active, onChange, onError }: { active: boolean; onChange: (active: boolean) => void; onError: (message: string) => void }) {
  const exit = async () => {
    onChange(false);
    try {
      if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen();
    } catch {
      onError("Presentation mode closed, but the browser could not exit full screen automatically.");
    }
  };

  if (!active) return null;
  return <button className="presentation-exit" onClick={() => void exit()} title="Exit presentation mode (P)">EXIT PRESENTATION</button>;
}

export async function enterPresentation(onChange: (active: boolean) => void, onError?: (message: string) => void) {
  onChange(true);
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    }
  } catch {
    onError?.("Presentation mode is active, but this browser did not allow full screen. Press F11 or use the browser menu if needed.");
  }
}
