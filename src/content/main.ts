import { detectAwsPage } from './pageDetection'
import {
  bootContentGuide,
  handleContentMessage,
  resetGuideRuntimeForTests,
  restoreGuideFromStorage,
} from './guideSession'

console.info('[AWS Copilot] content script loaded', detectAwsPage(window.location.href))

bootContentGuide()

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    return handleContentMessage(message, window.location.href, sendResponse)
  })
}

export { handleContentMessage, resetGuideRuntimeForTests, restoreGuideFromStorage }
