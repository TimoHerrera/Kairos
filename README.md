# Kairos

**La oportunidad justa, en el momento justo.**

Kairos es una PWA mobile-first para agentes inmobiliarios independientes de Argentina. El agente le cuenta por audio cómo le fue con un cliente; Kairos arma la ficha, y cuando entra una propiedad que le sirve, avisa, explica por qué encaja y deja listo el mensaje de WhatsApp.

Proyecto de tesis · Universidad de San Andrés.

## Estado

| Fase | Qué incluye | Estado |
|---|---|---|
| F0 | Setup, tokens de los dos temas, fuentes, logo, componentes del manual, PWA, `/dev/ui` | Hecha |
| F1 | Capa de datos mock, auth, layouts y tab bar, seed, migraciones y RLS | Hecha |
| F2 | Clientes y ficha editable | Hecha |
| F3 | Nueva nota: grabación, transcripción, extracción a ficha | Pendiente |
| F4 | Propiedades: alta manual, pegar aviso, importar | Pendiente |
| F5 | Motor de coincidencias, detalle de oportunidad, Hoy | Pendiente |
| F6 | Mensaje de WhatsApp, Web Push, bandeja | Pendiente |
| F7 | Supabase e IA reales, privacidad, modo demo, E2E, deploy | Pendiente |

## Setup local

Necesitás Node 22 o superior.

```bash
npm install
cp .env.example .env.local
npm run dev
```

La app queda en `http://localhost:3000`. Los componentes del manual de marca están en `http://localhost:3000/dev/ui`, con un switch de tema claro/oscuro.

Con los valores por defecto de `.env.example` (todo en `mock`) la app funciona entera sin ninguna clave.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sin emitir |
| `npm test` | Tests con Vitest |

## Variables de entorno

Están documentadas en [.env.example](.env.example). Las que no empiezan con `NEXT_PUBLIC_` viven solo en el servidor.

| Variable | Valores | Para qué |
|---|---|---|
| `NEXT_PUBLIC_DATA_SOURCE` | `mock` · `supabase` | De dónde salen los datos |
| `AI_PROVIDER` | `mock` · `anthropic` | Extracción de la ficha y redacción del mensaje |
| `ANTHROPIC_MODEL` | por defecto `claude-sonnet-5-5` | Modelo de Claude |
| `TRANSCRIBE_PROVIDER` | `mock` · `webspeech` · `openai` | Transcripción del audio |
| `NEXT_PUBLIC_DEMO_MODE` | `true` · `false` | Muestra Perfil → Demo |

## Datos

Toda la app lee y escribe a través de una sola interfaz, [lib/data/source.ts](lib/data/source.ts). Hay dos implementaciones:

- **mock** (por defecto): en memoria, guardada en `localStorage`. Imita la RLS: cada lectura filtra por el agente de la sesión.
- **supabase**: se conecta en la F7. El esquema y la RLS ya están en [supabase/migrations](supabase/migrations).

Ningún id viene fijo del seed: todo se crea con el id del agente logueado. Las keys de las queries empiezan con ese id y la caché se limpia al cerrar sesión.

### Entrar

En modo mock no hace falta contraseña: cualquier email crea una cuenta con la cartera vacía. **Probar la demo** entra como Lucía F., con los datos del prototipo (5 clientes, 30 propiedades, 3 oportunidades).

### Modo demo

Con `NEXT_PUBLIC_DEMO_MODE=true`, en Perfil → Demo está **Restablecer datos de demo**. "Simular propiedad nueva" llega en la F7.

### Seed

Los datos de demo viven en [lib/data/seed/demo.json](lib/data/seed/demo.json). El mock los carga solo. Para Supabase:

```bash
npm run seed:sql
```

Eso regenera `supabase/seed.sql`, que define `public.kairos_seed_demo(agente)`. Con un usuario ya registrado:

```sql
select public.kairos_seed_demo('<uuid del agente>');
```

### Tests de RLS

[supabase/tests/rls.test.sql](supabase/tests/rls.test.sql) (pgTAP) prueba que cada agente ve solo lo suyo. Corre con `supabase test db`, que necesita Supabase local y Docker. Todavía no se corrió: se valida al conectar Supabase en la F7.

## Diseño

El manual de marca y el prototipo son la fuente de verdad visual ([docs/design](docs/design/README.md)).

- **Tokens:** en [app/globals.css](app/globals.css), con los nombres exactos del manual (`--fondo`, `--acento`, `--linea-control`…). El tema se elige con `data-theme="light|dark"` en `<html>`; por defecto sigue al sistema. En oscuro el acento pasa de violeta a lima solo.
- **Tipografía:** Fraunces para títulos y cifras, Inter para todo lo demás, con `next/font`. La escala está como utilidades: `text-titulo-m`, `text-cuerpo`, `text-eyebrow`…
- **Componentes:** en `components/ui`. Todo componente nuevo se suma a `/dev/ui`.
- **Logo:** siempre los archivos originales de `public/brand`, a través de `components/brand/logo.tsx`. No se retipea ni se redibuja.
- **Cifras:** formato argentino con `lib/format` (`USD 172.000`, `$185.000`).

## Instalar la PWA

El service worker solo se registra en producción (`npm run build && npm start`, o el deploy de Vercel).

- **Android (Chrome):** menú ⋮ → "Instalar app" o "Agregar a la pantalla principal".
- **iPhone (Safari):** botón Compartir → "Agregar a inicio". En iPhone las notificaciones push solo funcionan con la app instalada así.

El service worker cachea solo el app shell (archivos estáticos, marca e íconos). Nunca cachea datos de clientes.

## Deploy

En Vercel, importando este repo. [vercel.json](vercel.json) fija el framework en Next.js. Cada PR genera un preview.
