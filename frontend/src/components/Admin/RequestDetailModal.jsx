import { useEffect, useRef, useState } from "react";
import { FileText, X } from "lucide-react";

import { createSubmissionGuard } from "../../utils/submissionGuard";
import RequestDetailContent from "./RequestDetailContent";
import RequestStatusFooter from "./RequestStatusFooter";
import StatusBadge from "./StatusBadge";

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export default function RequestDetailModal({ quote, onClose, onSaveStatus }) {
  const [status, setStatus] = useState(quote.status);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const containerRef = useRef(null);
  const savingRef = useRef(false);
  const saveGuardRef = useRef(createSubmissionGuard());
  const hasChanges = status !== quote.status;

  const requestClose = () => {
    if (!savingRef.current) onClose();
  };

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    containerRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape" && !savingRef.current) onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleSave = async () => {
    if (!hasChanges || !saveGuardRef.current.tryStart()) return;
    savingRef.current = true;
    setSaving(true);
    setFeedback(null);
    try {
      await onSaveStatus(quote.id, status);
      setFeedback({ type: "success", message: "Estado actualizado correctamente." });
      window.setTimeout(onClose, 250);
    } catch (error) {
      setFeedback({ type: "error", message: error?.message ?? "No se pudo actualizar el estado." });
    } finally {
      saveGuardRef.current.finish();
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <div onMouseDown={(event) => {
      if (event.target === event.currentTarget) requestClose();
    }} className="admin-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-[3px] sm:p-5">
      <div ref={containerRef} role="dialog" aria-modal="true" aria-labelledby="request-detail-title" tabIndex={-1} className="admin-modal-in flex max-h-[88vh] w-full max-w-[980px] flex-col overflow-hidden rounded-[22px] border border-white/60 bg-white shadow-[0_35px_90px_rgba(15,23,42,0.28)] outline-none focus-visible:ring-4 focus-visible:ring-blue-200 xl:max-h-[760px]">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#173cff] ring-1 ring-blue-100"><FileText size={17} /></span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 id="request-detail-title" className="truncate text-sm font-extrabold text-[#0b1739]">{quote.code}</h2>
                <StatusBadge status={quote.status} />
              </div>
              <p className="mt-0.5 text-[11px] text-slate-400">Solicitud recibida el {formatDate(quote.created_at)}</p>
            </div>
          </div>
          <button type="button" onClick={requestClose} aria-label="Cerrar detalle" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"><X size={17} /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8faff] px-3 py-3 sm:px-5 sm:py-4">
          <RequestDetailContent quote={quote} />
        </div>

        <RequestStatusFooter status={status} onStatusChange={setStatus} saving={saving} hasChanges={hasChanges} feedback={feedback} onClose={requestClose} onSave={handleSave} />
      </div>
    </div>
  );
}
