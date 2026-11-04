// Shared authentication backed by the Google Apps Script web app in Code.gs.
// Set this URL after deploying the Apps Script as a Web App.
const CFG = {
  adminEmail: "ssaheror@gmail.com",
  remoteApi: "https://script.google.com/macros/s/PASTE_YOUR_DEPLOYMENT_ID/exec"
};

const SESSION_KEY = "ratil-session-token";
let currentUser = null;
let currentIsAdmin = false;
let mode = "login";

const am = (message, isError) => {
  $("aMsg").textContent = message;
  $("aMsg").className = isError ? "err" : "";
};

function configured() {
  return CFG.remoteApi && !CFG.remoteApi.includes("PASTE_YOUR_DEPLOYMENT_ID");
}

async function api(payload) {
  if (!configured()) throw new Error("Shared login is not connected yet. Deploy Code.gs and set its URL in auth.js.");
  const response = await fetch(CFG.remoteApi, {
    method: "POST",
    // text/plain avoids a browser preflight request for this simple Apps Script endpoint.
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error("Could not reach the shared account service.");
  return response.json();
}

function setMode(value) {
  mode = value;
  $("tL").classList.toggle("primary", mode === "login");
  $("tS").classList.toggle("primary", mode === "signup");
  $("aU").style.display = mode === "signup" ? "" : "none";
  $("aGo").textContent = mode === "signup" ? "Create account إنشاء حساب" : "Log in دخول";
  $("aP").value = "";
  am("", false);
}

function ensureAdminUI() {
  let button = $("adminToggle");
  let panel = $("adminPanel");
  if (!button) {
    button = document.createElement("button");
    button.id = "adminToggle";
    button.type = "button";
    button.className = "primary";
    button.textContent = "Admin panel لوحة الإدارة";
    button.onclick = async () => {
      panel.style.display = panel.style.display === "none" ? "block" : "none";
      if (panel.style.display === "block") await renderAdminUsers();
    };
    $("me").appendChild(button);
  }
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "adminPanel";
    panel.style.cssText = "display:none;margin-top:16px;padding:16px;border:1px solid #ddd;border-radius:12px;background:#fff";
    $("me").appendChild(panel);
  }
}

function setAdminVisibility() {
  ensureAdminUI();
  $("adminToggle").style.display = currentIsAdmin ? "inline-block" : "none";
  $("adminPanel").style.display = "none";
}

function enter(user, token, isAdmin) {
  currentUser = user;
  currentIsAdmin = Boolean(isAdmin) || String(user.email || "").toLowerCase() === CFG.adminEmail.toLowerCase();
  try { localStorage.setItem(SESSION_KEY, token); } catch (_) {}
  $("auth").style.display = "none";
  $("me").style.display = "block";
  $("who").textContent = user.username || user.email;
  setAdminVisibility();
}

async function renderAdminUsers() {
  const panel = $("adminPanel");
  panel.replaceChildren();
  const title = document.createElement("h2");
  title.textContent = "المستخدمون المسجلون";
  panel.appendChild(title);

  try {
    const result = await api({ action: "list", token: localStorage.getItem(SESSION_KEY) });
    if (!result.ok) throw new Error(result.error || "تعذر تحميل المستخدمين");
    const users = result.users || [];
    if (!users.length) {
      const empty = document.createElement("p");
      empty.textContent = "لا يوجد مستخدمون مسجلون بعد.";
      panel.appendChild(empty);
      return;
    }
    const list = document.createElement("ul");
    users.forEach(user => {
      const item = document.createElement("li");
      item.textContent = `${user.username} • ${user.email}`;
      list.appendChild(item);
    });
    panel.appendChild(list);
  } catch (error) {
    const message = document.createElement("p");
    message.textContent = error.message;
    panel.appendChild(message);
  }
}

$("out").onclick = async () => {
  const token = localStorage.getItem(SESSION_KEY);
  if (token) {
    try { await api({ action: "logout", token }); } catch (_) {}
  }
  try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
  currentUser = null;
  currentIsAdmin = false;
  if (typeof stop === "function") stop();
  $("me").style.display = "none";
  $("auth").style.display = "flex";
  $("aP").value = "";
  setAdminVisibility();
  setMode("login");
};

$("tL").onclick = () => setMode("login");
$("tS").onclick = () => setMode("signup");

$("aGo").onclick = async () => {
  const email = $("aE").value.trim().toLowerCase();
  const password = $("aP").value;
  const username = $("aU").value.trim();
  if (!email || !password) return am("أدخل البريد الإلكتروني وكلمة المرور.", true);
  if (mode === "signup" && (!username || password.length < 8)) {
    return am("أدخل اسم مستخدم وكلمة مرور من 8 أحرف على الأقل.", true);
  }

  const button = $("aGo");
  button.disabled = true;
  try {
    const result = mode === "signup"
      ? await api({ action: "signup", email, username, password })
      : await api({ action: "login", email, password });
    if (!result.ok) return am(result.error || "تعذر إكمال الطلب.", true);

    if (mode === "signup") {
      am("تم إنشاء الحساب. سجّل الدخول الآن من أي جهاز باستخدام نفس البريد وكلمة المرور.", false);
      setMode("login");
      $("aE").value = email;
    } else {
      enter(result.user, result.token, result.isAdmin);
    }
  } catch (error) {
    am(error.message || "تعذر الاتصال بخدمة الحسابات.", true);
  } finally {
    button.disabled = false;
  }
};

ensureAdminUI();
setAdminVisibility();
setMode("login");

(async function restoreSession() {
  const token = localStorage.getItem(SESSION_KEY);
  if (!token) return;
  try {
    const result = await api({ action: "session", token });
    if (result.ok) enter(result.user, token, result.isAdmin);
    else localStorage.removeItem(SESSION_KEY);
  } catch (_) {
    // Keep the sign-in form visible if the backend is not yet configured or unreachable.
  }
})();
