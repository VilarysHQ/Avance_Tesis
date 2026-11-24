import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

import AdminLogin from "../../components/Admin/AdminLogin";
import AdminRequestsPage from "../../components/Admin/AdminRequestsPage";
import AdminSidebar from "../../components/Admin/AdminSidebar";
import AdminTopbar from "../../components/Admin/AdminTopbar";
import ForecastReportPage from "../../components/Admin/ForecastReportPage";
import { getAdminSession, loginAdmin, logoutAdmin } from "../../services/api";

export default function AdminPage() {
  const [auth, setAuth] = useState({ status: "checking", user: null, error: "" });

  useEffect(() => {
    let active = true;
    getAdminSession()
      .then((session) => {
        if (active) setAuth({ status: "authenticated", user: session.user, error: "" });
      })
      .catch((error) => {
        if (!active) return;
        setAuth({
          status: "anonymous",
          user: null,
          error: error?.status === 503 ? "El acceso administrativo no está configurado." : "",
        });
      });
    return () => {
      active = false;
    };
  }, []);

  const handleLogin = async (email, password) => {
    const session = await loginAdmin(email, password);
    setAuth({ status: "authenticated", user: session.user, error: "" });
  };

  if (auth.status === "checking") return <SessionLoader />;
  if (auth.status !== "authenticated") {
    return <AdminLogin onLogin={handleLogin} initialError={auth.error} />;
  }

  return (
    <AdminShell
      adminUser={auth.user}
      onSessionExpired={() => setAuth({
        status: "anonymous",
        user: null,
        error: "Tu sesión finalizó. Ingresa nuevamente.",
      })}
      onLogoutComplete={() => setAuth({ status: "anonymous", user: null, error: "" })}
    />
  );
}

function AdminShell({ adminUser, onSessionExpired, onLogoutComplete }) {
  const location = useLocation();
  const isReports = location.pathname.startsWith("/admin/reports");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const handleLogout = async () => {
    if (logoutLoading) return;
    setLogoutLoading(true);
    try {
      await logoutAdmin();
    } finally {
      onLogoutComplete();
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f3f6fb] text-slate-900">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-[1px] lg:hidden"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar
          search={search}
          onSearchChange={setSearch}
          onOpenSidebar={() => setSidebarOpen(true)}
          adminEmail={adminUser?.email}
          onLogout={handleLogout}
          logoutLoading={logoutLoading}
          showSearch={!isReports}
          pageTitle={isReports ? "Reportes" : "Solicitudes"}
        />
        <div className="flex-1">
          {isReports ? (
            <ForecastReportPage onSessionExpired={onSessionExpired} />
          ) : (
            <AdminRequestsPage
              search={search}
              onSearchChange={setSearch}
              onSessionExpired={onSessionExpired}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function SessionLoader() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f6fb]">
      <div className="rounded-2xl border border-slate-200/70 bg-white px-8 py-7 text-center text-sm text-slate-500 shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
        <Loader2 className="mx-auto mb-3 animate-spin text-[#173cff]" size={26} />
        Verificando sesión segura...
      </div>
    </main>
  );
}
