// App lock for single-user app.
// IMPORTANT: This must NOT persist across refresh/tab reopen.
// So we store the "unlocked" state only in-memory.
// Update: User requested sessionStorage to persist during refresh but clear on tab close.

const REQUIRED_PASSCODE = "nila";
const SESSION_KEY = "nila_auth_session";

export const verifyPasscode = async (pass: string) =>
  pass.trim().toLowerCase() === REQUIRED_PASSCODE;

export const startSession = () => {
  sessionStorage.setItem(SESSION_KEY, "true");
};

export const endSession = () => {
  sessionStorage.removeItem(SESSION_KEY);
};

export const isAuthenticated = () => {
  return sessionStorage.getItem(SESSION_KEY) === "true";
};
