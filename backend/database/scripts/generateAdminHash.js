import { hashAdminPassword } from '../../src/services/adminAuth.service.js';

const password = process.env.ADMIN_PASSWORD;
if (!password) {
  console.error('Define ADMIN_PASSWORD temporalmente para generar el hash.');
  process.exitCode = 1;
} else {
  try {
    console.log(await hashAdminPassword(password));
  } finally {
    delete process.env.ADMIN_PASSWORD;
  }
}
