import { createHash } from 'node:crypto';

import * as quoteRequestsService from '../services/quoteRequests.service.js';
import {
  calculateServerQuote,
  validateQuoteContract,
} from '../domain/quoteCalculator.js';
import {
  isNonEmptyString,
  isValidEmail,
  toNullableString,
} from '../utils/validators.js';

const MAX_MESSAGE_LENGTH = 1000;
const MAX_PHONE_LENGTH = 40;
const MAX_NOTES_LENGTH = 5_000;
const REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function hashRequest(payload) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

/**
 * Crea de forma transaccional un lead y su cotización asociada.
 *
 * Body esperado:
 * {
 *   lead:  { full_name, company_name?, email?, phone?, message?, source? },
 *   quote: { project_type, sections, integrations, design_status, deadline, notes? }
 * }
 */
export function createQuoteRequestController(
  persistQuoteRequest = quoteRequestsService.createQuoteRequest
) {
  return async function createQuoteRequestHandler(req, res, next) {
    try {
      const body = req.body ?? {};
      const requestId = toNullableString(body.request_id);
      const leadBody = body.lead ?? {};
      const quoteBody = body.quote ?? {};

      const fullName = toNullableString(leadBody.full_name);
      const companyName = toNullableString(leadBody.company_name);
      const email = toNullableString(leadBody.email);
      const phone = toNullableString(leadBody.phone);
      const message = toNullableString(leadBody.message);
      const source = 'web_quote';

      const projectType = toNullableString(quoteBody.project_type);
      const sections = toNullableString(quoteBody.sections);
      const integrations = quoteBody.integrations;
      const designStatus = toNullableString(quoteBody.design_status);
      const deadline = toNullableString(quoteBody.deadline);
      const notes = toNullableString(quoteBody.notes);
      const quoteContract = {
        project_type: projectType,
        sections,
        integrations,
        design_status: designStatus,
        deadline,
      };

      const errors = [];

      if (!requestId || !REQUEST_ID_PATTERN.test(requestId)) {
        errors.push('request_id debe ser un UUID válido.');
      }

      if (!isNonEmptyString(leadBody.full_name)) {
        errors.push('full_name es obligatorio.');
      }

      if (!email && !phone) {
        errors.push('Debes proporcionar al menos email o phone.');
      }

      if (email && !isValidEmail(email)) {
        errors.push('email no tiene un formato válido.');
      }

      if (phone && phone.length > MAX_PHONE_LENGTH) {
        errors.push(`phone no puede superar los ${MAX_PHONE_LENGTH} caracteres.`);
      }

      if (message && message.length > MAX_MESSAGE_LENGTH) {
        errors.push(`message no puede superar los ${MAX_MESSAGE_LENGTH} caracteres.`);
      }

      errors.push(...validateQuoteContract(quoteContract));

      if (notes && notes.length > MAX_NOTES_LENGTH) {
        errors.push(`notes no puede superar los ${MAX_NOTES_LENGTH} caracteres.`);
      }

      if (errors.length > 0) {
        return res.status(400).json({ error: 'Validación fallida.', details: errors });
      }

      const calculatedQuote = calculateServerQuote(quoteContract);
      const normalizedPayload = {
        lead: {
          full_name: fullName,
          company_name: companyName,
          email,
          phone,
          message,
          source,
        },
        quote: {
          ...calculatedQuote,
          status: 'submitted',
          notes,
        },
      };
      const result = await persistQuoteRequest({
        requestId,
        requestHash: hashRequest(normalizedPayload),
        ...normalizedPayload,
      });

      return res.status(201).json({ data: result });
    } catch (error) {
      if (error instanceof quoteRequestsService.IdempotencyConflictError) {
        return res.status(409).json({
          error: 'La solicitud ya fue utilizada con otro contenido.',
        });
      }
      return next(error);
    }
  };
}

export const createQuoteRequest = createQuoteRequestController();
