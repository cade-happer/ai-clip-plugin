// ── 常量 ──
const API_BASE = "https://api.aiclipes.xyz";
const TTS_BASE = "http://localhost:8765";

// ── DOM ──
const $ = (sel) => document.querySelector(sel);
const pageTitle = $("#pageTitle");
const wordCount = $("#wordCount");
const btnGenerate = $("#btnGenerate");
const loading = $("#loading");
const error = $("#error");
const result = $("#result");
const scriptText = $("#scriptText");
const titles = $("#titles");
const duration = $("#duration");
const actions = $("#actions");
const btnCopy = $("#btnCopy");
const btnTTS = $("#btnTTS");
const voiceSelect = $("#voiceSelect");
const usageInfo = $("#usageInfo");

let lastScript = "";

// ── 初始化：获取页面信息 ──
async function init() {
  const userId = getUserId();
  updateUsageDisplay(userId);

  chrome.runtime.sendMessage({ type: "extractContent" }, (data) => {
    if (data.error) {
      pageTitle.textContent = data.error;
      return;
    }
    pageTitle.textContent = data.title || "无标题";
    wordCount.textContent = `${data.wordCount} 字`;
  });
}

// ── 用户 ID ──
function getUserId() {
  let id = localStorage.getItem("clip_user_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("clip_user_id", id);
  }
  return id;
}

// ── 用量显示 ──
async function updateUsageDisplay(userId) {
  try {
    const res = await fetch(`${API_BASE}/api/usage`, {
      headers: { "X-User-Id": userId },
    });
    const data = await res.json();
    const limitText = data.limit === Infinity ? "∞" : data.limit;
    const remainingText = data.remaining === Infinity ? "∞" : (data.remaining ?? "-");
    usageInfo.textContent = `今日剩余：${remainingText}/${limitText}`;
  } catch {
    usageInfo.textContent = "今日剩余：-/-";
  }
}

// ── 生成文案 ──
btnGenerate.addEventListener("click", async () => {
  const style = $("#styleSelect").value;
  btnGenerate.disabled = true;
  loading.style.display = "flex";
  error.style.display = "none";
  result.style.display = "none";
  actions.style.display = "none";

  try {
    const contentData = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "extractContent" }, resolve);
    });
    if (contentData.error) throw new Error(contentData.error);

    const userId = getUserId();
    const res = await fetch(`${API_BASE}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": userId,
      },
      body: JSON.stringify({
        url: contentData.title,
        content: contentData.text,
        style: style,
      }),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "生成失败");
    }

    const data = await res.json();
    lastScript = data.script;
    scriptText.textContent = data.script;
    duration.textContent = data.duration || "";
    titles.innerHTML = (data.titles || [])
      .map((t) => `<div class="title-item">${t}</div>`)
      .join("");

    result.style.display = "block";
    actions.style.display = "flex";
    updateUsageDisplay(userId);
  } catch (err) {
    error.textContent = err.message;
    error.style.display = "block";
  } finally {
    btnGenerate.disabled = false;
    loading.style.display = "none";
  }
});

// ── 复制 ──
btnCopy.addEventListener("click", async () => {
  if (!lastScript) return;
  await navigator.clipboard.writeText(lastScript);
  const orig = btnCopy.textContent;
  btnCopy.textContent = "✅ 已复制";
  setTimeout(() => { btnCopy.textContent = orig; }, 2000);
});

// ── 配音下载 ──
btnTTS.addEventListener("click", async () => {
  if (!lastScript) return;
  btnTTS.disabled = true;
  btnTTS.textContent = "⏳ 生成中...";
  try {
    const voice = voiceSelect ? voiceSelect.value : "news";
    const res = await fetch(`${TTS_BASE}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: lastScript, voice }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "配音生成失败");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const voiceLabel = voiceSelect.selectedOptions[0]?.text || "配音";
    a.download = `口播配音-${voiceLabel}.mp3`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    error.textContent = "配音失败: " + err.message;
    error.style.display = "block";
  } finally {
    btnTTS.disabled = false;
    btnTTS.textContent = "🔊 配音下载";
  }
});

// ── 启动 ──
init();
