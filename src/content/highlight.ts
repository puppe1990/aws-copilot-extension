import { assertSafeElement, assertSafeSelector } from '../safety/safetyRules';

const HIGHLIGHT_ATTRIBUTE = 'data-aws-copilot-highlight';
const GUIDE_CARD_ATTRIBUTE = 'data-aws-copilot-guide-card';
const PAGE_SCROLL_LOCK_ATTRIBUTE = 'data-aws-copilot-scroll-lock';

type ScrollLockState = {
  htmlOverflow: string;
  bodyOverflow: string;
};

let activeScrollLock: ScrollLockState | null = null;

export type GuideOverlayContent = {
  progressLabel: string;
  stepTitle: string;
  stepBody: string;
  substeps?: string[];
  placement?: 'auto' | 'bottomRight';
  dimBackdrop?: boolean;
  showBackdropWhenUntargeted?: boolean;
  codeBlock?: string | null;
  primaryActionLabel: string;
  secondaryActionLabel: string;
  canAdvance: boolean;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
  onCopyAction?: () => void;
  copyActionLabel?: string;
};

export function clearHighlight(): void {
  document.querySelectorAll(`[${HIGHLIGHT_ATTRIBUTE}], [${GUIDE_CARD_ATTRIBUTE}]`).forEach((element) => element.remove());
  unlockPageScroll();
}

function createLayer(className: string, attributeName = HIGHLIGHT_ATTRIBUTE): HTMLDivElement {
  const element = document.createElement('div');
  element.setAttribute(attributeName, 'true');
  element.className = className;
  return element;
}

function lockPageScroll(): void {
  if (activeScrollLock) {
    return;
  }

  activeScrollLock = {
    htmlOverflow: document.documentElement.style.overflow,
    bodyOverflow: document.body.style.overflow
  };
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  document.documentElement.setAttribute(PAGE_SCROLL_LOCK_ATTRIBUTE, 'true');
}

function unlockPageScroll(): void {
  if (!activeScrollLock) {
    return;
  }

  document.documentElement.style.overflow = activeScrollLock.htmlOverflow;
  document.body.style.overflow = activeScrollLock.bodyOverflow;
  document.documentElement.removeAttribute(PAGE_SCROLL_LOCK_ATTRIBUTE);
  activeScrollLock = null;
}

export function highlightElement(target: HTMLElement, options: { dimBackdrop?: boolean } = {}): void {
  clearHighlight();
  const rect = target.getBoundingClientRect();
  const overlay = createLayer('');
  overlay.style.left = `${rect.left - 12}px`;
  overlay.style.top = `${rect.top - 12}px`;
  overlay.style.width = `${rect.width + 24}px`;
  overlay.style.height = `${rect.height + 24}px`;
  overlay.style.position = 'fixed';
  overlay.style.zIndex = '2147483646';
  overlay.style.pointerEvents = 'none';
  overlay.style.borderRadius = '24px';
  overlay.style.border = '2px solid #ff9900';
  overlay.style.boxShadow =
    options.dimBackdrop === false
      ? '0 0 0 4px rgba(255, 153, 0, 0.22)'
      : '0 0 0 9999px rgba(2, 6, 23, 0.7), 0 0 0 4px rgba(255, 153, 0, 0.15)';
  document.body.appendChild(overlay);
}

function createActionButton(label: string, variant: 'primary' | 'secondary', onClick: () => void, disabled = false): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.style.borderRadius = '16px';
  button.style.padding = '12px 16px';
  button.style.fontSize = '14px';
  button.style.fontWeight = '600';
  button.style.transition = 'opacity 120ms ease, transform 120ms ease';
  button.style.cursor = disabled ? 'not-allowed' : 'pointer';
  button.style.opacity = disabled ? '0.5' : '1';
  button.style.border = variant === 'primary' ? '0' : '1px solid rgba(255, 255, 255, 0.1)';
  button.style.background = variant === 'primary' ? '#ff9900' : 'rgba(255, 255, 255, 0.04)';
  button.style.color = variant === 'primary' ? '#020617' : '#ffffff';
  button.disabled = disabled;
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  return button;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function positionGuideCard(card: HTMLDivElement, target: HTMLElement | null, placement: GuideOverlayContent['placement']): void {
  card.style.left = '';
  card.style.right = '';
  card.style.top = '';
  card.style.bottom = '';

  if (placement === 'bottomRight') {
    card.style.right = '24px';
    card.style.bottom = '24px';
    return;
  }

  if (!target) {
    card.style.top = '24px';
    card.style.right = '24px';
    return;
  }

  const margin = 16;
  const gap = 20;
  const rect = target.getBoundingClientRect();
  const cardHeight = Math.max(card.offsetHeight, 320);
  const cardWidth = Math.max(card.offsetWidth, 320);
  const topBelow = rect.bottom + gap;
  const topAbove = rect.top - gap - cardHeight;
  const maxTop = Math.max(margin, window.innerHeight - cardHeight - margin);
  const maxLeft = Math.max(margin, window.innerWidth - cardWidth - margin);
  const top =
    topBelow + cardHeight <= window.innerHeight - margin
      ? topBelow
      : topAbove >= margin
        ? topAbove
        : clamp(maxTop, margin, maxTop);
  const left = clamp(rect.left, margin, maxLeft);

  card.style.top = `${top}px`;
  card.style.left = `${left}px`;
}

