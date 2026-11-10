import { useEffect, useRef, useState } from "react";
import {
  X,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
} from "lucide-react";

import StatusBadge from "./StatusBadge";
import DetailField from "./DetailField";
import CompactSectionCard from "./CompactSectionCard";
import { QUOTE_STATUS_OPTIONS } from "../../utils/quoteStatus";
import { parseQuoteNotes } from "../../utils/parseQuoteNotes";
import { formatPriceRange, formatWeeks } from "../../utils/formatQuote";
import { getProjectTypeLabelBySlug } from "../../utils/buildQuoteRequest";
import { createSubmissionGuard } from "../../utils/submissionGuard";

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function splitList(value) {
  if (!value) return [];
  return value
    .split(/\s*[+,]\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatRange(min, max) {
  const minNumber = Number(min);
  const maxNumber = Number(max);
  if (!Number.isFinite(minNumber) || !Number.isFinite(maxNumber)) return null;
  return formatPriceRange(minNumber, maxNumber);
}

export default function RequestDetailModal({ quote, onClose, onSaveStatus }) {
  const [status, setStatus] = useState(quote.status);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const containerRef = useRef(null);
  const savingRef = useRef(false);
  const saveGuardRef = useRef(createSubmissionGuard());

  const notes = parseQuoteNotes(quote.notes);
  const integrations = splitList(notes.integrations);
  const hasChanges = status !== quote.status;

  const requestClose = () => {
    if (savingRef.current) return;
    onClose();
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
      if (event.key === "Escape" && !savingRef.current) {
        onClose();
      }
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
      setFeedback({
        type: "error",
        message: error?.message ?? "No se pudo actualizar el estado.",
      });
    } finally {
      saveGuardRef.current.finish();
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <div
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
      className="
        admin-overlay-in
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-[rgba(15,23,42,0.25)]
        p-3
        backdrop-blur-[2px]
        sm:p-5
      "
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-detail-title"
        tabIndex={-1}
        className="
          admin-modal-in
          flex
          max-h-[92vh]
          w-full
          max-w-[960px]
          flex-col
          overflow-hidden
          rounded-[20px]
          border
          border-slate-100
          bg-white
          shadow-[0_30px_80px_rgba(15,23,42,0.22)]
          outline-none
          focus-visible:ring-4
          focus-visible:ring-[rgba(23,60,255,0.12)]
        "
      >
        {/* HEADER */}
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-blue-50
                text-[#173cff]
              "
            >
              <FileText size={16} />
            </span>

            <div className="flex min-w-0 items-baseline gap-2">
              <h2
                id="request-detail-title"
                className="truncate text-[15px] font-bold text-[#07112d]"
              >
                {quote.code}
              </h2>
              <span className="hidden text-[12px] text-slate-300 sm:inline">
                •
              </span>
              <p className="hidden shrink-0 text-[12px] text-slate-500 sm:block">
                Recibida el {formatDate(quote.created_at)}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <StatusBadge status={quote.status} />

            <button
              type="button"
              onClick={requestClose}
              aria-label="Cerrar detalle"
              className="
                flex
                h-8
                w-8
                items-center
                justify-center
                rounded-lg
                text-slate-400
                transition
                hover:bg-slate-100
                hover:text-slate-600
                focus-visible:outline-none
                focus-visible:ring-4
                focus-visible:ring-[rgba(23,60,255,0.12)]
              "
            >
              <X size={17} />
            </button>
          </div>
        </header>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-5 py-4 lg:overflow-visible">
          <div className="grid gap-3 md:grid-cols-2">
            <CompactSectionCard icon={User} title="Cliente">
              <DetailField label="Nombre" value={quote.lead_name} />
              <DetailField label="Correo" value={quote.lead_email} />
              <DetailField label="Teléfono" value={quote.lead_phone} />
              <DetailField label="Empresa" value={quote.lead_company} />
              <DetailField label="Mensaje" value={quote.lead_message} clamp />
            </CompactSectionCard>

            <CompactSectionCard icon={FileText} title="Cotización">
              <DetailField
                label="Tipo de proyecto"
                value={getProjectTypeLabelBySlug(quote.project_type)}
              />
              <DetailField label="Secciones" value={notes.sections} />
              <DetailField
                label="Integraciones"
                value={integrations.length > 0 ? integrations.join(", ") : null}
                clamp
              />
              <DetailField label="Diseño" value={notes.design} />
              <DetailField label="Plazo esperado" value={notes.deadline} />
              <DetailField
                label="Detalle adicional"
                value={notes.additionalDetails}
                clamp
              />
              <DetailField
                label="Inversión referencial"
                value={formatRange(quote.estimated_min, quote.estimated_max)}
                highlight
              />
              <DetailField
                label="Tiempo estimado"
                value={formatWeeks(
                  quote.estimated_weeks_min,
                  quote.estimated_weeks_max
                )}
              />
            </CompactSectionCard>
          </div>
        </div>

        {feedback && (
          <div
            className={`
              mx-5 mb-1 flex shrink-0 items-center gap-1.5
              rounded-lg px-2.5 py-1.5 text-[11px] font-medium
              ${
                feedback.type === "success"
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-red-50 text-red-600"
              }
            `}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 size={13} />
            ) : (
              <AlertCircle size={13} />
            )}
            {feedback.message}
          </div>
        )}

        {/* FOOTER: CAMBIO DE ESTADO */}
        <footer className="flex shrink-0 flex-col gap-3 border-t border-slate-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <label
              htmlFor="quote-status"
              className="whitespace-nowrap text-[12.5px] font-bold text-[#07112d]"
            >
              Cambiar estado
            </label>

            <select
              id="quote-status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="
                h-10
                flex-1
                rounded-xl
                border
                border-slate-200
                bg-[#f8faff]
                px-3
                text-[12.5px]
                text-slate-700
                outline-none
                transition
                focus:border-blue-300
                focus:bg-white
                focus-visible:ring-4
                focus-visible:ring-[rgba(23,60,255,0.08)]
                sm:w-[180px]
                sm:flex-none
              "
            >
              {QUOTE_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={requestClose}
              disabled={saving}
              className="
                h-10
                flex-1
                rounded-xl
                border
                border-slate-200
                bg-white
                px-4
                text-[12.5px]
                font-semibold
                text-slate-600
                transition
                hover:bg-slate-50
                disabled:cursor-not-allowed
                disabled:opacity-50
                sm:flex-none
              "
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="
                flex
                h-10
                flex-1
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-[#173cff]
                px-4
                text-[12.5px]
                font-semibold
                text-white
                shadow-[0_8px_20px_rgba(23,60,255,0.18)]
                transition
                hover:bg-[#0f31e6]
                disabled:cursor-not-allowed
                disabled:opacity-50
                disabled:shadow-none
                sm:flex-none
              "
            >
              {saving ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={15} />
                  Guardar cambios
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
