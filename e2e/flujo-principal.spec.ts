import { expect, test, type Page } from "@playwright/test";

/**
 * El flujo de la tesis de punta a punta:
 * entrar a la demo → bienvenida → entra una propiedad → aviso → oportunidad
 * → mensaje por WhatsApp → "Enviado a Martina" → nota de voz que actualiza la ficha.
 */

/** WhatsApp no se abre de verdad: se guarda el link para revisarlo. */
async function interceptarWhatsApp(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __links: string[] }).__links = [];
    window.open = ((url?: string | URL) => {
      (window as unknown as { __links: string[] }).__links.push(String(url));
      return null;
    }) as typeof window.open;
  });
}

async function entrarALaDemo(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Probar la demo" }).click();
  // La primera vez: bienvenida en tres pasos.
  await expect(page).toHaveURL(/\/bienvenida/);
  await expect(page.getByRole("heading", { name: /Tus clientes son tuyos/ })).toBeVisible();
  await page.getByRole("checkbox", { name: /acepto la política/ }).check();
  await page.getByRole("button", { name: "Seguir" }).click();
  await expect(page.getByRole("heading", { name: "Dos permisos, y para qué" })).toBeVisible();
  await page.getByRole("button", { name: "Seguir" }).click();
  await page.getByRole("button", { name: "Empezar" }).click();
  await expect(page).toHaveURL(/\/hoy/);
}

test("de la propiedad nueva al mensaje enviado", async ({ page }) => {
  await interceptarWhatsApp(page);
  await entrarALaDemo(page);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("oportunidades");

  // Perfil → Demo → Simular propiedad nueva: entra Fitz Roy 1800 y le sirve a Martina.
  await page.getByRole("link", { name: "Perfil", exact: true }).filter({ visible: true }).click();
  await page.getByRole("button", { name: "Simular propiedad nueva" }).click();
  await expect(page).toHaveURL(/\/hoy/);
  const aviso = page.locator("article").filter({ hasText: "Esta propiedad le sirve a Martina", visible: true });
  await expect(aviso).toContainText("Fitz Roy 1800");

  // El aviso lleva a la oportunidad, con el anillo y la explicación.
  await aviso.getByRole("link", { name: "Avisar a Martina" }).click();
  await expect(page).toHaveURL(/\/oportunidad\//);
  await expect(page.getByRole("img", { name: /% de encaje/ })).toBeVisible();
  await expect(page.getByText("Encaja muy bien")).toBeVisible();
  await expect(page.getByText(/Cumple \d de las \d cosas que busca/)).toBeVisible();
  await expect(page.getByText("No se parece a lo que descartó")).toBeVisible();

  // Mensaje por WhatsApp: armado, con tonos.
  await page.getByRole("button", { name: "Mandársela a Martina" }).click();
  const hoja = page.getByRole("dialog", { name: "Mensaje para Martina" });
  const mensaje = hoja.getByRole("textbox", { name: "Mensaje para Martina" });
  await expect(mensaje).toHaveValue(/Hola Martina, acaba de entrar algo que encaja con lo que buscás: 3 ambientes en Fitz Roy al 1800/);
  await hoja.getByRole("button", { name: "Más corto" }).click();
  await expect(mensaje).toHaveValue(/^Hola Martina! Entró/);
  await hoja.getByRole("button", { name: "Enviar por WhatsApp" }).click();

  await expect(page.getByText("Enviado a Martina").first()).toBeVisible();
  const links = await page.evaluate(() => (window as unknown as { __links: string[] }).__links);
  expect(links[0]).toMatch(/^https:\/\/wa\.me\/5491155550101\?text=Hola%20Martina!/);
});

test("una nota de voz actualiza la ficha y dice qué cambió", async ({ page }) => {
  await entrarALaDemo(page);
  await page.getByRole("link", { name: "Clientes", exact: true }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/clientes$/);
  await page.locator('a[href^="/clientes/"]').filter({ hasText: "Martina Gómez", visible: true }).click();
  await expect(page).toHaveURL(/\/clientes\/.+/);
  await expect(page.getByText("Busca 3 ambientes en").filter({ visible: true }).first()).toBeVisible();

  await page.getByRole("link", { name: "Nueva nota" }).filter({ visible: true }).click();
  await expect(page.getByRole("heading", { name: "Contame cómo te fue" })).toBeVisible();
  // Sin micrófono en el test: la nota de ejemplo.
  const ejemplo = page.getByRole("button", { name: "Usar la nota de ejemplo" }).first();
  if (await ejemplo.isVisible()) await ejemplo.click();
  await page.getByRole("button", { name: "Empezar a grabar" }).click();
  await expect(page.getByText("Listo · entendí todo")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Armar ficha" }).click();

  await expect(page.getByRole("heading", { name: "Actualicé la ficha de Martina" })).toBeVisible();
  await expect(page.getByText("Subió el tope a USD 185.000")).toBeVisible();
  await expect(page.getByText("Le importa: cochera")).toBeVisible();
});

test("cada agente ve solo lo suyo", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("otra.agente@ejemplo.com");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/bienvenida/);
  await page.getByRole("checkbox", { name: /acepto la política/ }).check();
  await page.getByRole("button", { name: "Seguir" }).click();
  await page.getByRole("button", { name: "Seguir" }).click();
  await page.getByRole("button", { name: "Empezar" }).click();
  await expect(page.getByText("Todavía no hay oportunidades").filter({ visible: true })).toBeVisible();
  await page.getByRole("link", { name: "Clientes", exact: true }).filter({ visible: true }).click();
  await expect(page.getByText("Todavía no cargaste clientes").filter({ visible: true })).toBeVisible();
  await expect(page.getByText("Martina Gómez").filter({ visible: true })).toHaveCount(0);
});