export function renderGuideOverlay(target: HTMLElement | null, content: GuideOverlayContent): void {
  clearHighlight();

  if (target) {
    highlightElement(target, { dimBackdrop: content.dimBackdrop });
  } else if (content.showBackdropWhenUntargeted !== false) {
    const backdrop = createLayer('');
    backdrop.style.position = 'fixed';
    backdrop.style.inset = '0';
    backdrop.style.zIndex = '2147483645';
    backdrop.style.pointerEvents = 'none';
    backdrop.style.background = 'rgba(2, 6, 23, 0.65)';
    document.body.appendChild(backdrop);
  }

  if (content.substeps && content.substeps.length > 0) {
    lockPageScroll();
  }

  const card = createLayer('', GUIDE_CARD_ATTRIBUTE);
  card.style.position = 'fixed';
  card.style.zIndex = '2147483647';
  card.style.width = '360px';
  card.style.maxWidth = 'calc(100vw - 32px)';
  card.style.maxHeight = 'calc(100vh - 32px)';
  card.style.overflowX = 'hidden';
  card.style.overflowY = 'auto';
  card.style.borderRadius = '28px';
  card.style.border = '1px solid rgba(255, 255, 255, 0.1)';
  card.style.background = 'rgba(2, 6, 23, 0.95)';
  card.style.color = '#f8fafc';
  card.style.boxShadow = '0 28px 90px rgba(15, 23, 42, 0.6)';
  card.style.backdropFilter = 'blur(18px)';

  const inner = document.createElement('div');
  inner.style.display = 'grid';
  inner.style.gap = '16px';
  inner.style.padding = '20px';

  const progress = document.createElement('p');
  progress.style.margin = '0';
  progress.style.fontSize = '11px';
  progress.style.fontWeight = '700';
  progress.style.letterSpacing = '0.22em';
  progress.style.textTransform = 'uppercase';
  progress.style.color = '#fde68a';
  progress.textContent = content.progressLabel;
  inner.appendChild(progress);

  const title = document.createElement('h2');
  title.style.margin = '0';
  title.style.fontSize = '30px';
  title.style.lineHeight = '1.05';
  title.style.fontWeight = '700';
  title.style.letterSpacing = '-0.03em';
  title.style.color = '#ffffff';
  title.textContent = content.stepTitle;
  inner.appendChild(title);

  const body = document.createElement('p');
  body.style.margin = '0';
  body.style.fontSize = '14px';
  body.style.lineHeight = '1.7';
  body.style.color = '#e2e8f0';
  body.textContent = content.stepBody;
  inner.appendChild(body);

  if (content.substeps && content.substeps.length > 0) {
    const list = document.createElement('ol');
    list.style.display = 'grid';
    list.style.gap = '8px';
    list.style.margin = '0';
    list.style.padding = '0 0 0 18px';
    list.style.fontSize = '13px';
    list.style.lineHeight = '1.55';
    list.style.color = '#cbd5e1';

    for (const substep of content.substeps) {
      const item = document.createElement('li');
      item.textContent = substep;
      list.appendChild(item);
    }

    inner.appendChild(list);
  }

  if (content.codeBlock) {
    const code = document.createElement('pre');
    code.style.maxHeight = '192px';
    code.style.overflow = 'auto';
    code.style.margin = '0';
    code.style.padding = '16px';
    code.style.borderRadius = '16px';
    code.style.border = '1px solid rgba(255, 255, 255, 0.1)';
    code.style.background = 'rgba(15, 23, 42, 0.85)';
    code.style.fontSize = '12px';
    code.style.lineHeight = '1.7';
    code.style.color = '#f8fafc';
    code.textContent = content.codeBlock;
    inner.appendChild(code);
  }

  const actions = document.createElement('div');
  actions.style.display = 'grid';
  actions.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
  actions.style.gap = '12px';
  actions.appendChild(createActionButton(content.secondaryActionLabel, 'secondary', content.onSecondaryAction));
  actions.appendChild(createActionButton(content.primaryActionLabel, 'primary', content.onPrimaryAction, !content.canAdvance));
  inner.appendChild(actions);

  if (content.onCopyAction && content.copyActionLabel) {
    inner.appendChild(createActionButton(content.copyActionLabel, 'secondary', content.onCopyAction));
  }

  card.appendChild(inner);
  document.body.appendChild(card);
  positionGuideCard(card, target, content.placement);
}

export function resolveHighlightTarget(selector: string): HTMLElement | null {
  assertSafeSelector(selector);

  let targets: NodeListOf<Element>;

  try {
    targets = document.querySelectorAll(selector);
  } catch {
    clearHighlight();
    return null;
  }

  if (targets.length !== 1) {
    clearHighlight();
    return null;
  }

  const target = targets[0];
  if (!(target instanceof HTMLElement)) {
    clearHighlight();
    return null;
  }

  assertSafeElement(target);
  return target;
}

export function highlightSelector(selector: string): boolean {
  const target = resolveHighlightTarget(selector);
  if (!target) {
    return false;
  }

  highlightElement(target);
  return true;
}
