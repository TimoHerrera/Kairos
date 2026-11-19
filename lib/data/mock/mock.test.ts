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

describe("descartes", () => {
  it("agrega un descarte con una propiedad cargada o con texto libre", async () => {
    const { ds } = nueva();
    await ds.auth.signInDemo();
    const diego = (await ds.buyers.list()).find((c) => c.name === "Diego Ruiz")!;
    const malabia = (await ds.properties.list()).find((p) => p.address === "Malabia 900")!;

    const a = await ds.buyers.addDiscard(diego.id, { property_id: malabia.id, reason: " Hay que refaccionar todo " });
    expect(a.property?.address).toBe("Malabia 900");
    expect(a.reason).toBe("Hay que refaccionar todo");

    await ds.buyers.addDiscard(diego.id, { property_text: "Un 2 amb sobre Warnes", reason: "Mucho ruido" });
    const lista = await ds.buyers.listDiscards(diego.id);
    expect(lista.map((d) => d.property?.address ?? d.property_text)).toEqual(["Malabia 900", "Un 2 amb sobre Warnes"]);
  });

  it("pide motivo y propiedad", async () => {
    const { ds } = nueva();
    await ds.auth.signInDemo();
    const diego = (await ds.buyers.list()).find((c) => c.name === "Diego Ruiz")!;
    await expect(ds.buyers.addDiscard(diego.id, { property_text: "Algo", reason: "  " })).rejects.toMatchObject({ code: "invalid" });
    await expect(ds.buyers.addDiscard(diego.id, { reason: "Caro" })).rejects.toMatchObject({ code: "invalid" });
  });

  it("quita un descarte, y solo si es propio", async () => {
    const { ds } = nueva();
    await ds.auth.signInDemo();
    const martina = (await ds.buyers.list())[0];
    const [primero] = await ds.buyers.listDiscards(martina.id);
    await ds.auth.signOut();
    await ds.auth.signIn({ email: "otra@ejemplo.com" });
    await expect(ds.buyers.removeDiscard(primero.id)).rejects.toMatchObject({ code: "not_found" });
    await ds.auth.signOut();
    await ds.auth.signInDemo();
    await ds.buyers.removeDiscard(primero.id);
    expect(await ds.buyers.listDiscards(martina.id)).toHaveLength(1);
  });
});

