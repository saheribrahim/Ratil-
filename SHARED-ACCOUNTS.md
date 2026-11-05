# Shared accounts setup (Google Sheets + Apps Script)

The site uses a shared backend instead of browser-local accounts. Deploying the static site alone is not enough: complete these setup steps before signup/login will work across devices.

## 1. Create the shared spreadsheet

1. Create a Google Sheet and open **Extensions → Apps Script**.
2. Replace the editor contents with [`Code.gs`](Code.gs) from this repository and save it. The script is bound to the spreadsheet; it creates the `users` and `sessions` tabs automatically on first request.

## 2. Configure server-only properties

In Apps Script, open **Project Settings → Script properties** and add:

- `ADMIN_EMAIL` — `ssaheror@gmail.com`
- `ADMIN_USERNAME` — `saher`
- `ADMIN_PASSWORD` — `saheribrahim`
- `AUTH_SECRET` — RatilSharedAuth2026!SecureKeyForAdminUsers!321

These values belong only in Apps Script properties, never in `auth.js` or the public spreadsheet. The administrator account is configured on the backend; it does not need a row in the public `users` sheet.

## 3. Deploy the backend

Deploy → **New deployment** → **Web app**. Choose **Execute as: Me** and **Who has access: Anyone**, authorize it, and copy the Web app URL ending in `/exec`. The endpoint must be publicly reachable for signup/login; the script checks sessions and only permits the configured admin to list users. Do not share edit access to the spreadsheet.

## 4. Connect and publish the site

In `auth.js`, replace `PASTE_YOUR_DEPLOYMENT_ID` in `CFG.remoteApi` with the deployed URL. Commit/publish the site, then test signup and login in a second browser/device. When changing Apps Script code later, deploy a new version of the web app.

Passwords are not stored in the `users` sheet; the server stores salted HMAC verifiers. The admin list only returns usernames, emails, and registration dates. Shared sign-in requires HTTPS and the live Apps Script deployment. If the browser reports a cross-origin (CORS) error, use a supported auth backend such as Firebase Authentication or Supabase Auth rather than placing credentials or user data in a public file.
