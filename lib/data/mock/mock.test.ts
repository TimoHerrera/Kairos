import { describe, expect, it } from "vitest";
import { DataError } from "../source";
import { createMockDataSource, DB_KEY, memoryStorage } from "./index";

function nueva() {
  let n = 0;
  const storage = memoryStorage();
  const ds = createMockDataSource({
    storage,
    newId: () => `id-${++n}`,
    now: () => new Date("2026-11-12T18:32:00-03:00"),
  });
  return { ds, storage };
}

describe("sesión", () => {
  it("sin sesión no se puede leer nada", async () => {
    const { ds } = nueva();
    await expect(ds.buyers.list()).rejects.toMatchObject({ code: "no_session" });
  });

  it("normaliza el email y no duplica agentes", async () => {
    const { ds } = nueva();
    const a = await ds.auth.signIn({ email: "  Ana@Ejemplo.com " });
    await ds.auth.signOut();
    const b = await ds.auth.signIn({ email: "ana@ejemplo.com" });
    expect(b.agentId).toBe(a.agentId);
    expect(b.email).toBe("ana@ejemplo.com");
  });

  it("rechaza emails inválidos", async () => {
    const { ds } = nueva();
    await expect(ds.auth.signIn({ email: "ana" })).rejects.toBeInstanceOf(DataError);
  });

  it("avisa cuando la sesión cambia", async () => {
    const { ds } = nueva();
    let avisos = 0;
    const dejar = ds.auth.onChange(() => avisos++);
    await ds.auth.signInDemo();
    await ds.auth.signOut();
    dejar();
    await ds.auth.signInDemo();
    expect(avisos).toBe(2);
  });
});

describe("datos de demo", () => {
  it("carga la cartera del prototipo para Lucía", async () => {
    const { ds } = nueva();
    await ds.auth.signInDemo();
    const agente = await ds.agent.get();
    expect(agente.name).toBe("Lucía F.");
    expect(agente.settings.alert_threshold).toBe(75);
    expect(agente.settings.delete_audio_after_transcribe).toBe(true);

    const clientes = await ds.buyers.list();
    expect(clientes.map((c) => c.name)).toEqual([
      "Martina Gómez",
      "Diego Ruiz",
      "Sofía y Pablo",
      "Carla Vidal",
      "Andrés Molina",
    ]);
    expect(await ds.properties.list()).toHaveLength(30);
  });

  it("Martina tiene su ficha, sus descartes y la oportunidad de Gorriti", async () => {
    const { ds } = nueva();
    await ds.auth.signInDemo();
    const martina = (await ds.buyers.list()).find((c) => c.name === "Martina Gómez")!;

    const criterios = await ds.buyers.getCriteria(martina.id);
    expect(criterios).toMatchObject({
      neighborhood: "Palermo",
      subzones: ["Soho", "Hollywood", "Chico"],
      budget_max: 180000,
      financing: "preapproved_credit",
      deal_breakers: ["planta_baja", "sobre_avenida"],
    });

    const descartes = await ds.buyers.listDiscards(martina.id);
    expect(descartes.map((d) => [d.property?.address, d.reason])).toEqual([
      ["Av. Santa Fe 3900", "Muy ruidosa, da a la avenida"],
      ["Thames 1700", "Es planta baja"],
    ]);

    const [oportunidad] = await ds.matches.list({ buyerId: martina.id });
    expect(oportunidad.score).toBe(92);
    expect(oportunidad.property.address).toBe("Gorriti 4800");
    expect(oportunidad.reasons.met).toHaveLength(6);
    expect(oportunidad.reasons.unconfirmed).toHaveLength(1);
  });

  it("no usa ids fijos: todo queda con el id del agente logueado", async () => {
    const { ds, storage } = nueva();
    const { agentId } = await ds.auth.signInDemo();
    const db = JSON.parse(storage.getItem(DB_KEY)!);
    for (const tabla of ["buyers", "buyer_criteria", "notes", "properties", "discards", "matches"]) {
      expect(db[tabla].length).toBeGreaterThan(0);
      expect(db[tabla].every((f: { agent_id: string }) => f.agent_id === agentId)).toBe(true);
    }
  });

  it("restablecer vuelve a los datos del prototipo", async () => {
    const { ds } = nueva();
    await ds.auth.signInDemo();
    await ds.buyers.create({ name: "Cliente de prueba" });
    expect(await ds.buyers.list()).toHaveLength(6);
    await ds.demo.reset();
    expect(await ds.buyers.list()).toHaveLength(5);
    expect(await ds.properties.list()).toHaveLength(30);
  });
});

