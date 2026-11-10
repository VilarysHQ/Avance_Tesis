import { QUOTE_STATUSES } from "./quoteStatus.js";

export function isAllowedQuoteStatus(status) {
  return QUOTE_STATUSES.includes(status);
}
export async function saveConfirmedQuoteStatus({
  quotes,
  quoteId,
  status,
  request,
}) {
  if (!isAllowedQuoteStatus(status)) {
    throw new TypeError("El estado seleccionado no es válido.");
  }

  const response = await request(quoteId, status);
  const updated = response?.data;
  if (!updated || updated.id !== quoteId || !isAllowedQuoteStatus(updated.status)) {
    throw new Error("El servidor devolvió una actualización no válida.");
  }

  return {
    updated,
    quotes: quotes.map((quote) =>
      quote.id === quoteId ? { ...quote, ...updated } : quote
    ),
  };
}
