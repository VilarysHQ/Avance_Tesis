const DAY_MS = 24 * 60 * 60 * 1000;

function isFinitePoint(point, valueKey) {
  return (
    typeof point?.date === "string" &&
    Number.isFinite(Date.parse(`${point.date}T00:00:00Z`)) &&
    Number.isFinite(point?.[valueKey])
  );
}

export function prepareForecastSeries(report, historyLimit = 30) {
  const history = Array.isArray(report?.history)
    ? report.history.filter((point) => isFinitePoint(point, "sales")).slice(-historyLimit)
    : [];
  const forecast = Array.isArray(report?.forecast)
    ? report.forecast.filter((point) => isFinitePoint(point, "predicted_sales"))
    : [];

  return {
    history: history.map((point) => ({ date: point.date, value: point.sales })),
    forecast: forecast.map((point) => ({
      date: point.date,
      value: point.predicted_sales,
    })),
  };
}

export function hasForecastContent(report) {
  const series = prepareForecastSeries(report);
  return series.history.length > 0 && series.forecast.length > 0;
}

export function getReportPeriod(report) {
  const series = prepareForecastSeries(report, Number.MAX_SAFE_INTEGER);
  const dates = [...series.history, ...series.forecast].map((point) => point.date);
  if (dates.length === 0) return null;
  return { start: dates[0], end: dates.at(-1) };
}

export function formatGbp(value, { compact = false } = {}) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "GBP",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 2,
  }).format(value);
}

export function formatReportDate(date) {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export function isConsecutiveDate(previous, next) {
  return Date.parse(`${next}T00:00:00Z`) - Date.parse(`${previous}T00:00:00Z`) === DAY_MS;
}
