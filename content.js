(() => {
  console.log("✅ content.js 注入成功:", location.href);

  // -------- Storage helpers --------
  const S = {
    get(keys) {
      return new Promise(res => chrome.storage.local.get(keys, res));
    },
    set(obj) {
      return new Promise(res => chrome.storage.local.set(obj, res));
    }
  };

  if (window.__AUTO_BOT_RUNNING__) return;
  window.__AUTO_BOT_RUNNING__ = true;

  // -------- 登录检测（按平台区分） --------
  function isLoggedIn() {
    const url = location.href;

    // 京东
    if (/jd\.com/i.test(url)) {
      if (document.body.innerText.includes("我的京东") ||
          document.body.innerText.includes("退出登录")) {
        return true;
      }
      return false;
    }

    // 淘宝 / 天猫
    if (/taobao\.com|tmall\.com/i.test(url)) {
      if (document.body.innerText.includes("我的淘宝") ||
          document.body.innerText.includes("退出")) {
        return true;
      }
      return false;
    }

    // 拼多多
    if (/pinduoduo\.com/i.test(url)) {
      if (document.body.innerText.includes("个人中心") ||
          document.body.innerText.includes("退出登录")) {
        return true;
      }
      return false;
    }

    // 默认：只要不是登录页，就算已登录
    return !/passport|login/i.test(url);
  }

  // -------- UI 面板 --------
  function showPanel(count = 0, paused = false) {
    let box = document.getElementById("auto-shopping-refresh-counter");
    if (!box) {
      box = document.createElement("div");
      box.id = "auto-shopping-refresh-counter";
      Object.assign(box.style, {
        position: "fixed", bottom: "10px", right: "10px",
        padding: "8px 12px", background: "rgba(0,0,0,0.6)",
        color: "#fff", fontSize: "14px", borderRadius: "6px",
        zIndex: 999999, textAlign: "center", lineHeight: "1.4"
      });

      const info = document.createElement("div");
      info.id = "auto-bot-info";

      const btn = document.createElement("button");
      btn.id = "auto-bot-toggle";
      btn.style.marginTop = "6px";
      btn.style.padding = "3px 8px";
      btn.style.fontSize = "12px";
      btn.style.cursor = "pointer";
      btn.addEventListener("click", async () => {
        const { paused } = await S.get(["paused"]);
        await S.set({ paused: !paused });
        btn.textContent = paused ? "暂停" : "继续";
        console.log(paused ? "▶️ 已恢复" : "⏸ 已暂停");
      });

      box.appendChild(info);
      box.appendChild(btn);
      document.body.appendChild(box);
    }
    const info = box.querySelector("#auto-bot-info");
    const btn = box.querySelector("#auto-bot-toggle");
    info.textContent = `刷新次数: ${count}`;
    btn.textContent = paused ? "继续" : "暂停";
  }

  // -------- 工具函数 --------
  function tryClickBuy() {
    let btn =
      document.querySelector("#InitTradeUrl") ||
      document.querySelector("#J_LinkBuy") ||
      Array.from(document.querySelectorAll("button, a"))
        .find(el => el && el.innerText && el.innerText.includes("立即购买"));

    if (btn) {
      btn.click();
      console.log("🟢 点击：立即购买");
      return true;
    }
    return false;
  }

  function tryClickSubmit() {
    let btn =
      document.querySelector("#order-submit") ||
      document.querySelector("#submitOrderPC_1") ||
      Array.from(document.querySelectorAll("button"))
        .find(el => el && el.innerText && el.innerText.includes("提交订单"));

    if (btn) {
      btn.click();
      console.log("🟢 点击：提交订单");
      return true;
    }
    return false;
  }

  // -------- 主循环 --------
  let ticking = false;
  let reloadTimer = null;
  const REFRESH_MS = 1500;

  async function tick() {
    if (ticking) return;
    ticking = true;
  
    try {
      let { enabled = false, paused = false, refreshCount = 0 } =
        await S.get(["enabled", "paused", "refreshCount"]);
  
      if (!enabled) {
        showPanel(refreshCount, paused);
        return;
      }
  
      if (!isLoggedIn()) {
        await S.set({ enabled: false });
        alert("⚠️ 请先登录账号，再启动插件");
        return;
      }
  
      // ✅ 支付页
      if (/payc\.m\.jd\.com\/d\/cashier/i.test(location.href)) {
        console.log("💰 已进入支付页面，自动停止插件");
        await S.set({ enabled: false, paused: false, refreshCount: 0 });
        showPanel(0, false);
        return;
      }
  
      // 订单确认页
      if (/order\.jd\.com|trade\.jd\.com|buy\.taobao\.com/i.test(location.href)) {
        if (tryClickSubmit()) {
          await S.set({ refreshCount: 0 });
        }
        showPanel(refreshCount, paused);
        return;
      }
  
      // 商品页
      if (tryClickBuy()) {
        await S.set({ refreshCount: 0 });
        showPanel(0, paused);
        return;
      }
  
      // 没点到 → 检查暂停
      if (paused) {
        console.log("⏸ 暂停中，不刷新");
        showPanel(refreshCount, paused);
        return;
      }
  
      // 准备刷新 → +1
      refreshCount++;
      await S.set({ refreshCount });
      showPanel(refreshCount, paused);
  
      console.log(`🔄 未找到立即购买，${REFRESH_MS / 1000}s 后刷新... (count=${refreshCount})`);
      clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => location.reload(), REFRESH_MS);
    } catch (e) {
      console.error("tick 异常:", e);
    } finally {
      ticking = false;
    }
  }
  


  // -------- 启动逻辑 --------
  async function startBot() {
    await S.set({ enabled: true });
    tick();
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.action === "start") {
      startBot().then(() => sendResponse({ ok: true }));
      return true;
    }
  });

  S.get(["enabled"]).then(({ enabled = false }) => {
    if (enabled) tick();
  });

  tick();
  window.addEventListener("load", tick);
})();
