import { generateGeminiReply, GeminiServiceError } from '../services/gemini.service.js';

export const MAX_AI_MESSAGE_LENGTH = 2_000;

export function createAiChatController(generateReply = generateGeminiReply) {
  return async function chat(req, res) {
    const message = req.body?.message;

    if (typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'message debe ser una cadena de texto.',
      });
    }

    const normalizedMessage = message.trim();

    if (!normalizedMessage) {
      return res.status(400).json({
        success: false,
        error: 'message no puede estar vacío.',
      });
    }

    if (normalizedMessage.length > MAX_AI_MESSAGE_LENGTH) {
      return res.status(413).json({
        success: false,
        error: `message no puede superar los ${MAX_AI_MESSAGE_LENGTH} caracteres.`,
      });
    }

    try {
      const reply = await generateReply(normalizedMessage);
      return res.json({ success: true, reply });
    } catch (error) {
      if (error instanceof GeminiServiceError) {
        console.error('[ai]', error.code);
        return res.status(error.statusCode).json({
          success: false,
          error: error.publicMessage,
        });
      }

      console.error('[ai] AI_UNEXPECTED_ERROR');
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor.',
      });
    }
  };
}

export const chat = createAiChatController();
