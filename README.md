# Kairos

**La oportunidad justa, en el momento justo.**

Kairos es una PWA mobile-first para agentes inmobiliarios independientes de Argentina. El agente le cuenta por audio cómo le fue con un cliente; Kairos arma la ficha, y cuando entra una propiedad que le sirve, avisa, explica por qué encaja y deja listo el mensaje de WhatsApp.

Proyecto de tesis · Universidad de San Andrés.

## Estado

| Fase | Qué incluye | Estado |
|---|---|---|
| F0 | Setup, tokens de los dos temas, fuentes, logo, componentes del manual, PWA, `/dev/ui` | Hecha |
| F1 | Capa de datos mock, auth, layouts y tab bar, seed, migraciones y RLS | Pendiente |
| F2 | Clientes y ficha editable | Pendiente |
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
| `DATA_SOURCE` | `mock` · `supabase` | De dónde salen los datos |
| `AI_PROVIDER` | `mock` · `anthropic` | Extracción de la ficha y redacción del mensaje |
| `ANTHROPIC_MODEL` | por defecto `claude-sonnet-5-5` | Modelo de Claude |
| `TRANSCRIBE_PROVIDER` | `mock` · `webspeech` · `openai` | Transcripción del audio |
| `NEXT_PUBLIC_DEMO_MODE` | `true` · `false` | Muestra Perfil → Demo |

El seed de Supabase y el modo demo ("Simular propiedad nueva") se documentan acá cuando lleguen sus fases (F1 y F7).

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
