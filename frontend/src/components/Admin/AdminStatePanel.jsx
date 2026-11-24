export default function AdminStatePanel({ icon: Icon, message, detail, action, spin = false }) {
  return (
    <div className="flex min-h-64 items-center justify-center px-5 py-12" role="status">
      <div className="max-w-sm text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#173cff]">
          <Icon size={20} className={spin ? "animate-spin" : ""} />
        </span>
        <p className="mt-3 text-sm font-bold text-[#0b1739]">{message}</p>
        {detail && <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>}
        {action && (
          <button type="button" onClick={action.onClick} className="mt-4 rounded-xl bg-[#173cff] px-4 py-2.5 text-xs font-bold text-white shadow-[0_8px_20px_rgba(23,60,255,0.18)] transition hover:bg-[#1232da] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200">
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
