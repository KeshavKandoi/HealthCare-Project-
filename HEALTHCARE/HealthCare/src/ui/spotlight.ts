import type { PointerEvent } from 'react';

/** Keep the card glow close to the pointer without adding animation dependencies. */
export function moveSpotlight(event: PointerEvent<HTMLElement>): void {
  if (event.pointerType === 'touch' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const bounds = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty('--spot-x', `${event.clientX - bounds.left}px`);
  event.currentTarget.style.setProperty('--spot-y', `${event.clientY - bounds.top}px`);
}
