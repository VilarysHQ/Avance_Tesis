import { useEffect, useMemo, useState } from "react";
import {
  Inbox,
  FileText,
  ClipboardList,
  CheckCircle2,
  Search,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import AdminSidebar from "../../components/Admin/AdminSidebar";
import AdminLogin from "../../components/Admin/AdminLogin";
import AdminTopbar from "../../components/Admin/AdminTopbar";
import AdminStatCard from "../../components/Admin/AdminStatCard";
import RequestsTable from "../../components/Admin/RequestsTable";
import RequestDetailModal from "../../components/Admin/RequestDetailModal";
import {
  getAdminSession,
  getQuotes,
  loginAdmin,
  logoutAdmin,
  updateQuoteStatus,
} from "../../services/api";
import { saveConfirmedQuoteStatus } from "../../utils/adminQuoteStatus";

const PAGE_SIZE = 10;

function getFriendlyError(error) {
  if (error?.isNetworkError) {
    return "No pudimos conectar con el servidor. Revisa tu conexión e intenta nuevamente.";
  }

  if (error?.status === 404) {
    return "La solicitud ya no existe.";
  }

  if (error?.status === 400) {
    return error?.details?.[0] ?? "El estado seleccionado no es válido.";
  }

  if (error?.status >= 500) {
    return "Ocurrió un problema en el servidor. Intenta nuevamente en unos momentos.";
  }

  return "No se pudo completar la operación. Intenta nuevamente.";
}

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
        const message = error?.status === 503
          ? "El acceso administrativo no está configurado."
          : "";
        setAuth({ status: "anonymous", user: null, error: message });
      });
    return () => {
      active = false;
    };
  }, []);

  const handleLogin = async (email, password) => {
    const session = await loginAdmin(email, password);
    setAuth({ status: "authenticated", user: session.user, error: "" });
  };

  if (auth.status === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f8ff]">
        <div className="text-center text-sm text-slate-500">
          <Loader2 className="mx-auto mb-3 animate-spin text-[#173cff]" size={28} />
          Verificando sesión...
        </div>
      </main>
    );
  }

  if (auth.status !== "authenticated") {
    return <AdminLogin onLogin={handleLogin} initialError={auth.error} />;
  }

  return (
    <AdminDashboard
      adminUser={auth.user}
      onSessionExpired={() => setAuth({ status: "anonymous", user: null, error: "Tu sesión finalizó. Ingresa nuevamente." })}
      onLogoutComplete={() => setAuth({ status: "anonymous", user: null, error: "" })}
    />
  );
}

