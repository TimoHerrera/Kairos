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
| F3 | Nueva nota: grabación, transcripción, extracción a ficha | Hecha (IA en modo mock) |
| F4 | Propiedades: alta manual, pegar aviso, importar | Hecha (lectura de avisos en modo mock) |
| F5 | Motor de coincidencias, detalle de oportunidad, Hoy | Hecha |
| F6 | Mensaje de WhatsApp, Web Push, bandeja | Hecha (mensaje por plantilla en modo mock) |
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
| `TRANSCRIBE_PROVIDER` | vacío · `mock` · `webspeech` · `openai` | Transcripción del audio (ver abajo) |
| `NEXT_PUBLIC_DEMO_MODE` | `true` · `false` | Muestra Perfil → Demo |

## Notas de voz

"Grabar audio" abre la nueva nota: el agente graba (hasta 3 minutos) o escribe, toca **Armar ficha** y Kairos actualiza la ficha del cliente mostrando qué cambió, sin pisar lo anterior. Si la nota es de un cliente nuevo, saca el nombre del audio y pregunta antes de duplicar uno que ya existe.

| `TRANSCRIBE_PROVIDER` | Qué hace |
|---|---|
| sin configurar (por defecto) | Micrófono real: el navegador transcribe en vivo, en español rioplatense, gratis. Anda bien en Chrome y Edge. Donde no se puede (por ejemplo, iPhone), ofrece escribir o usar la nota de ejemplo. |
| `mock` | Siempre la nota de ejemplo, sin micrófono. Para presentar sin depender de la red. |
| `webspeech` | Siempre el micrófono del navegador. |
| `openai` | Graba el audio y lo transcribe el servidor al terminar. Necesita `OPENAI_API_KEY` (pago). |

Con el micrófono del navegador, Chrome manda el audio a Google para transcribirlo; la pantalla avisa que el audio se procesa con un servicio de IA.

La extracción de la ficha corre siempre en el servidor (`/api/ai/extract`). Con `AI_PROVIDER=mock` usa reglas locales que entienden las notas de la demo; el proveedor de Claude se conecta en la F7 (el prompt ya está en [lib/ai/extract/prompt.ts](lib/ai/extract/prompt.ts)). A la IA se le manda solo el texto de la nota y un resumen de la ficha, nunca el teléfono ni el email del cliente.

En modo mock los audios no se guardan: la nota queda con la transcripción. Guardarlos en Supabase Storage llega con la F7.

## Propiedades

Sin scraping: los términos de los portales suelen prohibirlo y se rompe seguido. Las propiedades entran de tres formas, desde Propiedades → **Cargar**:

- **A mano:** con dirección, barrio, precio y ambientes alcanza.
- **Pegar aviso:** el agente copia el texto del aviso (y el link, si quiere). Kairos completa el formulario, marca lo que no quedó claro y el agente revisa antes de guardar. No se entra al link. En modo mock lo lee con reglas locales; con Claude, en la F7.
- **Importar CSV:** con la [plantilla](public/plantillas/propiedades.csv), separada por punto y coma como la guarda Excel en castellano. Desde Excel: Archivo → Guardar como → CSV. Los errores se muestran por número de fila. Excel (.xlsx) directo no se lee todavía.

Una dirección ya cargada no se repite, aunque esté escrita distinto ("Gorriti al 4800" es "Gorriti 4800"). Las integraciones con portales o feeds oficiales quedan para más adelante, detrás de [lib/sources](lib/sources/index.ts).

## Oportunidades

El motor de coincidencias está en [lib/match](lib/match/motor.ts): funciones puras con tests.

1. **Filtros duros** que excluyen: operación o tipo distintos, precio arriba del tope más la tolerancia, otro barrio (salvo limítrofes, con penalización), ambientes fuera de rango, cualquier cosa que no quiere (planta baja, avenida…) y lo que ya descartó.
2. **Puntaje 0–100** ponderado: zona 25, precio 20 (más cuanto más debajo del tope), ambientes 15, lo que le importa 20, financiación 10 (apto crédito si usa crédito), lo que le gustaría 5. Se normaliza sobre lo que el cliente pidió: lo que no pidió no resta. Lo que falta confirmar vale 0,6.
3. **Explicación** en texto natural ("USD 172.000 — USD 8.000 por debajo de su tope") y "Cumple X de las Y cosas que busca".
4. **Parecido a lo descartado:** misma calle o el mismo problema que dio como motivo baja 15 puntos y lo dice.

Las oportunidades se recalculan solas al cargar o importar una propiedad (contra todos los clientes activos), al editar una ficha, al cambiar descartes y al guardar una nota. Si superan el umbral de alerta del agente (75% por defecto) se crean como nuevas y aparecen en Hoy. Si dejan de encajar se borran, salvo que ya se hayan mandado o descartado.

Caso Martina (en los tests): Gorriti 4800 da 92% y cumple 6 de 7; Av. Santa Fe 3900 queda afuera por avenida y Thames 1700 por planta baja.

## Mensaje y avisos

**Mensaje de WhatsApp.** En la oportunidad, "Mandársela" abre una hoja con el mensaje armado con lo que se sabe del cliente: editable, con "Más corto", "Más formal" y "Agregar fotos" (el link del aviso). "Enviar por WhatsApp" abre `wa.me` con el texto, guarda el mensaje, marca la oportunidad como enviada y confirma "Enviado a Martina". A la IA va solo el nombre de pila del cliente y los datos de la propiedad. En modo mock se redacta con plantillas; el prompt de Claude está en [lib/ai/message](lib/ai/message/index.ts).

**Avisos.** Cuando aparece una oportunidad nueva, Kairos avisa respetando el umbral y el horario de no molestar (Perfil → Avisos). Con claves VAPID el aviso es un push real y llega con la app cerrada; sin claves, es una notificación local con la app abierta. El push está implementado con el crypto de Node (firma VAPID y cifrado aes128gcm), sin dependencias, y [/api/push/send](app/api/push/send/route.ts) solo manda a servicios de push conocidos.

```bash
npm run vapid
```

Eso imprime las tres variables para `.env.local` y Vercel. En iPhone, los avisos solo llegan con Kairos instalado en la pantalla de inicio.

**Bandeja.** La campana de Hoy muestra cuántas oportunidades hay sin ver y abre la bandeja con todos los avisos.

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
