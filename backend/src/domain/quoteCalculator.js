export const PROJECT_TYPE_BY_SLUG = Object.freeze({
  landing_page: 'landing',
  corporate_web: 'corporate',
  ecommerce: 'ecommerce',
  web_system: 'system',
  other: 'other',
});

export const SECTION_RANGES = Object.freeze(['1-3', '4-6', '7-10', '10+']);
export const INTEGRATIONS = Object.freeze([
  'whatsapp',
  'contact_form',
  'payment_gateway',
  'bookings',
  'admin_panel',
  'none',
]);
export const DESIGN_STATUSES = Object.freeze(['ready', 'brand', 'full']);
export const DEADLINES = Object.freeze(['asap', '2-4w', '1-2m', 'none']);

// Copia autoritativa en servidor de las reglas comerciales vigentes.
// El frontend puede mostrar una vista preliminar, pero estos valores son los
// únicos utilizados al persistir una solicitud comercial.
const BASE_PRICES = Object.freeze({
  landing: 900,
  corporate: 1500,
  ecommerce: 2600,
  system: 3500,
  other: 1200,
});
const SECTION_PRICES = Object.freeze({ '1-3': 0, '4-6': 300, '7-10': 700, '10+': 1200 });
const INTEGRATION_PRICES = Object.freeze({
  whatsapp: 100,
  contact_form: 150,
  payment_gateway: 600,
  bookings: 500,
  admin_panel: 900,
  none: 0,
});
const DESIGN_PRICES = Object.freeze({ ready: 0, brand: 250, full: 700 });
const URGENCY_RATES = Object.freeze({ asap: 0.2, '2-4w': 0.1, '1-2m': 0, none: 0 });
const TIME_RANGES = Object.freeze({
  landing: { min: 1, max: 2 },
  corporate: { min: 2, max: 3 },
  ecommerce: { min: 4, max: 6 },
  system: { min: 6, max: 10 },
  other: { min: 2, max: 4 },
});
const SECTION_TIME_EXTRA = Object.freeze({
  '7-10': { min: 1, max: 1 },
  '10+': { min: 2, max: 2 },
});
const INTEGRATION_TIME_EXTRA = Object.freeze({ admin_panel: { min: 1, max: 2 } });
const RANGE_FACTORS = Object.freeze({ min: 0.9, max: 1.15 });
const ROUND_TO = 50;

function roundToNearest(value) {
  return Math.round(value / ROUND_TO) * ROUND_TO;
}

export function validateQuoteContract({
  project_type: projectType,
  sections,
  integrations,
  design_status: designStatus,
  deadline,
}) {
  const errors = [];
  if (!Object.hasOwn(PROJECT_TYPE_BY_SLUG, projectType)) {
    errors.push('project_type está fuera del contrato permitido.');
  }
  if (!SECTION_RANGES.includes(sections)) {
    errors.push('sections está fuera del contrato permitido.');
  }
  if (
    !Array.isArray(integrations) ||
    integrations.length === 0 ||
    new Set(integrations).size !== integrations.length ||
    integrations.some((value) => !INTEGRATIONS.includes(value)) ||
    (integrations.includes('none') && integrations.length > 1)
  ) {
    errors.push('integrations está fuera del contrato permitido.');
  }
  if (!DESIGN_STATUSES.includes(designStatus)) {
    errors.push('design_status está fuera del contrato permitido.');
  }
  if (!DEADLINES.includes(deadline)) {
    errors.push('deadline está fuera del contrato permitido.');
  }
  return errors;
}

export function calculateServerQuote(contract) {
  const errors = validateQuoteContract(contract);
  if (errors.length > 0) {
    const error = new Error('Contrato de cotización inválido.');
    error.name = 'QuoteContractError';
    error.details = errors;
    throw error;
  }

  const projectType = PROJECT_TYPE_BY_SLUG[contract.project_type];
  const basePrice = BASE_PRICES[projectType];
  const sectionsPrice = SECTION_PRICES[contract.sections];
  const integrationsPrice = contract.integrations.reduce(
    (total, integration) => total + INTEGRATION_PRICES[integration],
    0
  );
  const designPrice = DESIGN_PRICES[contract.design_status];
  const subtotal = basePrice + sectionsPrice + integrationsPrice + designPrice;
  const total = subtotal * (1 + URGENCY_RATES[contract.deadline]);

  const weeks = { ...TIME_RANGES[projectType] };
  const sectionExtra = SECTION_TIME_EXTRA[contract.sections];
  if (sectionExtra) {
    weeks.min += sectionExtra.min;
    weeks.max += sectionExtra.max;
  }
  for (const integration of contract.integrations) {
    const extra = INTEGRATION_TIME_EXTRA[integration];
    if (extra) {
      weeks.min += extra.min;
      weeks.max += extra.max;
    }
  }

  return {
    project_type: contract.project_type,
    sections_count: null,
    estimated_min: roundToNearest(total * RANGE_FACTORS.min),
    estimated_max: roundToNearest(total * RANGE_FACTORS.max),
    estimated_weeks_min: weeks.min,
    estimated_weeks_max: weeks.max,
  };
}
