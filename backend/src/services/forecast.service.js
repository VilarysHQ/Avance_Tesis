
import { readFile } from 'node:fs/promises';

const FORECAST_FILE = new URL(
  '../../data/forecast.json',
  import.meta.url
);

export async function getForecast() {
  const content = await readFile(FORECAST_FILE, 'utf8');
  const result = JSON.parse(content);

  if (
    result.status !== 'experimental' ||
    result.company_data !== false ||
    result.currency !== 'GBP' ||
    !Array.isArray(result.history) ||
    !Array.isArray(result.forecast) ||
    !result.metrics
  ) {
    throw new Error('El pronóstico no tiene un formato válido.');
  }

  return result;
}
