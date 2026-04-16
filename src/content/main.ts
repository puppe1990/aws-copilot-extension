import { highlightSelector } from './highlight';
import { detectAwsPage } from './pageDetection';

console.info('[AWS Copilot] content script loaded', detectAwsPage(window.location.href));

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'AWS_COPILOT_HIGHLIGHT' && typeof message.selector === 'string') {
    const found = highlightSelector(message.selector);
    sendResponse({ ok: found });
    return true;
  }

  if (message?.type === 'AWS_COPILOT_DETECT_PAGE') {
    sendResponse({ ok: true, page: detectAwsPage(window.location.href) });
    return true;
  }

  return false;
});
