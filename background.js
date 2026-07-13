// Service Worker - 内容提取 & 消息代理
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "extractContent") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]) {
        sendResponse({ error: "无法获取当前页面" });
        return;
      }
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: extractPageContent,
        });
        const data = results[0]?.result || { title: "", text: "", wordCount: 0 };
        sendResponse(data);
      } catch (err) {
        sendResponse({ error: "无法读取页面内容: " + err.message });
      }
    });
    return true; // 保持消息通道开启（异步 sendResponse）
  }
});

/**
 * 在页面上下文中执行的内容提取函数
 * 优先级：article > main > body
 */
function extractPageContent() {
  const SKIP_TAGS = new Set([
    "SCRIPT", "STYLE", "NAV", "HEADER", "FOOTER", "ASIDE",
    "NOSCRIPT", "IFRAME", "SVG", "META", "LINK",
  ]);

  function getVisibleText(element, maxLen = 3000) {
    let result = "";
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
        let parent = node.parentElement;
        while (parent) {
          if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
          parent = parent.parentElement;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    while (walker.nextNode() && result.length < maxLen) {
      const text = walker.currentNode.textContent.trim();
      if (text) result += text + " ";
    }
    return result.slice(0, maxLen).trim();
  }

  const article = document.querySelector("article");
  const main = document.querySelector("main");
  const body = document.body;

  const source = article || main || body;
  const text = getVisibleText(source, 3000);
  const title = document.title || "";

  return {
    title: title,
    text: text,
    wordCount: text.length,
  };
}
