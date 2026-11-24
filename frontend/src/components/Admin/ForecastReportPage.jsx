import { useCallback, useEffect, useState } from "react";
import { AlertCircle, BarChart3, Loader2, RefreshCw, TriangleAlert } from "lucide-react";

import { getForecast } from "../../services/api";
import { getReportPeriod, hasForecastContent, prepareForecastSeries } from "../../utils/forecast";
import AdminPageHeader from "./AdminPageHeader";
import AdminStatePanel from "./AdminStatePanel";
import ForecastMetricCard from "./ForecastMetricCard";
import ForecastTechnicalCard from "./ForecastTechnicalCard";
import SalesForecastChart from "./SalesForecastChart";

function friendlyError(error) {
  if (error?.isNetworkError) return "No pudimos conectar con el servidor.";
  if (error?.isTimeout) return "El reporte tardó demasiado en responder.";
  if (error?.status >= 500) return "El reporte no está disponible temporalmente.";
  return "No se pudo cargar el pronóstico.";
}

export default function ForecastReportPage({ onSessionExpired }) {
  const [state, setState] = useState({ status: "loading", data: null, error: "" });

  const handleResult = useCallback((data) => {
    setState({ status: hasForecastContent(data) ? "ready" : "empty", data, error: "" });
  }, []);

  const handleError = useCallback((error) => {
    if (error?.status === 401 || error?.status === 403) {
      onSessionExpired();
      return;
    }
    setState({ status: "error", data: null, error: friendlyError(error) });
  }, [onSessionExpired]);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, status: "loading", error: "" }));
    try {
      handleResult(await getForecast());
    } catch (error) {
      handleError(error);
    }
  }, [handleError, handleResult]);

  useEffect(() => {
    let active = true;
    getForecast()
      .then((data) => {
        if (active) handleResult(data);
      })
      .catch((error) => {
        if (active) handleError(error);
      });
    return () => {
      active = false;
    };
  }, [handleError, handleResult]);

  if (state.status === "loading") {
    return <ReportState icon={Loader2} spin message="Preparando el reporte" detail="Cargando el pronóstico experimental y sus métricas." />;
  }
  if (state.status === "error") {
    return <ReportState icon={AlertCircle} message="No pudimos cargar el reporte" detail={state.error} action={load} />;
  }
  if (state.status === "empty") {
    return <ReportState icon={BarChart3} message="Aún no hay predicciones" detail="Genera y publica un artefacto de pronóstico para visualizarlo aquí." action={load} />;
  }

  const report = state.data;
  const series = prepareForecastSeries(report);
  const visualPeriod = getReportPeriod(report);
  const recursive = report.horizon_metrics?.recursive_14_day;
  const oneStep = report.horizon_metrics?.one_step ?? report.metrics;

  return (
    <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-7">
      <AdminPageHeader
        eyebrow="Machine Learning"
        title="Pronóstico de ventas"
        description="Lectura experimental del comportamiento histórico y proyección recursiva de los próximos 14 días."
        action={(
          <button type="button" onClick={load} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-600 shadow-sm transition hover:border-blue-300 hover:text-[#173cff] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100">
            <RefreshCw size={14} /> Actualizar
          </button>
        )}
      />

      <aside className="mt-5 flex gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/75 px-4 py-3 text-amber-950" aria-label="Advertencia sobre los datos">
        <TriangleAlert className="mt-0.5 shrink-0 text-amber-600" size={18} />
        <div className="text-xs leading-5">
          <p className="font-extrabold">Dataset público experimental, no ventas reales de J&amp;P Periféricos.</p>
          <p className="text-amber-800/80">Online Retail (UCI), importes en GBP y pronóstico posterior al historial de 2011; no corresponde a 2026.</p>
        </div>
      </aside>

      <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Indicadores de evaluación a 14 días">
        <ForecastMetricCard label="MAE · 14 días" value={recursive?.mae} baseline={recursive?.baseline_mae} />
        <ForecastMetricCard label="RMSE · 14 días" value={recursive?.rmse} baseline={recursive?.baseline_rmse} />
        <ForecastMetricCard label="Observaciones evaluadas" value={recursive?.observations} count note={`${recursive?.blocks?.length ?? 0} bloques temporales`} />
      </section>

      <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200/75 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.055)]" aria-labelledby="forecast-chart-heading">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 id="forecast-chart-heading" className="text-sm font-extrabold text-[#0b1739]">Histórico y proyección</h2>
            <p className="mt-0.5 text-[11px] text-slate-400">Últimos 30 días observados frente a 14 días pronosticados.</p>
          </div>
          <div className="flex flex-wrap gap-4 text-[10px] font-bold text-slate-500">
            <span className="flex items-center gap-2"><span className="h-0.5 w-6 bg-[#173cff]" /> Histórico</span>
            <span className="flex items-center gap-2"><span className="w-6 border-t-2 border-dashed border-violet-600" /> Pronóstico</span>
          </div>
        </div>
        <div className="overflow-x-auto px-3 pb-2 pt-1 sm:px-5"><SalesForecastChart history={series.history} forecast={series.forecast} /></div>
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl border border-slate-200/75 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.045)]" aria-labelledby="one-step-metrics">
          <h2 id="one-step-metrics" className="text-sm font-extrabold text-[#0b1739]">Evaluación a un día</h2>
          <p className="mt-0.5 text-[11px] leading-5 text-slate-400">Usa rezagos reales ya observados; se mantiene separada del horizonte recursivo.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <CompactMetric label="MAE" value={oneStep?.mae} baseline={oneStep?.baseline_mae} />
            <CompactMetric label="RMSE" value={oneStep?.rmse} baseline={oneStep?.baseline_rmse} />
          </div>
        </section>
        <ForecastTechnicalCard report={report} visualPeriod={visualPeriod} />
      </div>
    </main>
  );
}

function CompactMetric({ label, value, baseline }) {
  return <ForecastMetricCard label={`${label} · 1 día`} value={value} baseline={baseline} />;
}

function ReportState({ icon, message, detail, action, spin }) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-70px)] max-w-[1600px] items-center justify-center p-5">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200/75 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.055)]">
        <AdminStatePanel icon={icon} message={message} detail={detail} spin={spin} action={action ? { label: "Reintentar", onClick: action } : undefined} />
      </div>
    </main>
  );
}
