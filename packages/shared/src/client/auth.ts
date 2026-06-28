const TOKEN_KEY = 'cerebro.token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

/** Desloga e manda para o login (usado quando o backend responde 401). */
export function logout(): void {
  clearToken();
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}
