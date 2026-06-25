const SESSION_KEY = 'barometer_auth_token';

export async function login(username: string, password: string): Promise<boolean> {
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) return false;
    const data = await res.json() as { token?: string };
    if (!data.token) return false;
    sessionStorage.setItem(SESSION_KEY, data.token);
    return true;
  } catch {
    return false;
  }
}

export function getToken(): string | null {
  return sessionStorage.getItem(SESSION_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function logout(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
