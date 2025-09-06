chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "buy_now") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs && tabs[0];
      if (!tab) {
        sendResponse({ result: "no_tab" });
        return;
      }

      // 尝试给已注入的 content.js 发送“开始”消息
      try {
        chrome.tabs.sendMessage(tab.id, { action: "start" }, (resp) => {
          const err = chrome.runtime.lastError;
          if (err) {
            // 没有注入（通常是没匹配到 / 需要刷新一次）→ 兜底：注入一小段脚本，设置 enabled 并刷新
            chrome.scripting.executeScript({
              target: { tabId: tab.id, allFrames: true },
              func: () => {
                // 使用 extension 的 storage（页面脚本拿不到），所以只标记个 localStorage 兜底
                try { localStorage.setItem("AUTO_BOT_FORCE_ENABLE", "true"); } catch(e) {}
                location.reload();
              }
            }).then(() => sendResponse({ result: "injected_reload" }))
              .catch(er => sendResponse({ result: "inject_fail", message: er.message }));
          } else {
            sendResponse({ result: resp && resp.ok ? "started" : "started_no_resp" });
          }
        });
      } catch (e) {
        sendResponse({ result: "error", message: e.message });
      }
    });

    return true; // async
  }
});
