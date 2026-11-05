// Local demo authentication only. Accounts are stored in this browser's localStorage.
// This is not secure authentication and does not sync across browsers or devices.
const CFG = {
  adminEmail: "ssaheror@gmail.com"
};

const USERS_KEY = "ratil-local-users";
const SESSION_KEY = "ratil-session-token";
let currentUser = null;
let currentIsAdmin = false;
let mode = "login";

const am = (message, isError) => {
  $("aMsg").textContent = message;
  $("aMsg").className = isError ? "err" : "";
};

function readUsers() {
  try {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    return Array.isArray(users) ? users : [];
  } catch (_) {
    return [];
  }
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function bytesToHex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

async function passwordHash(password, saltHex) {
  const salt = Uint8Array.from(saltHex.match(/.{2}/g) || [], byte => parseInt(byte, 16));
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" }, material, 256);
  return bytesToHex(new Uint8Array(bits));
}

function makeSalt() {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
}

function makeToken() {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
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
    button.onclick = () => {
      panel.style.display = panel.style.display === "none" ? "block" : "none";
      if (panel.style.display === "block") renderAdminUsers();
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

function enter(user, token) {
  currentUser = user;
  // Demo convenience only: this client-side check is not an access-control boundary.
  currentIsAdmin = user.email.toLowerCase() === CFG.adminEmail.toLowerCase();
  localStorage.setItem(SESSION_KEY, JSON.stringify({ email: user.email, token }));
  $("auth").style.display = "none";
  $("me").style.display = "block";
  $("who").textContent = user.username || user.email;
  setAdminVisibility();
}

function renderAdminUsers() {
  const panel = $("adminPanel");
  panel.replaceChildren();
  const title = document.createElement("h2");
  title.textContent = "المستخدمون المسجلون على هذا المتصفح";
  panel.appendChild(title);
  const users = readUsers();
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

$("out").onclick = () => {
  localStorage.removeItem(SESSION_KEY);
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
    const users = readUsers();
    if (mode === "signup") {
      if (users.some(user => user.email === email)) return am("هذا البريد مسجل بالفعل على هذا المتصفح.", true);
      const salt = makeSalt();
      users.push({ email, username, salt, passwordHash: await passwordHash(password, salt) });
      writeUsers(users);
      am("تم إنشاء حساب تجريبي على هذا المتصفح. سجّل الدخول الآن.", false);
      setMode("login");
      $("aE").value = email;
    } else {
      const user = users.find(account => account.email === email);
      if (!user || await passwordHash(password, user.salt) !== user.passwordHash) {
        return am("البريد أو كلمة المرور غير صحيحة لهذا المتصفح.", true);
      }
      enter({ email: user.email, username: user.username }, makeToken());
    }
  } catch (error) {
    am(error.message || "تعذر إكمال العملية. افتح الموقع عبر HTTPS وجرب مرة أخرى.", true);
  } finally {
    button.disabled = false;
  }
};

ensureAdminUI();
setAdminVisibility();
setMode("login");

(function restoreSession() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    if (!session) return;
    const user = readUsers().find(account => account.email === session.email);
    if (user) enter({ email: user.email, username: user.username }, session.token);
    else localStorage.removeItem(SESSION_KEY);
  } catch (_) {
    localStorage.removeItem(SESSION_KEY);
  }
})();
