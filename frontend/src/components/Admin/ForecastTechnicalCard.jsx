import { formatReportDate } from "../../utils/forecast";

function Detail({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50/80 px-3 py-2.5">
      <dt className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400">{label}</dt>
      <dd className="mt-1 text-xs font-bold text-slate-700">{value ?? "—"}</dd>
    </div>
  );
}

export default function ForecastTechnicalCard({ report, visualPeriod }) {
  const datasetPeriod = report.dataset_period;
  const datasetDates = datasetPeriod?.start && datasetPeriod?.end
    ? `${formatReportDate(datasetPeriod.start)} – ${formatReportDate(datasetPeriod.end)}`
    : "—";
  const visualDates = visualPeriod
    ? `${formatReportDate(visualPeriod.start)} – ${formatReportDate(visualPeriod.end)}`
    : "—";

  return (
    <section className="rounded-2xl border border-slate-200/75 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.045)]" aria-labelledby="forecast-details">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="forecast-details" className="text-sm font-extrabold text-[#0b1739]">Ficha técnica</h2>
          <p className="mt-0.5 text-[11px] text-slate-400">Configuración y cobertura del experimento.</p>
        </div>
        <span className="rounded-lg bg-blue-50 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider text-[#173cff]">Experimental</span>
      </div>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <Detail label="Dataset" value={report.dataset} />
        <Detail label="Algoritmo" value={report.model} />
        <Detail label="Periodo del dataset" value={datasetDates} />
        <Detail label="Periodo visualizado" value={visualDates} />
        <Detail label="Cobertura" value={Number.isFinite(report.days) ? `${report.days} días` : "—"} />
        <Detail label="Entrenamiento / prueba" value={`${report.train_samples ?? "—"} / ${report.test_samples ?? "—"}`} />
      </dl>
    </section>
  );
}
