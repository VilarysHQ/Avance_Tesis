import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  FileText,
  Inbox,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";

import { getQuotes, updateQuoteStatus } from "../../services/api";
import { saveConfirmedQuoteStatus } from "../../utils/adminQuoteStatus";
import AdminPageHeader from "./AdminPageHeader";
import AdminStatePanel from "./AdminStatePanel";
import AdminStatCard from "./AdminStatCard";
import RequestDetailModal from "./RequestDetailModal";
import RequestsPagination from "./RequestsPagination";
import RequestsTable from "./RequestsTable";

const PAGE_SIZE = 10;

function friendlyError(error) {
  if (error?.isNetworkError) return "No pudimos conectar con el servidor. Revisa tu conexión.";
  if (error?.status === 404) return "La solicitud ya no existe.";
  if (error?.status === 400) return error?.details?.[0] ?? "El estado seleccionado no es válido.";
  if (error?.status >= 500) return "Ocurrió un problema en el servidor. Intenta nuevamente en unos momentos.";
  return "No se pudo completar la operación. Intenta nuevamente.";
}

export default function AdminRequestsPage({ search, onSearchChange, onSessionExpired }) {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);

  const loadQuotes = () => {
    setLoading(true);
    setLoadError("");
    getQuotes()
      .then((data) => setQuotes(Array.isArray(data) ? data : []))
      .catch((error) => {
        if (error?.status === 401 || error?.status === 403) onSessionExpired();
        else setLoadError(friendlyError(error));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;
    getQuotes()
      .then((data) => {
        if (active) setQuotes(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        if (!active) return;
        if (error?.status === 401 || error?.status === 403) onSessionExpired();
        else setLoadError(friendlyError(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [onSessionExpired]);

  const stats = useMemo(() => {
    const count = (status) => quotes.filter((quote) => quote.status === status).length;
    return {
      total: quotes.length,
      submitted: count("submitted"),
      negotiation: count("negotiation"),
      won: count("won"),
    };
  }, [quotes]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return quotes;
    return quotes.filter((quote) => [quote.code, quote.lead_name, quote.lead_email]
      .some((value) => (value ?? "").toLowerCase().includes(term)));
  }, [quotes, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const selectedQuote = quotes.find((quote) => quote.id === selectedId) ?? null;

  const handleSearch = (value) => {
    onSearchChange(value);
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
      throw new Error(friendlyError(error), { cause: error });
    }
  };

  return (
    <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-7">
      <AdminPageHeader
        eyebrow="Gestión comercial"
        title="Solicitudes"
        description="Supervisa las cotizaciones recibidas, revisa sus detalles y actualiza el avance comercial."
        action={(
          <button type="button" onClick={loadQuotes} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-600 shadow-sm transition hover:border-blue-300 hover:text-[#173cff] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-55">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Actualizar
          </button>
        )}
      />

      <section className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Resumen de solicitudes">
        <AdminStatCard icon={Inbox} label="Total" value={stats.total} detail="Solicitudes registradas" tone="blue" />
        <AdminStatCard icon={FileText} label="Nuevas" value={stats.submitted} detail="Pendientes de revisión" tone="indigo" />
        <AdminStatCard icon={ClipboardList} label="Negociación" value={stats.negotiation} detail="En seguimiento" tone="amber" />
        <AdminStatCard icon={CheckCircle2} label="Ganadas" value={stats.won} detail="Oportunidades cerradas" tone="emerald" />
      </section>

      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200/75 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.055)]" aria-labelledby="requests-table-title">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 id="requests-table-title" className="text-sm font-extrabold text-[#0b1739]">Actividad reciente</h2>
            <p className="mt-0.5 text-[11px] text-slate-400">Selecciona una fila para revisar la solicitud.</p>
          </div>
          <label className="flex h-10 w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 transition focus-within:border-blue-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-50 sm:max-w-[360px]">
            <Search size={15} className="shrink-0 text-slate-400" />
            <span className="sr-only">Buscar solicitudes</span>
            <input value={search} onChange={(event) => handleSearch(event.target.value)} placeholder="Cliente, correo o código..." className="h-full min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400" />
          </label>
        </div>

        {loading ? (
          <AdminStatePanel icon={Loader2} spin message="Cargando solicitudes" detail="Estamos consultando la actividad comercial más reciente." />
        ) : loadError ? (
          <AdminStatePanel icon={AlertCircle} message="No pudimos cargar las solicitudes" detail={loadError} action={{ label: "Reintentar", onClick: loadQuotes }} />
        ) : (
          <>
            <RequestsTable quotes={pageItems} onSelectRow={(quote) => setSelectedId(quote.id)} selectedId={selectedId} />
            <RequestsPagination total={filtered.length} currentPage={currentPage} pageCount={pageCount} onPageChange={setPage} />
          </>
        )}
      </section>

      {selectedQuote && (
        <RequestDetailModal key={selectedQuote.id} quote={selectedQuote} onClose={() => setSelectedId(null)} onSaveStatus={handleStatusChange} />
      )}
    </main>
  );
}
