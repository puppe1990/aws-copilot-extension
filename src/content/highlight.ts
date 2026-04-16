import { assertSafeElement, assertSafeSelector } from '../safety/safetyRules';

const HIGHLIGHT_ATTRIBUTE = 'data-aws-copilot-highlight';

export function clearHighlight(): void {
  document.querySelectorAll(`[${HIGHLIGHT_ATTRIBUTE}]`).forEach((element) => element.remove());
}

export function highlightElement(target: HTMLElement): void {
  clearHighlight();
  const rect = target.getBoundingClientRect();
  const overlay = document.createElement('div');
  overlay.setAttribute(HIGHLIGHT_ATTRIBUTE, 'true');
  overlay.style.position = 'fixed';
  overlay.style.left = `${rect.left - 4}px`;
  overlay.style.top = `${rect.top - 4}px`;
  overlay.style.width = `${rect.width + 8}px`;
  overlay.style.height = `${rect.height + 8}px`;
  overlay.style.border = '3px solid #10b981';
  overlay.style.borderRadius = '6px';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '2147483647';
  overlay.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.2)';
  document.body.appendChild(overlay);
}

export function highlightSelector(selector: string): boolean {
  assertSafeSelector(selector);

  let targets: NodeListOf<Element>;

  try {
    targets = document.querySelectorAll(selector);
  } catch {
    clearHighlight();
    return false;
  }

  if (targets.length !== 1) {
    clearHighlight();
    return false;
  }

  const target = targets[0];

  if (!(target instanceof HTMLElement)) {
    clearHighlight();
    return false;
  }

  try {
    assertSafeElement(target);
  } catch (error) {
    clearHighlight();
    throw error;
  }

  highlightElement(target);
  return true;
}
