const SESSION_KEY = 'barometer_auth';

export function login(username: string, password: string): boolean {
  const validLogin = import.meta.env.VITE_APP_LOGIN ?? '';
  const validPassword = import.meta.env.VITE_APP_PASSWORD ?? '';
  if (username === validLogin && password === validPassword) {
    sessionStorage.setItem(SESSION_KEY, '1');
    return true;
  }
  return false;
}

export function isAuthenticated(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === '1';
}

export function logout(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
