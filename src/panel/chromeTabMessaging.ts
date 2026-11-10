import type { AwsPage } from '../content/pageDetection'
import type { GuideSnapshot } from '../content/contentGuideCatalog'
import { extractDebugContextFromPage } from './pageDebugMarkdown'

export async function getActiveTabId(): Promise<number | null> {
  try {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
      return null
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    return typeof tab?.id === 'number' ? tab.id : null
  } catch {
    return null
  }
}

export async function sendMessageToActiveTab<T = unknown>(
  payload: Record<string, unknown>,
): Promise<T | null> {
  try {
    if (typeof chrome === 'undefined' || !chrome.tabs?.sendMessage) {
      return null
    }
    const tabId = await getActiveTabId()
    if (tabId === null) {
      return null
    }
    return (await chrome.tabs.sendMessage(tabId, payload)) as T
  } catch {
    return null
  }
}

export async function sendToActiveTab(payload: Record<string, unknown>): Promise<boolean> {
  return (await sendMessageToActiveTab(payload)) !== null
}

// WHY: content-script messaging can fail if the isolated world is not injected.
// executeScript serializes extractDebugContextFromPage; that fn must stay closed.
export async function extractDebugMarkdownViaScripting(): Promise<string | null> {
  try {
    if (typeof chrome === 'undefined' || !chrome.scripting?.executeScript) {
      return null
    }
    const tabId = await getActiveTabId()
    if (tabId === null) {
      return null
    }
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: extractDebugContextFromPage,
    })
    return typeof result?.result === 'string' && result.result ? result.result : null
  } catch {
    return null
  }
}

export async function detectActivePage(): Promise<AwsPage | null> {
  try {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query || !chrome.tabs?.sendMessage) {
      return null
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id === undefined) {
      return null
    }
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'AWS_COPILOT_DETECT_PAGE',
    })
    if (response?.ok && response.page && typeof response.page.kind === 'string') {
      return response.page as AwsPage
    }
    return null
  } catch {
    return null
  }
}

export async function getGuideSnapshot(): Promise<GuideSnapshot | null> {
  const response = await sendMessageToActiveTab<{ ok?: boolean; snapshot?: GuideSnapshot }>({
    type: 'AWS_COPILOT_GET_GUIDE_SNAPSHOT',
  })
  return response?.ok ? (response.snapshot ?? null) : null
}

export async function copyToClipboard(value: string): Promise<boolean> {
  try {
    await navigator.clipboard?.writeText(value)
    return true
  } catch {
    return false
  }
}

export function closeLauncherPopup(): void {
  window.close()
}
