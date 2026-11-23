import assert from "node:assert/strict";
import test from "node:test";

import {
  formatGbp,
  getReportPeriod,
  hasForecastContent,
  prepareForecastSeries,
} from "../src/utils/forecast.js";

function createReport() {
  return {
    history: Array.from({ length: 35 }, (_, index) => ({
      date: new Date(Date.UTC(2011, 9, 27 + index)).toISOString().slice(0, 10),
      sales: index * 100,
    })),
    forecast: Array.from({ length: 14 }, (_, index) => ({
      date: `2011-12-${String(index + 1).padStart(2, "0")}`,
      predicted_sales: 4000 + index * 10,
    })),
  };
}

test("prepara únicamente los últimos 30 históricos y los 14 pronosticados", () => {
  const series = prepareForecastSeries(createReport());
  assert.equal(series.history.length, 30);
  assert.equal(series.forecast.length, 14);
  assert.deepEqual(series.history.at(-1), { date: "2011-11-30", value: 3400 });
  assert.deepEqual(series.forecast[0], { date: "2011-12-01", value: 4000 });
});

test("descarta puntos inválidos y detecta un reporte vacío", () => {
  const report = {
    history: [{ date: "invalid", sales: 10 }],
    forecast: [{ date: "2011-12-10", predicted_sales: "10" }],
  };
  assert.deepEqual(prepareForecastSeries(report), { history: [], forecast: [] });
  assert.equal(hasForecastContent(report), false);
});

test("obtiene el periodo completo y formatea importes como GBP", () => {
  const report = createReport();
  assert.deepEqual(getReportPeriod(report), {
    start: "2011-10-27",
    end: "2011-12-14",
  });
  assert.match(formatGbp(1234.5), /GBP|£/);
});
