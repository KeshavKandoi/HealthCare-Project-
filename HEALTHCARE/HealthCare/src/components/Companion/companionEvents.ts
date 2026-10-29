const OPEN = 'heartline:companion-open';
// Remembered until the widget subscribes, so a request made during page load is not lost.
let requested = false;

/** Opens the floating Heartline Companion from anywhere, such as the sidebar. */
export function openCompanion() {
  requested = true;
  window.dispatchEvent(new Event(OPEN));
}

export function onCompanionOpen(listener: () => void) {
  const handle = () => { requested = false; listener(); };
  if (requested) handle();
  window.addEventListener(OPEN, handle);
  return () => window.removeEventListener(OPEN, handle);
}
