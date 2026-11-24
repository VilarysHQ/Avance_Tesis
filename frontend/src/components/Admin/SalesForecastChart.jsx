import { useState } from "react";

import { formatGbp, formatReportDate } from "../../utils/forecast";

const WIDTH = 900;
const HEIGHT = 260;
const MARGIN = { top: 18, right: 24, bottom: 42, left: 72 };

function pointsFor(series, dates, scaleY) {
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const x = (date) =>
    MARGIN.left + (dates.indexOf(date) / Math.max(1, dates.length - 1)) * plotWidth;
  return series.map((point) => `${x(point.date)},${scaleY(point.value)}`).join(" ");
}

function interactivePoints(series, dates, scaleY, type) {
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  return series.map((point) => ({
    ...point,
    type,
    x: MARGIN.left
      + (dates.indexOf(point.date) / Math.max(1, dates.length - 1)) * plotWidth,
    y: scaleY(point.value),
  }));
}

export default function SalesForecastChart({ history, forecast }) {
  const [activePoint, setActivePoint] = useState(null);
  const bridge = history.length > 0 ? [history.at(-1), ...forecast] : forecast;
  const all = [...history, ...forecast];
  const dates = [...new Set(all.map((point) => point.date))];
  const values = all.map((point) => point.value);
  const maximum = Math.max(...values, 1);
  const minimum = Math.min(...values, 0);
  const padding = Math.max((maximum - minimum) * 0.1, 1);
  const top = maximum + padding;
  const bottom = Math.max(0, minimum - padding);
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const scaleY = (value) =>
    MARGIN.top + ((top - value) / Math.max(1, top - bottom)) * plotHeight;
  const ticks = Array.from({ length: 5 }, (_, index) =>
    bottom + ((top - bottom) * index) / 4
  ).reverse();
  const labelIndexes = [0, Math.floor((dates.length - 1) / 2), dates.length - 1];
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const forecastStartIndex = dates.indexOf(forecast[0]?.date);
  const forecastStartX = MARGIN.left
    + (forecastStartIndex / Math.max(1, dates.length - 1)) * plotWidth;
  const dataPoints = [
    ...interactivePoints(history, dates, scaleY, "Histórico"),
    ...interactivePoints(forecast, dates, scaleY, "Pronóstico"),
  ];

  return (
    <figure aria-labelledby="forecast-chart-title" className="min-w-[640px]">
      <figcaption id="forecast-chart-title" className="sr-only">
        Ventas históricas de los últimos 30 días y pronóstico de los próximos 14 días, en libras esterlinas.
      </figcaption>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="group"
        aria-label="Gráfico interactivo de ventas históricas y pronosticadas"
        aria-describedby="forecast-chart-description"
        className="h-auto max-h-[250px] w-full"
      >
        <desc id="forecast-chart-description">
          La línea azul continua representa datos históricos y la línea violeta discontinua representa valores pronosticados.
        </desc>
        {forecastStartIndex >= 0 && (
          <rect
            x={forecastStartX}
            y={MARGIN.top}
            width={WIDTH - MARGIN.right - forecastStartX}
            height={HEIGHT - MARGIN.top - MARGIN.bottom}
            rx="8"
            fill="#f5f3ff"
          />
        )}
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={MARGIN.left}
              x2={WIDTH - MARGIN.right}
              y1={scaleY(tick)}
              y2={scaleY(tick)}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            <text
              x={MARGIN.left - 12}
              y={scaleY(tick) + 4}
              textAnchor="end"
              fill="#64748b"
              fontSize="11"
            >
              {formatGbp(tick, { compact: true })}
            </text>
          </g>
        ))}
        <polyline
          points={pointsFor(history, dates, scaleY)}
          fill="none"
          stroke="#173cff"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {forecastStartIndex >= 0 && (
          <line
            x1={forecastStartX}
            x2={forecastStartX}
            y1={MARGIN.top}
            y2={HEIGHT - MARGIN.bottom}
            stroke="#a78bfa"
            strokeWidth="1"
            strokeDasharray="4 5"
          />
        )}
        <polyline
          points={pointsFor(bridge, dates, scaleY)}
          fill="none"
          stroke="#7c3aed"
          strokeWidth="3"
          strokeDasharray="8 7"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {labelIndexes.map((index) => {
          const date = dates[index];
          const x = MARGIN.left + (index / Math.max(1, dates.length - 1)) * (WIDTH - MARGIN.left - MARGIN.right);
          return (
            <text key={`${date}-${index}`} x={x} y={HEIGHT - 18} textAnchor={index === 0 ? "start" : index === dates.length - 1 ? "end" : "middle"} fill="#64748b" fontSize="11">
              {formatReportDate(date)}
            </text>
          );
        })}
        {dataPoints.map((point) => {
          const active = activePoint?.date === point.date && activePoint?.type === point.type;
          return (
            <g
              key={`${point.type}-${point.date}`}
              tabIndex="0"
              focusable="true"
              role="img"
              aria-label={`${point.type}, ${formatReportDate(point.date)}, ${formatGbp(point.value)}`}
              onMouseEnter={() => setActivePoint(point)}
              onMouseLeave={() => setActivePoint(null)}
              onFocus={() => setActivePoint(point)}
              onBlur={() => setActivePoint(null)}
              onClick={() => setActivePoint(point)}
              className="cursor-crosshair outline-none"
            >
              <circle cx={point.x} cy={point.y} r="8" fill="transparent" />
              <circle
                cx={point.x}
                cy={point.y}
                r={active ? 4.5 : 2.5}
                fill={point.type === "Histórico" ? "#173cff" : "#7c3aed"}
                fillOpacity={active ? 1 : 0.35}
                stroke="white"
                strokeWidth={active ? 2 : 1}
              />
            </g>
          );
        })}
        {activePoint && <ChartTooltip point={activePoint} />}
      </svg>
      <p className="pb-1 text-center text-[10px] text-slate-400">
        Pasa el cursor, toca un punto o usa Tab para consultar fecha e importe.
      </p>
      <span className="sr-only" aria-live="polite">
        {activePoint
          ? `${activePoint.type}, ${formatReportDate(activePoint.date)}, ${formatGbp(activePoint.value)}`
          : ""}
      </span>
    </figure>
  );
}

function ChartTooltip({ point }) {
  const width = 178;
  const height = 52;
  const x = point.x > WIDTH - width - MARGIN.right
    ? point.x - width - 10
    : point.x + 10;
  const y = Math.max(MARGIN.top + 4, point.y - height - 10);

  return (
    <g pointerEvents="none" aria-hidden="true">
      <rect x={x} y={y} width={width} height={height} rx="9" fill="#0f172a" opacity="0.96" />
      <text x={x + 12} y={y + 19} fill="#cbd5e1" fontSize="10" fontWeight="600">
        {point.type} · {formatReportDate(point.date)}
      </text>
      <text x={x + 12} y={y + 39} fill="white" fontSize="13" fontWeight="700">
        {formatGbp(point.value)}
      </text>
    </g>
  );
}
