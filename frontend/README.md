# React + Vite

## Configuración del proyecto

Define `VITE_API_BASE_URL` con la URL pública del backend terminada en `/api`. Esta
variable es pública y nunca debe contener credenciales.

La ruta `/admin` restaura una sesión mediante cookie HttpOnly, presenta el formulario
de acceso cuando no existe una sesión y envía el token CSRF validado por Express en
las operaciones administrativas. Ninguna contraseña o clave se almacena en React.

Para despliegue como SPA debe configurarse en Vercel un rewrite de rutas hacia
`/index.html`; se incorporará durante la etapa de preparación específica de Vercel.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
