import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const load = () => {
  try {
    return JSON.parse(localStorage.getItem('ms_auth')) || null;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(load);
  const [ready, setReady] = useState(!load());

  const login = useCallback((token, user) => {
    const next = { token, user };
    try {
      localStorage.setItem('ms_auth', JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setAuth(next);
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem('ms_auth');
    } catch {
      /* ignore */
    }
    setAuth(null);
  }, []);

  // Validate a stored token once on load.
  useEffect(() => {
    if (!load()) return;
    api
      .get('/auth/me')
      .catch((e) => e?.response?.status === 401 && logout())
      .finally(() => setReady(true));
  }, [logout]);

  const value = useMemo(
    () => ({ user: auth?.user || null, token: auth?.token || null, ready, login, logout }),
    [auth, ready, login, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
