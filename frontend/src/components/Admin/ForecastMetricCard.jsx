import { ArrowDownRight } from "lucide-react";

import { formatGbp } from "../../utils/forecast";

export default function ForecastMetricCard({ label, value, baseline, note, count = false }) {
  const comparable = Number.isFinite(value) && Number.isFinite(baseline) && baseline > 0;
  const improvement = comparable ? ((baseline - value) / baseline) * 100 : null;

  return (
    <article className="rounded-2xl border border-slate-200/75 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.045)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">{label}</p>
        {improvement !== null && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-extrabold ${improvement > 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
            <ArrowDownRight size={12} /> {Math.abs(improvement).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="mt-3 text-[24px] font-extrabold tracking-[-0.035em] text-[#0b1739]">
        {count ? value ?? "—" : formatGbp(value)}
      </p>
      <p className="mt-1 text-[11px] leading-5 text-slate-500">
        {comparable ? `Referencia: ${formatGbp(baseline)}` : note}
      </p>
    </article>
  );
}
