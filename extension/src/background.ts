import { addUrl } from './shared'

/** Right-click on selected text: "Diloloji'ye ekle". */
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: 'kk-add', title: 'Diloloji\'ye ekle: “%s”', contexts: ['selection'] })
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'kk-add' || !info.selectionText) return
  void chrome.tabs.create({ url: addUrl(info.selectionText.trim().slice(0, 80), '', null, tab?.url ?? '') })
})
