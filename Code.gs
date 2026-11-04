// Google Apps Script backend for Ratil shared accounts.
// Bind this script to the Google Sheet that will store accounts, then configure
// ADMIN_EMAIL, ADMIN_PASSWORD, and AUTH_SECRET in Project Settings > Script properties.
const USERS_SHEET = "users";
const SESSIONS_SHEET = "sessions";
const SESSION_DAYS = 30;

function doPost(e) {
  try {
    const request = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const result = handleRequest_(request);
    return json_(result);
  } catch (error) {
    return json_({ ok: false, error: "Request failed" });
  }
}

function handleRequest_(request) {
  const action = String(request.action || "");
  const users = getSheet_(USERS_SHEET, ["email", "username", "salt", "passwordHash", "createdAt"]);
  const sessions = getSheet_(SESSIONS_SHEET, ["tokenHash", "email", "expiresAt"]);
  const props = PropertiesService.getScriptProperties();
  const secret = props.getProperty("AUTH_SECRET");
  const adminEmail = String(props.getProperty("ADMIN_EMAIL") || "").trim().toLowerCase();
  const adminPassword = props.getProperty("ADMIN_PASSWORD");

  if (!secret || !adminEmail || !adminPassword) {
    return { ok: false, error: "Backend setup incomplete. Configure ADMIN_EMAIL, ADMIN_PASSWORD, and AUTH_SECRET." };
  }

  if (action === "signup") {
    const email = normalizeEmail_(request.email);
    const username = String(request.username || "").trim().slice(0, 80);
    const password = String(request.password || "");
    if (!isEmail_(email) || !username || password.length < 8) {
      return { ok: false, error: "Enter a valid email, username, and password with at least 8 characters." };
    }
    if (email === adminEmail) {
      return { ok: false, error: "This email is reserved for the administrator." };
    }
    const rows = users.getDataRange().getValues();
    if (rows.slice(1).some(row => normalizeEmail_(row[0]) === email)) {
      return { ok: false, error: "An account with this email already exists." };
    }
    const salt = Utilities.getUuid();
    users.appendRow([email, username, salt, passwordHash_(secret, email, salt, password), new Date()]);
    return { ok: true };
  }

  if (action === "login") {
    const email = normalizeEmail_(request.email);
    const password = String(request.password || "");
    let user = null;
    let isAdmin = false;

    if (email === adminEmail && constantTimeEqual_(password, adminPassword)) {
      user = { email: adminEmail, username: "Admin" };
      isAdmin = true;
    } else {
      const rows = users.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (normalizeEmail_(rows[i][0]) !== email) continue;
        const expected = String(rows[i][3] || "");
        const actual = passwordHash_(secret, email, String(rows[i][2] || ""), password);
        if (constantTimeEqual_(actual, expected)) {
          user = { email, username: String(rows[i][1] || "") };
        }
        break;
      }
    }

    if (!user) return { ok: false, error: "Wrong email or password." };
    const token = Utilities.getUuid() + Utilities.getUuid();
    sessions.appendRow([hmac_(secret, token), user.email, new Date(Date.now() + SESSION_DAYS * 86400000)]);
    return { ok: true, user: user, isAdmin: isAdmin, token: token };
  }

  const sessionUser = validateSession_(sessions, secret, request.token);
  if (!sessionUser) return { ok: false, error: "Session expired. Please log in again." };

  if (action === "session") {
    return { ok: true, user: sessionUser, isAdmin: sessionUser.email === adminEmail };
  }

  if (action === "list") {
    if (sessionUser.email !== adminEmail) return { ok: false, error: "Admin access required." };
    const rows = users.getDataRange().getValues();
    const list = rows.slice(1).filter(row => row[0]).map(row => ({
      email: String(row[0]),
      username: String(row[1] || ""),
      createdAt: row[4] instanceof Date ? row[4].toISOString() : String(row[4] || "")
    }));
    return { ok: true, users: list };
  }

  if (action === "logout") {
    revokeSession_(sessions, secret, request.token);
    return { ok: true };
  }

  return { ok: false, error: "Unknown action." };
}

function validateSession_(sheet, secret, token) {
  if (!token) return null;
  const wanted = hmac_(secret, String(token));
  const rows = sheet.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (constantTimeEqual_(String(rows[i][0] || ""), wanted)) {
      const expiry = new Date(rows[i][2]).getTime();
      if (expiry > Date.now()) return { email: normalizeEmail_(rows[i][1]), username: "" };
      sheet.deleteRow(i + 1);
      return null;
    }
  }
  return null;
}

function revokeSession_(sheet, secret, token) {
  if (!token) return;
  const wanted = hmac_(secret, String(token));
  const rows = sheet.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (constantTimeEqual_(String(rows[i][0] || ""), wanted)) sheet.deleteRow(i + 1);
  }
}

function getSheet_(name, headers) {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = book.getSheetByName(name);
  if (!sheet) sheet = book.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  return sheet;
}

function passwordHash_(secret, email, salt, password) {
  return hmac_(secret, email + ":" + salt + ":" + password);
}

function hmac_(secret, value) {
  return Utilities.computeHmacSha256Signature(value, secret)
    .map(byte => (byte & 255).toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual_(a, b) {
  a = String(a);
  b = String(b);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function normalizeEmail_(value) { return String(value || "").trim().toLowerCase(); }
function isEmail_(value) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value); }
function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
