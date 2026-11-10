import * as leadsService from '../services/leads.service.js';
import * as quotesService from '../services/quotes.service.js';
import {
  calculateServerQuote,
  validateQuoteContract,
} from '../domain/quoteCalculator.js';
import { toIntegerOrNull, toNullableString } from '../utils/validators.js';

const ALLOWED_STATUSES = [
  'draft',
  'submitted',
  'contacted',
  'sent',
  'negotiation',
  'won',
  'lost',
];

export async function listQuotes(req, res, next) {
  try {
    const quotes = await quotesService.listQuotes();
    return res.json({ data: quotes });
  } catch (error) {
    return next(error);
  }
}

export function createQuoteController({
  findLead = leadsService.findLeadById,
  persistQuote = quotesService.createQuote,
} = {}) {
  return async function createQuoteHandler(req, res, next) {
    try {
      const body = req.body ?? {};

      const leadId = toIntegerOrNull(body.lead_id);
      const projectType = toNullableString(body.project_type);
      const sections = toNullableString(body.sections);
      const integrations = body.integrations;
      const designStatus = toNullableString(body.design_status);
      const deadline = toNullableString(body.deadline);
      const notes = toNullableString(body.notes);
      const status = toNullableString(body.status) ?? 'draft';
      const quoteContract = {
        project_type: projectType,
        sections,
        integrations,
        design_status: designStatus,
        deadline,
      };

      const errors = [];

      if (leadId === null || leadId <= 0) {
        errors.push('lead_id es obligatorio y debe ser un entero positivo.');
      }

      errors.push(...validateQuoteContract(quoteContract));

      if (!ALLOWED_STATUSES.includes(status)) {
        errors.push(`status debe ser uno de: ${ALLOWED_STATUSES.join(', ')}.`);
      }

      if (errors.length > 0) {
        return res.status(400).json({ error: 'Validación fallida.', details: errors });
      }

      const leadExists = await findLead(leadId);
      if (!leadExists) {
        return res.status(400).json({
          error: 'Validación fallida.',
          details: [`No existe un lead con id ${leadId}.`],
        });
      }

      const calculatedQuote = calculateServerQuote(quoteContract);
      const quote = await persistQuote({
        lead_id: leadId,
        ...calculatedQuote,
        status,
        notes,
      });

      return res.status(201).json({ data: quote });
    } catch (error) {
      return next(error);
    }
  };
}

export const createQuote = createQuoteController();

/**
 * Actualiza únicamente el estado de una cotización existente.
 * PATCH /api/quotes/:id/status
 */
export function updateQuoteStatusController(
  persistStatus = quotesService.updateQuoteStatus
) {
  return async function updateQuoteStatusHandler(req, res, next) {
    try {
      const quoteId = toIntegerOrNull(req.params.id);
      const status = toNullableString(req.body?.status);

      const errors = [];

      if (quoteId === null || quoteId <= 0) {
        errors.push('id debe ser un entero positivo.');
      }

      if (!status) {
        errors.push('status es obligatorio.');
      } else if (!ALLOWED_STATUSES.includes(status)) {
        errors.push(`status debe ser uno de: ${ALLOWED_STATUSES.join(', ')}.`);
      }

      if (errors.length > 0) {
        return res.status(400).json({ error: 'Validación fallida.', details: errors });
      }

      const quote = await persistStatus(quoteId, status);

      if (!quote) {
        return res.status(404).json({
          error: 'No se encontró la cotización solicitada.',
          details: [`No existe una cotización con id ${quoteId}.`],
        });
      }

      return res.json({ data: quote });
    } catch (error) {
      return next(error);
    }
  };
}

export const updateQuoteStatus = updateQuoteStatusController();
