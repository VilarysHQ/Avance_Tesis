# Backend - Predict Sale App

API REST del sistema web de ventas (proyecto de tesis). Esta primera etapa implementa
los cimientos full-stack: conexión a PostgreSQL, migraciones, seeds y una API mínima.

- **Stack:** Node.js + Express + PostgreSQL (`pg`, sin ORM).
- **Módulo:** ESM (`"type": "module"`).

## 1. Requisitos

- Node.js >= 20 (probado con v24).
- PostgreSQL 13+ en ejecución local (probado con PostgreSQL 17).
- npm.

## 2. Crear la base de datos local

Con `psql` (o `createdb`) en tu PATH:

```bash
createdb -U postgres predict_sale
```

Alternativa con `psql`:

```sql
CREATE DATABASE predict_sale;
```

> Si ya existe la base, omite este paso.

## 2.1. Cliente `psql` / `createdb` (Windows)

Si `psql` no está en el `PATH`, puedes usar la ruta completa, por ejemplo:

```powershell
& "C:\Program Files\PostgreSQL\17\bin\createdb.exe" -U postgres -h localhost -p 5432 predict_sale
```

## 2. Configurar variables de entorno

Copia el archivo de ejemplo y edítalo con tus credenciales locales:

```bash
cp .env.example .env
```

Contenido:

```env
PORT=3001
DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/predict_sale
TEST_DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/predict_sale_test
GEMINI_API_KEY=TU_CLAVE_DE_GOOGLE_AI_STUDIO
GEMINI_MODEL=gemini-3.5-flash-lite
CORS_ORIGIN=http://localhost:5173
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD_HASH=HASH_SCRYPT_GENERADO
ADMIN_SESSION_SECRET=SECRETO_ALEATORIO_DE_AL_MENOS_32_CARACTERES
ADMIN_SESSION_TTL_MINUTES=30
```

> El archivo `.env` está ignorado por git. **No subas contraseñas reales.**

`GEMINI_API_KEY` se obtiene manualmente en Google AI Studio y solo debe existir en
el entorno del servidor. `GEMINI_MODEL` es configurable; el valor recomendado para
esta etapa es `gemini-3.5-flash-lite`, un modelo Flash estable orientado a respuestas de
baja latencia. Si la clave no está configurada, el resto de la API continúa
disponible y `/api/ai/chat` responde con un error seguro `503`.

### Acceso administrativo

El panel usa una única identidad configurada en el backend. La contraseña nunca se
guarda en texto plano: `ADMIN_PASSWORD_HASH` contiene un hash scrypt con sal. Para
generarlo sin modificar la base de datos, define `ADMIN_PASSWORD` únicamente en el
proceso actual, ejecuta el comando y elimina inmediatamente esa variable:

```powershell
$securePassword = Read-Host "Contraseña administrativa" -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
  $env:ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  npm run admin:hash
} finally {
  Remove-Item Env:ADMIN_PASSWORD -ErrorAction SilentlyContinue
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
}
```

Guarda el hash resultante en el gestor de secretos de Render, no en Git. Configura
también `ADMIN_SESSION_SECRET` con un valor aleatorio de al menos 32 caracteres.

La sesión administrativa es opaca, firmada, HttpOnly y expira a los 30 minutos por
defecto. En producción la cookie usa `Secure` y `SameSite=None` para la comunicación
Vercel–Render. Cada mutación requiere además un token CSRF ligado a la sesión y un
origen incluido exactamente en `CORS_ORIGIN`. Cerrar sesión revoca inmediatamente
la sesión en el proceso. Un reinicio del backend cierra todas las sesiones activas.

## 3. Instalar dependencias

```bash
npm install
```

## 4. Ejecutar migraciones

Crea las tablas del esquema inicial. El script registra las migraciones ya aplicadas
en la tabla `schema_migrations`, por lo que puede ejecutarse varias veces sin duplicar.

```bash
npm run db:migrate
```

## 5. Cargar datos seed

Carga los servicios base y un **historial de ventas SIMULADO** (datos ficticios para
pruebas de dashboard y futuras pruebas de Machine Learning).

> **Aviso:** `npm run db:seed` reinicia la tabla `sales` y la reemplaza con los datos
> simulados. No ejecutar sobre una base con ventas reales que quieras conservar.

```bash
npm run db:seed
```

Estos datos **no son reales** de la empresa y no contienen información de clientes.

## 6. Iniciar el backend

Modo desarrollo (reinicio automático al guardar):

```bash
npm run dev
```

Modo normal:

```bash
npm start
```

La API queda disponible en `http://localhost:3001`.

## 7. Iniciar el frontend

En otra terminal:

```bash
cd ../frontend
npm install
npm run dev
```

