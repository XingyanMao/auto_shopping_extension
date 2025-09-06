// 点击“开始立即购买”
document.getElementById("buyBtn").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.runtime.sendMessage({ action: "buy_now" }, (resp) => {
      console.log("启动结果:", resp);
    });
  });
});

// 点击“停止运行”
document.getElementById("stopBtn").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0]) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          chrome.storage.local.set({ enabled: false, paused: false, refreshCount: 0 }, () => {
            console.log("⏹ 已停止运行");
          });
        }
      });
    }
  });
});
