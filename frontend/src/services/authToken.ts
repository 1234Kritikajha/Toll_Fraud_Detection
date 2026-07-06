export function getAccessToken(): string | null {
  // Try common places used by SPAs.
  // 1) localStorage
  try {
    const keysToTry = [
      "access_token",
      "token",
      "accessToken",
      "auth_token",
      "jwt",
      "jwt_token",
    ];
    for (const k of keysToTry) {
      const v = window.localStorage.getItem(k);
      if (v) return v;
    }
  } catch {
    // ignore
  }

  // 2) sessionStorage
  try {
    const keysToTry = ["access_token", "token", "auth_token", "jwt"];
    for (const k of keysToTry) {
      const v = window.sessionStorage.getItem(k);
      if (v) return v;
    }
  } catch {
    // ignore
  }

  // 3) Cookies
  try {
    const cookiePairs = document.cookie.split("; ");
    for (const pair of cookiePairs) {
      const [rawKey, ...rawVal] = pair.split("=");
      const key = rawKey?.trim();
      const val = rawVal.join("=");
      if (!key || !val) continue;
      if (["access_token", "token", "jwt", "auth_token"].includes(key)) return decodeURIComponent(val);
    }
  } catch {
    // ignore
  }

  return null;
}

