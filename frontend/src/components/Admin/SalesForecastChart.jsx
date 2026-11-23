import { formatGbp, formatReportDate } from "../../utils/forecast";

const WIDTH = 900;
const HEIGHT = 340;
const MARGIN = { top: 24, right: 28, bottom: 52, left: 76 };

function pointsFor(series, dates, scaleY) {
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const x = (date) =>
    MARGIN.left + (dates.indexOf(date) / Math.max(1, dates.length - 1)) * plotWidth;
  return series.map((point) => `${x(point.date)},${scaleY(point.value)}`).join(" ");
}

export default function SalesForecastChart({ history, forecast }) {
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

  return (
    <figure aria-labelledby="forecast-chart-title" className="min-w-[680px]">
      <figcaption id="forecast-chart-title" className="sr-only">
        Ventas históricas de los últimos 30 días y pronóstico de los próximos 14 días, en libras esterlinas.
      </figcaption>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-describedby="forecast-chart-description"
        className="h-auto w-full"
      >
        <desc id="forecast-chart-description">
          La línea azul continua representa datos históricos y la línea violeta discontinua representa valores pronosticados.
        </desc>
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
      </svg>
    </figure>
  );
}
