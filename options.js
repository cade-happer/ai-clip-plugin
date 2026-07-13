const API_BASE = "https://api.aiclipes.xyz";

const $ = (sel) => document.querySelector(sel);

async function init() {
  const userId = getUserId();
  $("#userIdDisplay").textContent = userId;

  try {
    const res = await fetch(`${API_BASE}/api/usage`, {
      headers: { "X-User-Id": userId },
    });
    const data = await res.json();

    $("#usedCount").textContent = `${data.used} time(s)`;
    $("#limitCount").textContent = data.plan === "pro" ? "Unlimited / 无限" : `${data.limit} / day`;

    if (data.plan === "pro") {
      $("#planBadge").textContent = "Pro";
      $("#planBadge").className = "badge badge-pro";
      $("#freeCard").style.display = "none";
      $("#freeCardPaypal").style.display = "none";
      $("#freeCardCN").style.display = "none";
      $("#proCard").style.display = "block";
    }
  } catch (err) {
    $("#usedCount").textContent = "Load failed / 加载失败";
  }
}

function getUserId() {
  let id = localStorage.getItem("clip_user_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("clip_user_id", id);
  }
  return id;
}

$("#btnActivate").addEventListener("click", async () => {
  const code = $("#activateCode").value.trim();
  if (!code) {
    $("#activateMsg").textContent = "请输入激活码";
    return;
  }
  $("#btnActivate").disabled = true;
  $("#btnActivate").textContent = "激活中...";
  try {
    const res = await fetch(`${API_BASE}/api/activate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": getUserId(),
      },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (res.ok) {
      $("#activateMsg").textContent = "✅ 激活成功！刷新页面即可生效";
      setTimeout(() => location.reload(), 1500);
    } else {
      $("#activateMsg").textContent = "❌ " + (data.error || "激活失败");
    }
  } catch {
    $("#activateMsg").textContent = "❌ 网络错误";
  } finally {
    $("#btnActivate").disabled = false;
    $("#btnActivate").textContent = "激活";
  }
});

init();
