import { getStepById, getSummaryLabel } from "../data/quoteQuestions.js";

const PROJECT_TYPE_SLUGS = {
  landing: "landing_page",
  corporate: "corporate_web",
  ecommerce: "ecommerce",
  system: "web_system",
  other: "other",
};

export const QUOTE_SOURCE = "web_quote";

const PROJECT_TYPE_LABELS_BY_SLUG = {
  landing_page: "Landing page",
  corporate_web: "Web corporativa",
  ecommerce: "Tienda online",
  web_system: "Sistema web",
  other: "Otro",
};

export function getProjectTypeLabelBySlug(slug) {
  return PROJECT_TYPE_LABELS_BY_SLUG[slug] ?? slug ?? null;
}

export function getProjectTypeLabel(value) {
  return getSummaryLabel(getStepById("projectType"), value) ?? null;
}

export function getProjectTypeSlug(value) {
  return PROJECT_TYPE_SLUGS[value] ?? "other";
}

/**
 * Construye un resumen legible del proyecto para guardarlo en `notes`.
 * La tabla quotes no tiene columnas para integraciones, diseño, plazo, etc.,
 * así que se serializan aquí de forma estructurada y entendible.
 */
function joinDetails(values) {
  return Array.isArray(values) && values.length > 0 ? values.join(", ") : "No indicado";
}

export function buildQuoteNotes(answers, requirements = null) {
  const lines = [
    `Tipo de web: ${getSummaryLabel(getStepById("projectType"), answers.projectType) ?? "No indicado"}`,
    `Secciones: ${getSummaryLabel(getStepById("sections"), answers.sections) ?? "No indicado"}`,
    `Integraciones: ${getSummaryLabel(getStepById("integrations"), answers.integrations) ?? "No indicado"}`,
    `Diseño: ${getSummaryLabel(getStepById("designStatus"), answers.designStatus) ?? "No indicado"}`,
    `Plazo: ${getSummaryLabel(getStepById("deadline"), answers.deadline) ?? "No indicado"}`,
    `Detalle adicional: ${answers.additionalDetails?.trim() || "No indicado"}`,
  ];

  if (requirements) {
    lines.push(
      `Descripción del negocio: ${requirements.businessDescription || "No indicado"}`,
      `Funcionalidades solicitadas: ${joinDetails(requirements.requestedFeatures)}`,
      `Detalles de integraciones: ${joinDetails(requirements.integrationDetails)}`,
      `Necesidades de diseño: ${requirements.designNotes || "No indicado"}`,
      `Detalle del plazo: ${requirements.deadlineDetails || "No indicado"}`
    );
  }

  return lines.join("\n");
}

/**
 * Payload para POST /api/quote-requests.
 *
 * Usa los valores YA calculados por calculateQuote (quote.estimatedMin/Max y
 * quote.weeksMin/Max) para no duplicar la lógica de precios.
 */
export function buildQuoteRequestPayload({
  answers,
  contact,
  requestId,
  requirements = null,
}) {
  return {
    request_id: requestId,
    lead: {
      full_name: contact.fullName.trim(),
      company_name: contact.companyName.trim() || null,
      email: contact.email.trim(),
      phone: contact.phone.trim() || null,
      message: contact.message.trim() || null,
      source: QUOTE_SOURCE,
    },
    quote: {
      project_type: getProjectTypeSlug(answers.projectType),
      sections: answers.sections,
      integrations: [...answers.integrations],
      design_status: answers.designStatus,
      deadline: answers.deadline,
      notes: buildQuoteNotes(answers, requirements),
    },
  };
}
