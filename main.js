// Start the app
load();

// Add user search and removal controls to the existing admin panel.
const adminUsersScript = document.createElement("script");
adminUsersScript.src = "admin-users.js";
adminUsersScript.defer = true;
document.body.appendChild(adminUsersScript);
