const TONES = {
  blue: "bg-blue-50 text-[#173cff] ring-blue-100",
  indigo: "bg-indigo-50 text-indigo-600 ring-indigo-100",
  amber: "bg-amber-50 text-amber-600 ring-amber-100",
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
};

export default function AdminStatCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "blue",
}) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200/75 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.045)] transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_16px_36px_rgba(23,60,255,0.08)] sm:p-5">
      <span className="absolute inset-x-0 top-0 h-0.5 bg-[#173cff] opacity-0 transition group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
          <p className="mt-2 text-[27px] font-extrabold leading-none tracking-[-0.04em] text-[#0b1739] sm:text-[30px]">{value}</p>
        </div>
      <div
        className={`
          flex
          h-10
          w-10
          items-center
          justify-center
          rounded-[13px]
          ring-1
          ${TONES[tone] ?? TONES.blue}
        `}
      >
        {Icon && <Icon size={17} />}
      </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">{detail}</p>
    </article>
  );
}
