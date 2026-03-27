import { useState, useCallback } from "react";

const SESSION_KEY = "lib_admin";

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        sessionStorage.setItem(SESSION_KEY, "1");
        setIsAdmin(true);
        return true;
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Неверный пароль");
        return false;
      }
    } catch {
      setError("Ошибка подключения");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setIsAdmin(false);
  }, []);

  return { isAdmin, login, logout, isLoading, error, setError };
}
