import { useCallback, useEffect, useState } from "react";
import App from "../App.jsx";
import { AuthPage } from "./AuthPage.jsx";
import { Landing } from "./Landing.jsx";
import { authApi, loadSession } from "./authApi.js";
import { navigate, usePath } from "./router.js";
import { applyTheme, getInitialTheme } from "../utils/theme.js";

export function WebRoot() {
  const path = usePath();
  const [session, setSession] = useState({ status: "loading", account: null });

  useEffect(() => {
    applyTheme(getInitialTheme());
    let alive = true;
    loadSession().then((account) => {
      if (alive) setSession({ status: account ? "authed" : "anon", account });
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const expired = () => setSession({ status: "anon", account: null });
    window.addEventListener("mj:auth-expired", expired);
    return () => window.removeEventListener("mj:auth-expired", expired);
  }, []);

  useEffect(() => {
    if (session.status === "authed" && (path === "/login" || path === "/register")) {
      navigate("/", { replace: true });
    }
  }, [session.status, path]);

  const handleAuthenticated = useCallback((account) => {
    setSession({ status: "authed", account });
    navigate("/", { replace: true });
  }, []);

  const handleLogout = useCallback(async () => {
    await authApi.logout();
    setSession({ status: "anon", account: null });
    navigate("/", { replace: true });
  }, []);

  if (session.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-tg-bg">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-tg-hint border-opacity-20 border-t-tg-link" />
      </div>
    );
  }

  if (session.status === "authed") {
    return <App webAccount={session.account} onLogout={handleLogout} />;
  }

  if (path === "/login") return <AuthPage mode="login" onAuthenticated={handleAuthenticated} />;
  if (path === "/register") return <AuthPage mode="register" onAuthenticated={handleAuthenticated} />;
  return <Landing />;
}
