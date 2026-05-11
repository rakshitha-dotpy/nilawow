// App lock for single-user app.
// IMPORTANT: This must NOT persist across refresh/tab reopen.
// So we store the "unlocked" state only in-memory.

const REQUIRED_PASSCODE = "nila";

let unlocked = false;

export const verifyPasscode = async (pass: string) =>
  pass.trim().toLowerCase() === REQUIRED_PASSCODE;

export const startSession = () => {
  unlocked = true;
};

export const endSession = () => {
  unlocked = false;
};

export const isAuthenticated = () => unlocked;
