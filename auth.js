// Accounts are stored in this browser only by default.
// If you publish a Google Apps Script backend, set CFG.remoteApi to your deployment URL.
// This lets users register/login from any device and makes the admin panel read a shared list.
const CFG = {
  service: "YOUR_SERVICE_ID",
  template: "YOUR_TEMPLATE_ID",
  key: "YOUR_PUBLIC_KEY",
  owner: "ssaheror@gmail.com",
  adminEmail: "ssaheror@gmail.com",
  remoteApi: "https://script.google.com/macros/s/PASTE_YOUR_DEPLOYMENT_ID/exec"
};

let U = {};
try {
  U = JSON.parse(localStorage.getItem("ratil-users") || "{}");
} catch (_) {}

const saveU = () => {
  try {
    localStorage.setItem("ratil-users", JSON.stringify(U));
  } catch (_) {}
};

const am = (t, e) => {
  $("aMsg").textContent = t;
  $("aMsg").className = e ? "err" : "";
};

let mode = "login";

function isAdminUser(u) {
  return !!u && String(u.email || "").toLowerCase() === CFG.adminEmail.toLowerCase();
}

function setMode(m) {
  mode = m;
  $("tL").classList.toggle("primary", m === "login");
  $("tS").classList.toggle("primary", m === "signup");
  $("aU").style.display = m === "signup" ? "" : "none";
  $("aE").placeholder = m === "signup" ? "Email / البريد الإلكتروني" : "Email / البريد الإلكتروني";
  $("aGo").textContent = m === "signup" ? "Create account إنشاء حساب" : "Log in دخول";
  $("aP").value = "";
}

async function hp(p, salt) {
  try {
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + p));
    return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, "0")).join("");
  } catch (_) {
    return "";
  }
}

async function sendMail(to, subject, message) {
  if (!CFG.service || !CFG.template || !CFG.key) return false;
  try {
    const r = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_id: CFG.service, template_id: CFG.template, user_id: CFG.key, template_params: { to, subject, message } })
    });
    return r.ok;
  } catch (_) {
    return false;
  }
}

async function requestApi(payload) {
  if (!CFG.remoteApi || CFG.remoteApi.includes("PASTE_YOUR_DEPLOYMENT_ID")) {
    return { ok: false, error: "Set CFG.remoteApi to your Google Apps Script deployment URL" };
  }

  try {
    const res = await fetch(CFG.remoteApi, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    return { ok: false, error: err.message || "Request failed" };
  }
}

async function loadUsersFromRemote() {
  if (!CFG.remoteApi || CFG.remoteApi.includes("PASTE_YOUR_DEPLOYMENT_ID")) {
    return { ok: false, users: [] };
  }

  try {
    const res = await fetch(`${CFG.remoteApi}?action=list`);
    return await res.json();
  } catch (_) {
    return { ok: false, users: [] };
  }
}

function mergeRemoteUsers(users) {
  const map = {};
  (Array.isArray(users) ? users : []).forEach(u => {
    if (u && (u.email || u.username)) {
      map[String(u.email || u.username).toLowerCase()] = u;
    }
  });
  U = map;
  saveU();
}

async function refreshRemoteUsers() {
  const remote = await loadUsersFromRemote();
  if (remote && remote.ok && Array.isArray(remote.users)) {
    mergeRemoteUsers(remote.users);
  }
}

function ensureAdminUI() {
  let button = $("adminToggle"), panel = $("adminPanel");
  if (!button) {
    button = document.createElement("button");
    button.id = "adminToggle";
    button.type = "button";
    button.className = "primary";
    button.textContent = "Admin panel لوحة الإدارة";
    button.onclick = async () => {
      $("adminPanel").style.display = $("adminPanel").style.display === "none" ? "block" : "none";
      await renderAdminUsers();
    };
    document.body.appendChild(button);
  }
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "adminPanel";
    panel.style.display = "none";
    panel.style.marginTop = "20px";
    panel.style.padding = "16px";
    panel.style.border = "1px solid #ddd";
    panel.style.borderRadius = "12px";
    panel.style.background = "#fff";
    document.body.appendChild(panel);
  }
}