function AdminDashboard({ adminUser, onSessionExpired, onLogoutComplete }) {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const handleRefresh = () => {
    setLoading(true);
    setLoadError("");

    getQuotes()
      .then((data) => setQuotes(Array.isArray(data) ? data : []))
      .catch((error) => {
        if (error?.status === 401 || error?.status === 403) onSessionExpired();
        else setLoadError(getFriendlyError(error));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;

    getQuotes()
      .then((data) => {
        if (!active) return;
        setQuotes(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        if (!active) return;
        if (error?.status === 401 || error?.status === 403) onSessionExpired();
        else setLoadError(getFriendlyError(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [onSessionExpired]);

  const stats = useMemo(() => {
    const byStatus = (status) =>
      quotes.filter((quote) => quote.status === status).length;

    return {
      total: quotes.length,
      submitted: byStatus("submitted"),
      negotiation: byStatus("negotiation"),
      won: byStatus("won"),
    };
  }, [quotes]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return quotes;

    return quotes.filter((quote) => {
      const code = (quote.code ?? "").toLowerCase();
      const name = (quote.lead_name ?? "").toLowerCase();
      const email = (quote.lead_email ?? "").toLowerCase();
      return (
        code.includes(term) || name.includes(term) || email.includes(term)
      );
    });
  }, [quotes, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const selectedQuote =
    quotes.find((quote) => quote.id === selectedId) ?? null;

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusChange = async (id, status) => {
    try {
      const result = await saveConfirmedQuoteStatus({
        quotes,
        quoteId: id,
        status,
        request: updateQuoteStatus,
      });
      setQuotes(result.quotes);
      return result.updated;
    } catch (error) {
      if (error?.status === 401 || error?.status === 403) onSessionExpired();
      throw new Error(getFriendlyError(error), { cause: error });
    }
  };

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
    <div className="flex min-h-screen bg-[#f5f8ff]">
      <AdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar
          search={search}
          onSearchChange={handleSearchChange}
          onOpenSidebar={() => setSidebarOpen(true)}
          adminEmail={adminUser?.email}
          onLogout={handleLogout}
          logoutLoading={logoutLoading}
        />

        <div className="flex-1">
          <main className="min-w-0 p-5 sm:p-6">
            {/* HEADER */}
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-[24px] font-extrabold tracking-[-0.02em] text-[#07112d]">
                  Solicitudes
                </h1>
                <p className="mt-1 text-[13px] text-slate-500">
                  Revisa las cotizaciones recibidas desde la web.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading}
                className="
                  flex
                  items-center
                  gap-2
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  px-3.5
                  py-2.5
                  text-[12px]
                  font-semibold
                  text-slate-600
                  transition
                  hover:border-blue-300
                  hover:text-[#173cff]
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                <RefreshCw
                  size={14}
                  className={loading ? "animate-spin" : ""}
                />
                Actualizar
              </button>
            </div>

            {/* STATS */}
            <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
              <AdminStatCard
                icon={Inbox}
                label="Total de solicitudes"
                value={stats.total}
                tone="blue"
              />
              <AdminStatCard
                icon={FileText}
                label="Nuevas"
                value={stats.submitted}
                tone="blue"
              />
              <AdminStatCard
                icon={ClipboardList}
                label="En negociación"
                value={stats.negotiation}
                tone="orange"
              />
              <AdminStatCard
                icon={CheckCircle2}
                label="Ganadas"
                value={stats.won}
                tone="emerald"
              />
            </div>

            {/* TABLE CARD */}
            <div
              className="
                mt-5
                overflow-hidden
                rounded-[18px]
                border
                border-slate-100
                bg-white
                shadow-[0_20px_60px_rgba(30,64,175,0.06)]
              "
            >
              {/* TABLE SEARCH */}
              <div className="border-b border-slate-100 p-4">
                <div
                  className="
                    flex
                    h-11
                    items-center
                    gap-2
                    rounded-xl
                    border
                    border-slate-200
                    bg-[#f8faff]
                    px-3
                    transition
                    focus-within:border-blue-300
                    focus-within:bg-white
                    focus-within:shadow-[0_0_0_4px_rgba(23,60,255,0.05)]
                  "
                >
                  <Search size={16} className="shrink-0 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => handleSearchChange(event.target.value)}
                    placeholder="Buscar solicitudes por cliente, correo o código..."
                    className="
                      h-full
                      min-w-0
                      flex-1
                      bg-transparent
                      text-[13px]
                      text-slate-700
                      outline-none
                      placeholder:text-slate-400
                    "
                  />
                </div>
              </div>

              {/* STATES */}
              {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20">
                  <Loader2
                    size={26}
                    className="animate-spin text-[#173cff]"
                  />
                  <p className="text-[13px] text-slate-500">
                    Cargando solicitudes...
                  </p>
                </div>
              ) : loadError ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20">
                  <AlertCircle size={26} className="text-red-500" />
                  <p className="max-w-[380px] text-center text-[13px] text-slate-600">
                    {loadError}
                  </p>
                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="
                      rounded-xl
                      bg-[#173cff]
                      px-4
                      py-2.5
                      text-[12px]
                      font-semibold
                      text-white
                      shadow-[0_10px_25px_rgba(23,60,255,0.18)]
                      transition
                      hover:bg-[#0f31e6]
                    "
                  >
                    Reintentar
                  </button>
                </div>
              ) : (
                <>
                  <RequestsTable
                    quotes={pageItems}
                    onSelectRow={(quote) => setSelectedId(quote.id)}
                    selectedId={selectedId}
                  />

                  {/* PAGINATION */}
                  {filtered.length > 0 && (
                    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
                      <p className="text-[12px] text-slate-500">
                        {filtered.length}{" "}
                        {filtered.length === 1 ? "solicitud" : "solicitudes"}
                      </p>

                      <div className="flex items-center gap-1.5">
                        <PaginationButton
                          disabled={currentPage <= 1}
                          onClick={() => setPage(currentPage - 1)}
                          ariaLabel="Página anterior"
                        >
                          <ChevronLeft size={15} />
                        </PaginationButton>

                        {Array.from({ length: pageCount }).map((_, index) => {
                          const pageNumber = index + 1;
                          const isActive = pageNumber === currentPage;

                          return (
                            <button
                              key={pageNumber}
                              type="button"
                              onClick={() => setPage(pageNumber)}
                              className={`
                                h-8
                                min-w-8
                                rounded-lg
                                px-2
                                text-[12px]
                                font-semibold
                                transition
                                ${
                                  isActive
                                    ? "bg-[#173cff] text-white"
                                    : "text-slate-600 hover:bg-slate-100"
                                }
                              `}
                            >
                              {pageNumber}
                            </button>
                          );
                        })}

                        <PaginationButton
                          disabled={currentPage >= pageCount}
                          onClick={() => setPage(currentPage + 1)}
                          ariaLabel="Página siguiente"
                        >
                          <ChevronRight size={15} />
                        </PaginationButton>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </div>

      {selectedQuote && (
        <RequestDetailModal
          key={selectedQuote.id}
          quote={selectedQuote}
          onClose={() => setSelectedId(null)}
          onSaveStatus={handleStatusChange}
        />
      )}
    </div>
  );
}

function PaginationButton({ disabled, onClick, ariaLabel, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="
        flex
        h-8
        w-8
        items-center
        justify-center
        rounded-lg
        border
        border-slate-200
        text-slate-500
        transition
        hover:border-blue-300
        hover:text-[#173cff]
        disabled:cursor-not-allowed
        disabled:opacity-40
        disabled:hover:border-slate-200
        disabled:hover:text-slate-500
      "
    >
      {children}
    </button>
  );
}
