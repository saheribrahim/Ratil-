// Supabase authentication for Ratil.
// This file intentionally uses only the public publishable key. Never put a
// Supabase secret/service-role key in browser code.
const SUPABASE_URL = "https://arsvcabzyvgsqtbxchom.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_k-NAJUWfzq3vL952cgpryA_vVuxoQOC";
const ADMIN_EMAIL = "ssaheror@gmail.com";
const ADMIN_USERNAME = "saher";

let supabaseClient;
let currentUser = null;
let mode = "login";
let authBusy = false;

const am = (message, isError = false) => {
  const messageElement = document.getElementById("aMsg");
  messageElement.textContent = message;
  messageElement.className = isError ? "err" : "";
};

function setMode(value) {
  mode = value;
  document.getElementById("tL").classList.toggle("primary", mode === "login");
  document.getElementById("tS").classList.toggle("primary", mode === "signup");
  document.getElementById("aU").style.display = mode === "signup" ? "" : "none";
  document.getElementById("aP").autocomplete = mode === "signup" ? "new-password" : "current-password";
  document.getElementById("aGo").textContent = mode === "signup"
    ? "Create account إنشاء حساب"
    : "Log in دخول";
  document.getElementById("aP").value = "";
  am("");
}

function normalizedEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isAdminAccount(userOrEmail) {
  const email = typeof userOrEmail === "string" ? userOrEmail : userOrEmail?.email;
  return normalizedEmail(email) === ADMIN_EMAIL;
}

function showSignedIn(user) {
  currentUser = user;
  const username = isAdminAccount(user) ? ADMIN_USERNAME : user.user_metadata?.username;
  document.getElementById("auth").style.display = "none";
  document.getElementById("me").style.display = "block";
  document.getElementById("who").textContent = username || user.email || "مستخدم";
}

function showSignedOut() {
  currentUser = null;
  if (typeof stop === "function") stop();
  document.getElementById("me").style.display = "none";
  document.getElementById("auth").style.display = "flex";
}

function friendlyAuthError(error) {
  const message = String(error?.message || "");
  if (/invalid login credentials/i.test(message)) return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
  if (/user already registered/i.test(message)) return "هذا البريد مسجل بالفعل. اختر تسجيل الدخول.";
  if (/password.*(weak|short|least)/i.test(message)) return "كلمة المرور قصيرة؛ استخدم كلمة مرور أقوى (8 أحرف على الأقل).";
  return message || "تعذّر الاتصال بخدمة الحسابات. تحقق من الإنترنت وإعدادات Supabase.";
}

async function handleAuthSubmit() {
  if (authBusy) return;

  const email = normalizedEmail(document.getElementById("aE").value);
  const password = document.getElementById("aP").value;
  const enteredUsername = document.getElementById("aU").value.trim();
  const username = isAdminAccount(email) ? ADMIN_USERNAME : enteredUsername;
  if (!email || !password) return am("أدخل البريد الإلكتروني وكلمة المرور.", true);
  if (mode === "signup" && (!username || password.length < 8)) {
    return am("أدخل اسم المستخدم وكلمة مرور من 8 أحرف على الأقل.", true);
  }

  const button = document.getElementById("aGo");
  authBusy = true;
  button.disabled = true;
  try {
    if (mode === "signup") {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: { username },
          emailRedirectTo: `${window.location.origin}${window.location.pathname}`
        }
      });
      if (error) throw error;
      if (data.session) {
        showSignedIn(data.user);
        am("تم إنشاء الحساب وتسجيل الدخول بنجاح.");
      } else {
        am("تم إنشاء الحساب. افتح رسالة التأكيد في بريدك الإلكتروني، ثم سجّل الدخول.");
        setMode("login");
      }
    } else {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      showSignedIn(data.user);
      am("");
    }
  } catch (error) {
    am(friendlyAuthError(error), true);
  } finally {
    authBusy = false;
    button.disabled = false;
  }
}

async function handleSignOut() {
  const button = document.getElementById("out");
  button.style.pointerEvents = "none";
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
    showSignedOut();
    document.getElementById("aP").value = "";
    setMode("login");
  } catch (error) {
    am(friendlyAuthError(error), true);
  } finally {
    button.style.pointerEvents = "";
  }
}

function loadSupabaseSdk() {
  if (window.supabase?.createClient) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("تعذّر تحميل مكتبة Supabase. تحقق من اتصال الإنترنت."));
    document.head.appendChild(script);
  });
}

async function initializeAuth() {
  const button = document.getElementById("aGo");
  button.disabled = true;
  try {
    await loadSupabaseSdk();
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });

    document.getElementById("tL").addEventListener("click", () => setMode("login"));
    document.getElementById("tS").addEventListener("click", () => setMode("signup"));
    document.getElementById("aE").addEventListener("input", event => {
      if (mode === "signup" && isAdminAccount(event.target.value)) {
        document.getElementById("aU").value = ADMIN_USERNAME;
      }
    });
    button.addEventListener("click", handleAuthSubmit);
    document.getElementById("aP").addEventListener("keydown", event => {
      if (event.key === "Enter") handleAuthSubmit();
    });
    document.getElementById("out").addEventListener("click", handleSignOut);

    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    if (data.session?.user) showSignedIn(data.session.user);
    else showSignedOut();

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (session?.user) showSignedIn(session.user);
      else showSignedOut();
    });
    setMode("login");
  } catch (error) {
    am(friendlyAuthError(error), true);
  } finally {
    button.disabled = false;
  }
}

initializeAuth();