async function renderAdminUsers() {
  const panel = $("adminPanel");
  if (!panel) return;

  panel.replaceChildren();

  const title = document.createElement("h2");
  title.textContent = "المستخدمون المسجلون";
  panel.appendChild(title);

  const remote = await loadUsersFromRemote();
  const users = remote && remote.ok && Array.isArray(remote.users) ? remote.users : Object.values(U);

  if (!users.length) {
    const empty = document.createElement("p");
    empty.textContent = "لا يوجد مستخدمون";
    panel.appendChild(empty);
    return;
  }

  const list = document.createElement("ul");
  users.forEach(u => {
    const li = document.createElement("li");
    li.textContent = `${u.username || "Unknown"} • ${u.email || ""}`;
    list.appendChild(li);
  });

  panel.appendChild(list);
}

function setAdminVisibility(u) {
  ensureAdminUI();
  const button = $("adminToggle");
  const panel = $("adminPanel");
  const admin = isAdminUser(u);
  button.style.display = admin ? "inline-block" : "none";
  panel.style.display = "none";
}

function enter(u) {
  $("auth").style.display = "none";
  $("me").style.display = "block";
  $("who").textContent = u.username || u.email || "User";
  try {
    localStorage.setItem("ratil-session", u.email || "");
  } catch (_) {}
  setAdminVisibility(u);
}

$("out").onclick = () => {
  stop();
  try {
    localStorage.removeItem("ratil-session");
  } catch (_) {}
  $("me").style.display = "none";
  $("auth").style.display = "flex";
  $("aP").value = "";
  setAdminVisibility(null);
  setMode("login");
};

$("tL").onclick = () => setMode("login");
$("tS").onclick = () => setMode("signup");

$("aGo").onclick = async () => {
  const id = $("aE").value.trim();
  const pw = $("aP").value;

  if (!id || !pw) {
    am("Please enter email and password • أدخل البريد وكلمة المرور", true);
    return;
  }

  if (mode === "signup") {
    const un = $("aU").value.trim();
    const em = id.toLowerCase();

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) {
      am("Invalid email format • صيغة البريد غير صحيحة", true);
      return;
    }

    if (!un) {
      am("Username is required • الاسم مطلوب", true);
      return;
    }

    const result = await requestApi({
      action: "signup",
      email: em,
      username: un,
      password: pw
    });

    if (result.ok) {
      am("تم إنشاء الحساب بنجاح", false);
      await refreshRemoteUsers();
      setMode("login");
      $("aP").value = "";
      return;
    }

    am(result.error || "فشل إنشاء الحساب", true);
    return;
  }

  const result = await requestApi({
    action: "login",
    email: id.toLowerCase(),
    password: pw
  });

  if (result.ok) {
    enter({
      email: result.user.email,
      username: result.user.username
    });
    return;
  }

  const localUser = Object.values(U).find(u => {
    const emailOk = String(u.email || "").toLowerCase() === id.toLowerCase();
    const passOk = String(u.password || "") === pw || String(u.passwordHash || "") === pw;
    return emailOk && passOk;
  });

  if (localUser) {
    enter(localUser);
    return;
  }

  am("Wrong email/username or password • البريد أو كلمة المرور غير صحيحة", true);
};

ensureAdminUI();

(async () => {
  try {
    const remote = await loadUsersFromRemote();
    if (remote && remote.ok && Array.isArray(remote.users)) {
      mergeRemoteUsers(remote.users);
    }
  } catch (_) {}

  try {
    const s = localStorage.getItem("ratil-session");
    if (s && U[s]) {
      enter(U[s]);
    }
  } catch (_) {}

  setMode("login");
})();
