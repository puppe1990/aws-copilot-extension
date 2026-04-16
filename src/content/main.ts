import { highlightSelector } from './highlight';
import { detectAwsPage } from './pageDetection';

console.info('[AWS Copilot] content script loaded', detectAwsPage(window.location.href));

type ContentMessage = {
  type?: string;
  selector?: unknown;
};

export function handleContentMessage(
  message: unknown,
  href: string,
  sendResponse: (response: unknown) => void
): boolean {
  const contentMessage = message as ContentMessage | null | undefined;

  if (contentMessage?.type === 'AWS_COPILOT_HIGHLIGHT' && typeof contentMessage.selector === 'string') {
    try {
      const found = highlightSelector(contentMessage.selector);
      sendResponse({ ok: found });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Refusing to target sensitive AWS fields';
      sendResponse({ ok: false, error: errorMessage });
    }
    return true;
  }

  if (contentMessage?.type === 'AWS_COPILOT_DETECT_PAGE') {
    sendResponse({ ok: true, page: detectAwsPage(href) });
    return true;
  }

  return false;
}

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    return handleContentMessage(message, window.location.href, sendResponse);
  });
}
