import { AlertCircle, CheckCircle2, Loader2, Save } from "lucide-react";

import { QUOTE_STATUS_OPTIONS } from "../../utils/quoteStatus";

export default function RequestStatusFooter({
  status,
  onStatusChange,
  saving,
  hasChanges,
  feedback,
  onClose,
  onSave,
}) {
  return (
    <div className="shrink-0 border-t border-slate-100 bg-slate-50/65">
      {feedback && (
        <div className={`mx-5 mt-3 flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold ${feedback.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`} role="status">
          {feedback.type === "success" ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
          {feedback.message}
        </div>
      )}
      <footer className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-3 text-xs font-bold text-[#0b1739]" htmlFor="quote-status">
          Estado comercial
          <select id="quote-status" value={status} onChange={(event) => onStatusChange(event.target.value)} className="h-10 min-w-44 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50 sm:flex-none">
            {QUOTE_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 disabled:opacity-50 sm:flex-none">Cancelar</button>
          <button type="button" onClick={onSave} disabled={saving || !hasChanges} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#173cff] px-4 text-xs font-bold text-white shadow-[0_8px_20px_rgba(23,60,255,0.18)] transition hover:bg-[#1232da] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none sm:flex-none">
            {saving ? <><Loader2 size={14} className="animate-spin" />Guardando...</> : <><Save size={14} />Guardar cambios</>}
          </button>
        </div>
      </footer>
    </div>
  );
}
