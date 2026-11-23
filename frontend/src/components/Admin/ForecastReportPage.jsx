import { useCallback, useEffect, useState } from "react";
import { AlertCircle, BarChart3, Loader2, RefreshCw, TriangleAlert } from "lucide-react";

import { getForecast } from "../../services/api";
import {
  formatGbp,
  formatReportDate,
  getReportPeriod,
  hasForecastContent,
  prepareForecastSeries,
} from "../../utils/forecast";
import SalesForecastChart from "./SalesForecastChart";

function friendlyError(error) {
  if (error?.isNetworkError) return "No pudimos conectar con el servidor.";
  if (error?.isTimeout) return "El reporte tardó demasiado en responder.";
  if (error?.status >= 500) return "El reporte no está disponible temporalmente.";
  return "No se pudo cargar el pronóstico.";
}

function MetricCard({ label, value, baseline }) {
  const improves = Number.isFinite(value) && Number.isFinite(baseline) && value < baseline;
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_12px_35px_rgba(30,64,175,0.05)]">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-extrabold text-[#07112d]">{formatGbp(value)}</p>
      <p className="mt-1 text-xs text-slate-500">
        Base: {formatGbp(baseline)} · {improves ? "mejora frente a la base" : "sin mejora frente a la base"}
      </p>
    </article>
  );
}

export default function ForecastReportPage({ onSessionExpired }) {
  const [state, setState] = useState({ status: "loading", data: null, error: "" });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, status: "loading", error: "" }));
    try {
      const data = await getForecast();
      setState({ status: hasForecastContent(data) ? "ready" : "empty", data, error: "" });
    } catch (error) {
      if (error?.status === 401 || error?.status === 403) {
        onSessionExpired();
        return;
      }
      setState({ status: "error", data: null, error: friendlyError(error) });
    }
  }, [onSessionExpired]);

  useEffect(() => {
    let active = true;
    getForecast()
      .then((data) => {
        if (!active) return;
        setState({ status: hasForecastContent(data) ? "ready" : "empty", data, error: "" });
      })
      .catch((error) => {
        if (!active) return;
        if (error?.status === 401 || error?.status === 403) {
          onSessionExpired();
          return;
        }
        setState({ status: "error", data: null, error: friendlyError(error) });
      });
    return () => {
      active = false;
    };
  }, [onSessionExpired]);

  if (state.status === "loading") {
    return <ReportState icon={Loader2} spin message="Cargando pronóstico experimental..." />;
  }
  if (state.status === "error") {
    return <ReportState icon={AlertCircle} message={state.error} action={load} />;
  }
  if (state.status === "empty") {
    return <ReportState icon={BarChart3} message="Todavía no hay datos de pronóstico disponibles." action={load} />;
  }

  const report = state.data;
  const series = prepareForecastSeries(report);
  const period = getReportPeriod(report);
  const recursiveMetrics = report.horizon_metrics?.recursive_14_day;
  const datasetPeriod = report.dataset_period;

  return (
    <main className="min-w-0 p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-[#07112d]">Pronóstico de ventas</h1>
          <p className="mt-1 text-[13px] text-slate-500">Evaluación experimental de series temporales para fines académicos.</p>
        </div>
        <button type="button" onClick={load} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:text-[#173cff]">
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      <section className="mt-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950" aria-label="Advertencia sobre los datos">
        <TriangleAlert className="mt-0.5 shrink-0 text-amber-600" size={20} />
        <div className="text-sm leading-6">
          <p className="font-bold">Datos experimentales: no representan ventas reales de J&amp;P Periféricos.</p>
          <p>Fuente: UCI Online Retail. Los importes están en GBP y el pronóstico continúa el periodo histórico de 2011; no corresponde a 2026.</p>
        </div>
      </section>

      <section className="mt-5 overflow-x-auto rounded-[18px] border border-slate-100 bg-white p-4 shadow-[0_20px_60px_rgba(30,64,175,0.06)] sm:p-5" aria-label="Gráfico del pronóstico">
        <div className="mb-3 flex flex-wrap gap-5 text-xs font-semibold text-slate-600">
          <span className="flex items-center gap-2"><span className="h-0.5 w-7 bg-[#173cff]" /> Histórico (30 días)</span>
          <span className="flex items-center gap-2"><span className="w-7 border-t-2 border-dashed border-violet-600" /> Pronóstico (14 días)</span>
        </div>
        <SalesForecastChart history={series.history} forecast={series.forecast} />
      </section>

      <section className="mt-5" aria-labelledby="one-step-metrics">
        <h2 id="one-step-metrics" className="font-extrabold text-[#07112d]">Evaluación a un día</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">Cada predicción utiliza los rezagos reales que ya estaban observados en el conjunto de evaluación.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <MetricCard label="MAE · 1 día" value={report.metrics?.mae} baseline={report.metrics?.baseline_mae} />
          <MetricCard label="RMSE · 1 día" value={report.metrics?.rmse} baseline={report.metrics?.baseline_rmse} />
        </div>
      </section>

      {recursiveMetrics && (
        <section className="mt-5" aria-labelledby="recursive-metrics">
          <h2 id="recursive-metrics" className="font-extrabold text-[#07112d]">Evaluación recursiva a 14 días</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Las predicciones anteriores alimentan los rezagos siguientes, sin observar los valores reales del bloque. {recursiveMetrics.blocks?.length ?? 0} bloques, {recursiveMetrics.observations ?? 0} observaciones.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <MetricCard label="MAE · 14 días" value={recursiveMetrics.mae} baseline={recursiveMetrics.baseline_mae} />
            <MetricCard label="RMSE · 14 días" value={recursiveMetrics.rmse} baseline={recursiveMetrics.baseline_rmse} />
          </div>
        </section>
      )}

      <section className="mt-5 rounded-[18px] border border-slate-100 bg-white p-5 shadow-[0_20px_60px_rgba(30,64,175,0.06)]" aria-labelledby="forecast-details">
        <h2 id="forecast-details" className="font-extrabold text-[#07112d]">Ficha del experimento</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-3">
          <Detail label="Dataset" value={report.dataset} />
          <Detail label="Algoritmo" value={report.model} />
          <Detail label="Periodo del dataset" value={datasetPeriod?.start && datasetPeriod?.end ? `${formatReportDate(datasetPeriod.start)} – ${formatReportDate(datasetPeriod.end)}` : "—"} />
          <Detail label="Periodo visualizado" value={period ? `${formatReportDate(period.start)} – ${formatReportDate(period.end)}` : "—"} />
          <Detail label="Cobertura del dataset" value={Number.isFinite(report.days) ? `${report.days} días` : "—"} />
          <Detail label="Observaciones de entrenamiento" value={report.train_samples} />
          <Detail label="Observaciones de prueba" value={report.test_samples} />
        </dl>
      </section>
    </main>
  );
}

function Detail({ label, value }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">{label}</dt><dd className="mt-1 font-semibold text-slate-700">{value ?? "—"}</dd></div>;
}

function ReportState({ icon: Icon, spin = false, message, action }) {
  return (
    <main className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="text-center">
        <Icon size={30} className={`mx-auto text-[#173cff] ${spin ? "animate-spin" : ""}`} />
        <p className="mt-3 text-sm text-slate-600">{message}</p>
        {action && <button type="button" onClick={action} className="mt-4 rounded-xl bg-[#173cff] px-4 py-2.5 text-xs font-semibold text-white">Reintentar</button>}
      </div>
    </main>
  );
}
