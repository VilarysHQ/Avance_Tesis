import { MAX_AI_MESSAGE_LENGTH } from './ai.controller.js';
import { GeminiServiceError } from '../services/gemini.service.js';
import {
  extractGeminiRequirements,
  RequirementsValidationError,
} from '../services/requirements.service.js';

export function createRequirementsController(extractRequirements = extractGeminiRequirements) {
  return async function requirements(req, res) {
    const message = req.body?.message;
    const context = req.body?.context ?? null;

    if (typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'message debe ser una cadena de texto.',
      });
    }

    const normalizedMessage = message.trim();
    if (!normalizedMessage) {
      return res.status(400).json({ success: false, error: 'message no puede estar vacío.' });
    }
    if (normalizedMessage.length > MAX_AI_MESSAGE_LENGTH) {
      return res.status(413).json({
        success: false,
        error: `message no puede superar los ${MAX_AI_MESSAGE_LENGTH} caracteres.`,
      });
    }

    try {
      const result = await extractRequirements(normalizedMessage, context);
      return res.json({ success: true, ...result });
    } catch (error) {
      if (error instanceof RequirementsValidationError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.publicMessage,
        });
      }
      if (error instanceof GeminiServiceError) {
        console.error('[ai:requirements]', error.code);
        return res.status(error.statusCode).json({
          success: false,
          error: error.publicMessage,
        });
      }
      console.error('[ai:requirements] AI_UNEXPECTED_ERROR');
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor.',
      });
    }
  };
}

export const requirements = createRequirementsController();