describe("cada agente ve solo lo suyo", () => {
  it("un agente nuevo arranca con la cartera vacía", async () => {
    const { ds } = nueva();
    await ds.auth.signInDemo();
    await ds.auth.signOut();
    await ds.auth.signIn({ email: "otra@ejemplo.com" });
    expect(await ds.buyers.list()).toEqual([]);
    expect(await ds.properties.list()).toEqual([]);
    expect(await ds.matches.list()).toEqual([]);
  });

  it("no puede leer ni tocar un cliente de otro agente aunque sepa el id", async () => {
    const { ds } = nueva();
    await ds.auth.signInDemo();
    const ajeno = (await ds.buyers.list())[0];
    await ds.auth.signOut();

    await ds.auth.signIn({ email: "otra@ejemplo.com" });
    expect(await ds.buyers.get(ajeno.id)).toBeNull();
    expect(await ds.buyers.getCriteria(ajeno.id)).toBeNull();
    expect(await ds.buyers.listNotes(ajeno.id)).toEqual([]);
    await expect(ds.buyers.update(ajeno.id, { name: "Hackeado" })).rejects.toMatchObject({ code: "not_found" });
    await expect(ds.buyers.updateCriteria(ajeno.id, { budget_max: 1 })).rejects.toMatchObject({ code: "not_found" });

    await ds.auth.signOut();
    await ds.auth.signInDemo();
    expect((await ds.buyers.get(ajeno.id))?.name).toBe(ajeno.name);
  });

  it("restablecer la demo no toca los datos de otro agente", async () => {
    const { ds } = nueva();
    await ds.auth.signIn({ email: "otra@ejemplo.com" });
    await ds.buyers.create({ name: "Cliente propio" });
    await ds.auth.signOut();
    await ds.auth.signInDemo();
    await ds.demo.reset();
    await ds.auth.signOut();
    await ds.auth.signIn({ email: "otra@ejemplo.com" });
    expect((await ds.buyers.list()).map((c) => c.name)).toEqual(["Cliente propio"]);
  });
});

describe("email único por agente", () => {
  it("avisa del duplicado en vez de crearlo", async () => {
    const { ds } = nueva();
    await ds.auth.signInDemo();
    await expect(
      ds.buyers.create({ name: "Otra Martina", email: " Martina.Gomez@Example.com " }),
    ).rejects.toMatchObject({ code: "duplicate_email", existing: { name: "Martina Gómez" } });
    expect(await ds.buyers.list()).toHaveLength(5);
  });

  it("dos agentes distintos pueden tener un cliente con el mismo email", async () => {
    const { ds } = nueva();
    await ds.auth.signInDemo();
    await ds.auth.signOut();
    await ds.auth.signIn({ email: "otra@ejemplo.com" });
    const c = await ds.buyers.create({ name: "Martina G.", email: "martina.gomez@example.com" });
    expect(c.email).toBe("martina.gomez@example.com");
  });

  it("tampoco deja duplicar al editar", async () => {
    const { ds } = nueva();
    await ds.auth.signInDemo();
    const diego = (await ds.buyers.list()).find((c) => c.name === "Diego Ruiz")!;
    await expect(ds.buyers.update(diego.id, { email: "martina.gomez@example.com" })).rejects.toMatchObject({
      code: "duplicate_email",
    });
    // Guardar su propio email no es un duplicado.
    await expect(ds.buyers.update(diego.id, { email: "DIEGO.ruiz@example.com" })).resolves.toMatchObject({
      email: "diego.ruiz@example.com",
    });
  });
});

describe("clientes", () => {
  it("crear un cliente le arma una ficha vacía", async () => {
    const { ds } = nueva();
    await ds.auth.signIn({ email: "ana@ejemplo.com" });
    const c = await ds.buyers.create({ name: "  Juan Rodríguez " });
    expect(c.name).toBe("Juan Rodríguez");
    expect(await ds.buyers.getCriteria(c.id)).toMatchObject({ buyer_id: c.id, must_haves: [], budget_max: null });
  });

  it("editar la ficha cambia solo lo pedido", async () => {
    const { ds } = nueva();
    await ds.auth.signInDemo();
    const martina = (await ds.buyers.list())[0];
    const despues = await ds.buyers.updateCriteria(martina.id, { budget_max: 185000 });
    expect(despues.budget_max).toBe(185000);
    expect(despues.neighborhood).toBe("Palermo");
    expect(despues.must_haves).toEqual(["balcon", "luminoso"]);
  });
});
