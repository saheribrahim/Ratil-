(() => {
  "use strict";

  // Matches the existing client-side demo admin check in auth.js.
  // This is a convenience UI only; localStorage is not a secure authorization system.
  const ADMIN_EMAIL = "ssaheror@gmail.com";
  const panel = document.getElementById("adminPanel");
  if (!panel) return;

  const isAdminSession = () =>
    (localStorage.getItem("ratil-session") || "").trim().toLowerCase() === ADMIN_EMAIL;

  function readUsers() {
    try {
      const users = JSON.parse(localStorage.getItem("ratil-users") || "{}");
      return users && typeof users === "object" && !Array.isArray(users) ? users : {};
    } catch {
      return {};
    }
  }

  function styleSearch(input) {
    input.type = "search";
    input.placeholder = "ابحث بالاسم أو البريد الإلكتروني";
    input.setAttribute("aria-label", "ابحث عن مستخدم");
    input.style.cssText = "display:block;width:100%;max-width:420px;margin:12px 0;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--ink);font:inherit";
  }

  function decorateAdminPanel() {
    if (!isAdminSession() || panel.style.display === "none") return;
    const list = panel.querySelector("ul");
    if (!list) return;

    let search = panel.querySelector("#adminUserSearch");
    if (!search) {
      search = document.createElement("input");
      search.id = "adminUserSearch";
      styleSearch(search);
      list.before(search);
      search.addEventListener("input", () => filterRows(list, search.value));
    }

    const entries = Object.entries(readUsers()).filter(([, user]) => user && typeof user === "object");
    Array.from(list.children).forEach((row, index) => {
      if (row.dataset.adminUsersEnhanced === "true") return;
      row.dataset.adminUsersEnhanced = "true";

      const entry = entries[index];
      if (!entry) return;
      const [storageKey, user] = entry;
      const email = String(user.email || storageKey).trim();
      const isAdmin = email.toLowerCase() === ADMIN_EMAIL;
      row.dataset.userSearch = `${String(user.username || "مستخدم")} ${email}`.toLowerCase();

      if (isAdmin) {
        const badge = document.createElement("span");
        badge.textContent = " · حساب المشرف محمي";
        badge.style.cssText = "color:#23734d;font-weight:700";
        row.appendChild(badge);
        return;
      }

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.textContent = "حذف الحساب";
      removeButton.setAttribute("aria-label", `حذف حساب ${email}`);
      removeButton.style.cssText = "margin-inline-start:12px;padding:7px 11px;border:1px solid #c64035;border-radius:9px;background:#c64035;color:#fff;font:inherit;cursor:pointer";
      removeButton.addEventListener("click", () => {
        if (!isAdminSession()) {
          alert("انتهت جلسة المشرف. سجّل الدخول مرة أخرى.");
          return;
        }
        if (!confirm(`هل تريد حذف حساب ${email} من هذا المتصفح؟`)) return;

        const latestUsers = readUsers();
        for (const [key, latestUser] of Object.entries(latestUsers)) {
          const latestEmail = String(latestUser && latestUser.email || key).trim().toLowerCase();
          if (latestEmail === email.toLowerCase() && latestEmail !== ADMIN_EMAIL) {
            delete latestUsers[key];
          }
        }

        try {
          localStorage.setItem("ratil-users", JSON.stringify(latestUsers));
          location.reload(); // auth.js keeps an in-memory copy, so reload it from storage.
        } catch {
          alert("تعذّر تحديث قائمة الحسابات في هذا المتصفح.");
        }
      });
      row.appendChild(removeButton);
    });

    filterRows(list, search.value);
  }

  function filterRows(list, value) {
    const query = String(value || "").trim().toLowerCase();
    Array.from(list.children).forEach(row => {
      const text = row.dataset.userSearch || row.textContent.toLowerCase();
      row.hidden = !!query && !text.includes(query);
    });
  }

  // auth.js creates and refreshes the list when the admin opens the panel.
  const observer = new MutationObserver(decorateAdminPanel);
  observer.observe(panel, { childList: true, subtree: true });
  decorateAdminPanel();
})();
