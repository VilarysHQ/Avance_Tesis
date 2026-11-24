import { ChevronLeft, ChevronRight } from "lucide-react";

function ArrowButton({ label, disabled, onClick, children }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-blue-300 hover:text-[#173cff] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-35">
      {children}
    </button>
  );
}

export default function RequestsPagination({ total, currentPage, pageCount, onPageChange }) {
  if (total === 0) return null;
  return (
    <footer className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-slate-500"><span className="font-bold text-slate-700">{total}</span> {total === 1 ? "solicitud" : "solicitudes"}</p>
      <div className="flex items-center gap-1.5" aria-label="Paginación">
        <ArrowButton label="Página anterior" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}><ChevronLeft size={15} /></ArrowButton>
        {Array.from({ length: pageCount }).map((_, index) => {
          const page = index + 1;
          const active = page === currentPage;
          return (
            <button key={page} type="button" aria-current={active ? "page" : undefined} onClick={() => onPageChange(page)} className={`h-8 min-w-8 rounded-lg px-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 ${active ? "bg-[#173cff] text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>
              {page}
            </button>
          );
        })}
        <ArrowButton label="Página siguiente" disabled={currentPage >= pageCount} onClick={() => onPageChange(currentPage + 1)}><ChevronRight size={15} /></ArrowButton>
      </div>
    </footer>
  );
}
