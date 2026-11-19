import { defineConfig, devices } from "@playwright/test";

/**
 * E2E del flujo principal, en modo mock (sin claves) y a tamaño de teléfono.
 * Corre contra un build de producción en el puerto 3100: npm run e2e
 */
const PUERTO = 3100;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    ...devices["Pixel 7"],
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run build && npx next start -p ${PUERTO}`,
    url: `http://localhost:${PUERTO}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: { NEXT_PUBLIC_DATA_SOURCE: "mock", AI_PROVIDER: "mock", TRANSCRIBE_PROVIDER: "mock", NEXT_PUBLIC_DEMO_MODE: "true" },
  },
});
