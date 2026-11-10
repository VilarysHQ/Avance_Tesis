import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateServerQuote,
  validateQuoteContract,
} from '../src/domain/quoteCalculator.js';

test('calcula en servidor con las mismas reglas comerciales vigentes', () => {
  const result = calculateServerQuote({
    project_type: 'ecommerce',
    sections: '4-6',
    integrations: ['payment_gateway', 'admin_panel'],
    design_status: 'full',
    deadline: '2-4w',
  });

  assert.deepEqual(result, {
    project_type: 'ecommerce',
    sections_count: null,
    estimated_min: 5050,
    estimated_max: 6450,
    estimated_weeks_min: 5,
    estimated_weeks_max: 8,
  });
});

test('valida los cinco campos y rechaza integraciones incompatibles', () => {
  const errors = validateQuoteContract({
    project_type: 'ecommerce',
    sections: null,
    integrations: ['none', 'whatsapp'],
    design_status: 'full',
    deadline: 'none',
  });
  assert.match(errors.join(' '), /sections/);
  assert.match(errors.join(' '), /integrations/);
});

test('mantiene compatibilidad con los tipos del cuestionario clásico', () => {
  for (const projectType of [
    'landing_page',
    'corporate_web',
    'ecommerce',
    'web_system',
    'other',
  ]) {
    assert.doesNotThrow(() =>
      calculateServerQuote({
        project_type: projectType,
        sections: '1-3',
        integrations: ['none'],
        design_status: 'ready',
        deadline: 'none',
      })
    );
  }
});

test('una selección contextual no confirmada no puede modificar ni producir un precio', () => {
  assert.throws(
    () => calculateServerQuote({
      project_type: 'corporate_web',
      sections: '1-3',
      integrations: [],
      design_status: 'ready',
      deadline: 'none',
    }),
    (error) =>
      error.name === 'QuoteContractError' &&
      error.details.some((detail) => /integrations/.test(detail))
  );
});