El frontend se sirve en `http://localhost:5173` y el backend ya permite CORS para ese origen.

## Endpoints disponibles

| Método | Ruta            | Descripción                                  |
| ------ | --------------- | -------------------------------------------- |
| GET    | `/api/health`   | Estado de la API y de la conexión a la BD    |
| GET    | `/api/services` | Lista los servicios activos                  |
| GET    | `/api/leads`    | Lista los leads                              |
| POST   | `/api/leads`    | Crea un lead                                 |
| GET    | `/api/quotes`   | Lista las cotizaciones                       |
| POST   | `/api/quotes`   | Crea una cotización básica                   |
| POST   | `/api/quote-requests` | Crea lead y cotización de forma transaccional e idempotente |
| GET    | `/api/sales`    | Lista las ventas                             |
| POST   | `/api/ai/chat`  | Genera una respuesta conversacional con Gemini |
| POST   | `/api/ai/requirements` | Extrae requerimientos estructurados con Gemini |
| POST   | `/api/admin/auth/login` | Inicia una sesión administrativa |
| GET    | `/api/admin/auth/session` | Verifica y restaura la sesión administrativa |
| POST   | `/api/admin/auth/logout` | Revoca la sesión administrativa |

`GET/POST /api/leads`, `GET/POST /api/quotes`,
`PATCH /api/quotes/:id/status` y `GET /api/sales` requieren una sesión administrativa.
Las rutas de escritura requieren además el encabezado `X-CSRF-Token`.

### Asistente Gemini

Solicitud:

```json
{
  "message": "Hola, necesito una tienda virtual"
}
```

Respuesta exitosa:

```json
{
  "success": true,
  "reply": "Respuesta generada por Gemini"
}
```

El endpoint acepta mensajes de hasta 2000 caracteres, limita el cuerpo JSON a
16 KB y aplica un límite en memoria de 10 solicitudes por IP durante 60 segundos.
No mantiene memoria conversacional, no consulta PostgreSQL y no genera
cotizaciones. Los errores del proveedor se convierten en mensajes seguros sin
devolver credenciales ni detalles internos.

### Validaciones

- `POST /api/leads` requiere `full_name` y al menos `email` o `phone`.
- `POST /api/quotes` requiere `lead_id` y los cinco campos canónicos del cotizador:
  `project_type`, `sections`, `integrations`, `design_status` y `deadline`.
- `POST /api/quote-requests` requiere además un `request_id` UUID. El servidor
  calcula precios y plazos; ignora cualquier importe enviado por el cliente.
- Repetir el mismo `request_id` con el mismo contenido devuelve los registros ya
  creados. Reutilizarlo con contenido distinto devuelve HTTP 409.

### Ejemplos

```bash
curl http://localhost:3001/api/health

curl -X POST http://localhost:3001/api/leads \
  -H "Content-Type: application/json" \
  -d "{\"full_name\":\"Ana Perez\",\"email\":\"ana@example.com\",\"phone\":\"999111222\"}"

curl -X POST http://localhost:3001/api/quotes \
  -H "Content-Type: application/json" \
  -d "{\"lead_id\":1,\"project_type\":\"corporate_web\",\"sections\":\"1-3\",\"integrations\":[\"none\"],\"design_status\":\"ready\",\"deadline\":\"none\"}"
```

## Pruebas PostgreSQL aisladas

Las pruebas de escritura nunca deben usar `DATABASE_URL` de desarrollo o producción.
Crea una base vacía dedicada, configura temporalmente `DATABASE_URL` y
`TEST_DATABASE_URL` con esa misma URL, aplica las migraciones y habilita la prueba:

```powershell
$env:DATABASE_URL=$env:TEST_DATABASE_URL
$env:RUN_DB_INTEGRATION="true"
npm run db:migrate
node --test test/quoteRequests.integration.test.js
```

La prueba verifica creación, asociación, código, rollback, repetición, concurrencia
y conflicto de claves. Usa únicamente datos ficticios y puede ejecutarse sobre una
base descartable recién creada.

## Estructura

```
backend/
  src/
    config/       Conexión a PostgreSQL (pool de pg)
    controllers/  Manejo de request/response y validaciones
    routes/       Definición de rutas y montaje bajo /api
    services/     Acceso a datos (consultas SQL)
    middleware/   Manejo de errores y rutas no encontradas
    utils/        Helpers (validaciones, generación de código de cotización)
    app.js        Configuración de Express (CORS, JSON, rutas)
    server.js     Arranque del servidor
  database/
    migrations/   Archivos .sql de esquema
    seeds/        Archivos .sql de datos iniciales
    scripts/      Ejecutores de migraciones y seeds
  .env.example
  package.json
  README.md