describe("notas", () => {
  it("agrega una nota al historial, la más nueva primero", async () => {
    let n = 0;
    let reloj = new Date("2026-11-12T18:32:00-03:00");
    const ds = createMockDataSource({ storage: memoryStorage(), newId: () => `id-${++n}`, now: () => reloj });
    await ds.auth.signInDemo();
    const martina = (await ds.buyers.list())[0];
    reloj = new Date("2026-11-13T10:00:00-03:00");
    const nota = await ds.buyers.addNote(martina.id, {
      kind: "audio",
      transcript: " Subió el tope a 185 mil. ",
      duration_seconds: 9,
      changes: ["Subió el tope a USD 185.000"],
    });
    expect(nota).toMatchObject({ transcript: "Subió el tope a 185 mil.", audio_path: null, buyer_id: martina.id });
    const notas = await ds.buyers.listNotes(martina.id);
    expect(notas).toHaveLength(2);
    expect(notas[0].changes).toEqual(["Subió el tope a USD 185.000"]);
  });

  it("no acepta notas vacías ni de clientes ajenos", async () => {
    const { ds } = nueva();
    await ds.auth.signInDemo();
    const martina = (await ds.buyers.list())[0];
    await expect(ds.buyers.addNote(martina.id, { kind: "text", transcript: "  " })).rejects.toMatchObject({ code: "invalid" });
    await ds.auth.signOut();
    await ds.auth.signIn({ email: "otra@ejemplo.com" });
    await expect(ds.buyers.addNote(martina.id, { kind: "text", transcript: "Hola" })).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("propiedades", () => {
  const base = {
    source: "manual" as const,
    url: null,
    portal: null,
    operation: "buy" as const,
    property_type: "apartment" as const,
    address: "Malabia 1200",
    neighborhood: "Palermo",
    subzone: "Soho",
    price: 199000,
    currency: "USD" as const,
    expenses: 160000,
    rooms: 3,
    bedrooms: 2,
    covered_m2: 70,
    total_m2: 75,
    floor: 5,
    orientation: "Norte",
    balcony: true,
    on_avenue: false,
    credit_eligible: "unconfirmed" as const,
    amenities: ["luminoso"],
    photos: [],
    description: null,
  };

  it("carga una propiedad nueva para el agente de la sesión", async () => {
    const { ds } = nueva();
    const { agentId } = await ds.auth.signInDemo();
    const p = await ds.properties.create({ ...base, address: "  Malabia 1200 " });
    expect(p).toMatchObject({ agent_id: agentId, address: "Malabia 1200", source: "manual" });
    expect(await ds.properties.list()).toHaveLength(31);
    expect((await ds.properties.list())[0].id).toBe(p.id);
  });

  it("avisa si la dirección ya está cargada, aunque esté escrita distinto", async () => {
    const { ds } = nueva();
    await ds.auth.signInDemo();
    await expect(ds.properties.create({ ...base, address: "Santa Fe 3900" })).rejects.toMatchObject({
      code: "duplicate",
      existing: { name: "Av. Santa Fe 3900" },
    });
    await expect(ds.properties.create({ ...base, address: "gorriti al 4800" })).rejects.toMatchObject({ code: "duplicate" });
  });

  it("valida lo mínimo", async () => {
    const { ds } = nueva();
    await ds.auth.signInDemo();
    await expect(ds.properties.create({ ...base, price: 0 })).rejects.toMatchObject({ code: "invalid" });
    await expect(ds.properties.create({ ...base, neighborhood: " " })).rejects.toMatchObject({ code: "invalid" });
  });

  it("otro agente puede cargar la misma dirección", async () => {
    const { ds } = nueva();
    await ds.auth.signIn({ email: "otra@ejemplo.com" });
    await expect(ds.properties.create({ ...base, address: "Gorriti 4800" })).resolves.toMatchObject({ address: "Gorriti 4800" });
  });
});

describe("mensajes y avisos", () => {
  it("guarda el mensaje mandado de una oportunidad", async () => {
    const { ds } = nueva();
    await ds.auth.signInDemo();
    const [m] = await ds.matches.list({ status: ["sent"] });
    const msj = await ds.messages.create({ match_id: m.id, text: " Hola Martina ", tone: "shorter" });
    expect(msj).toMatchObject({ text: "Hola Martina", tone: "shorter", sent_via: "whatsapp" });
    expect(await ds.messages.listByMatch(m.id)).toHaveLength(1);
    await expect(ds.messages.create({ match_id: "otra", text: "x", tone: "normal" })).rejects.toMatchObject({ code: "not_found" });
  });

  it("una suscripción por dispositivo, y solo del agente", async () => {
    const { ds } = nueva();
    await ds.auth.signInDemo();
    const sub = { endpoint: "https://fcm.googleapis.com/fcm/send/a", keys: { p256dh: "p", auth: "a" } };
    await ds.push.save(sub);
    await ds.push.save({ ...sub, keys: { p256dh: "p2", auth: "a2" } });
    expect((await ds.push.list()).map((x) => x.keys.p256dh)).toEqual(["p2"]);
    await ds.auth.signOut();
    await ds.auth.signIn({ email: "otra@ejemplo.com" });
    expect(await ds.push.list()).toEqual([]);
    await ds.auth.signOut();
    await ds.auth.signInDemo();
    await ds.push.remove(sub.endpoint);
    expect(await ds.push.list()).toEqual([]);
  });
});

describe("modo demo y privacidad", () => {
  it("simular hace entrar las propiedades de demo una por una, sin repetir", async () => {
    const { ds } = nueva();
    await ds.auth.signInDemo();
    const a = await ds.demo.simulateProperty();
    const b = await ds.demo.simulateProperty();
    const c = await ds.demo.simulateProperty();
    expect([a?.address, b?.address, c?.address]).toEqual(["Fitz Roy 1800", "Lerma 400", "Melián 2400"]);
    expect(await ds.demo.simulateProperty()).toBeNull();
    expect(await ds.properties.list()).toHaveLength(33);
  });

  it("exportar trae solo los datos del agente", async () => {
    const { ds } = nueva();
    await ds.auth.signIn({ email: "otra@ejemplo.com" });
    await ds.buyers.create({ name: "Cliente ajeno" });
    await ds.auth.signOut();
    await ds.auth.signInDemo();
    const datos = (await ds.agent.exportAll()) as { clientes: Array<{ name: string }>; propiedades: unknown[] };
    expect(datos.clientes.map((c) => c.name)).not.toContain("Cliente ajeno");
    expect(datos.clientes).toHaveLength(5);
    expect(datos.propiedades).toHaveLength(30);
  });

  it("borrar la cuenta borra todo y cierra la sesión, sin tocar a otros", async () => {
    const { ds, storage } = nueva();
    await ds.auth.signIn({ email: "otra@ejemplo.com" });
    await ds.buyers.create({ name: "Cliente de otra" });
    await ds.auth.signOut();
    const { agentId } = await ds.auth.signInDemo();
    await ds.agent.deleteAccount();
    expect(ds.auth.getSession()).toBeNull();
    const db = JSON.parse(storage.getItem(DB_KEY)!);
    expect(db.agents.some((a: { id: string }) => a.id === agentId)).toBe(false);
    expect(db.buyers.some((b: { agent_id: string }) => b.agent_id === agentId)).toBe(false);
    await ds.auth.signIn({ email: "otra@ejemplo.com" });
    expect((await ds.buyers.list()).map((c) => c.name)).toEqual(["Cliente de otra"]);
  });
});
