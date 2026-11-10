import { detectLocaleFromNavigator } from './contentGuideCatalog'
import { HOME_INTRO_GUIDE_ID } from './consoleHomeIntro'
import { bootConsoleToolbar } from './consoleToolbar'
import { detectAwsPage } from './pageDetection'
import {
  bootContentGuide,
  handleContentMessage,
  resetGuideRuntimeForTests,
  restoreGuideFromStorage,
} from './guideSession'

console.info('[AWS Copilot] content script loaded', detectAwsPage(window.location.href))

bootContentGuide()
bootConsoleToolbar({
  locale: detectLocaleFromNavigator(),
  onStartGuide: () => {
    handleContentMessage(
      {
        type: 'AWS_COPILOT_START_GUIDE',
        guideId: HOME_INTRO_GUIDE_ID,
        locale: detectLocaleFromNavigator(),
      },
      window.location.href,
      () => {},
    )
  },
})

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    return handleContentMessage(message, window.location.href, sendResponse)
  })
}

export { handleContentMessage, resetGuideRuntimeForTests, restoreGuideFromStorage }
