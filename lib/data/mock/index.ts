import { buildDemoAgent, buildDemoData, DEMO_AGENT, PROPIEDADES_PARA_SIMULAR, propiedadDeSeed, type AgentData } from "../seed/build";
import {
  DataError,
  isValidEmail,
  normalizeEmail,
  type DataSource,
  type NewBuyer,
  type NewDiscard,
  type NewNote,
  type NewProperty,
  type NewMatch,
  type NewMessage,
  normalizarDireccion,
  type Session,
} from "../source";
import {
  DEFAULT_AGENT_SETTINGS,
  type Agent,
  type Buyer,
  type BuyerCriteria,
  type Discard,
  type Note,
  type Property,
  type Id,
  type Match,
  type MatchWithRefs,
  type Message,
  type PushSubscriptionRow,
} from "../types";

/**
 * Fuente de datos mock: todo vive en memoria y se guarda en localStorage.
 * Imita la RLS de Supabase: cada lectura y escritura filtra por el agente de la sesión.
 */

export const DB_KEY = "kairos:db:v1";
export const SESSION_KEY = "kairos:sesion:v1";

type Db = AgentData & {
  agents: Agent[];
  messages: Message[];
  push_subscriptions: PushSubscriptionRow[];
};

/** Lo mínimo de Storage que necesitamos; permite inyectar uno en memoria para los tests. */
export type KeyValueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function memoryStorage(): KeyValueStorage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

const emptyDb = (): Db => ({
  agents: [],
  buyers: [],
  buyer_criteria: [],
  notes: [],
  properties: [],
  discards: [],
  matches: [],
  messages: [],
  push_subscriptions: [],
});

const AGENT_TABLES = [
  "buyers",
  "buyer_criteria",
  "notes",
  "properties",
  "discards",
  "matches",
  "messages",
  "push_subscriptions",
] as const;

function defaultNewId(): Id {
  return globalThis.crypto.randomUUID();
}

export function createMockDataSource(
  opciones: { storage?: KeyValueStorage; newId?: () => Id; now?: () => Date } = {},
): DataSource {
  const storage = opciones.storage ?? memoryStorage();
  const newId = opciones.newId ?? defaultNewId;
  const now = opciones.now ?? (() => new Date());
  const oyentes = new Set<() => void>();

  // --- persistencia ---------------------------------------------------------

  function load(): Db {
    try {
      const crudo = storage.getItem(DB_KEY);
      if (!crudo) return emptyDb();
      return { ...emptyDb(), ...(JSON.parse(crudo) as Partial<Db>) };
    } catch {
      return emptyDb();
    }
  }

  function save(db: Db) {
    try {
      storage.setItem(DB_KEY, JSON.stringify(db));
    } catch {
      // Sin espacio o sin permiso: los datos quedan solo para esta visita.
    }
  }

  // --- sesión ---------------------------------------------------------------

  function getSession(): Session | null {
    try {
      const crudo = storage.getItem(SESSION_KEY);
      if (!crudo) return null;
      const s = JSON.parse(crudo) as Session;
      return s?.agentId && s?.email ? s : null;
    } catch {
      return null;
    }
  }

  function setSession(s: Session | null) {
    try {
      if (s) storage.setItem(SESSION_KEY, JSON.stringify(s));
      else storage.removeItem(SESSION_KEY);
    } catch {
      // idem save()
    }
    oyentes.forEach((f) => f());
  }

  function requireAgentId(): Id {
    const s = getSession();
    if (!s) throw new DataError("no_session", "No hay una sesión iniciada.");
    return s.agentId;
  }

  /** Abre la base con la sesión actual: todo lo que sale de acá ya está filtrado por agente. */
  function scoped() {
    const agentId = requireAgentId();
    const db = load();
    const mine = <T extends { agent_id: Id }>(filas: T[]) => filas.filter((f) => f.agent_id === agentId);
    return { agentId, db, mine };
  }

  function clearAgentData(db: Db, agentId: Id) {
    for (const tabla of AGENT_TABLES) {
      (db[tabla] as Array<{ agent_id: Id }>) = (db[tabla] as Array<{ agent_id: Id }>).filter(
        (f) => f.agent_id !== agentId,
      );
    }
  }

  function loadDemoData(db: Db, agentId: Id) {
    const datos = buildDemoData(agentId, newId, now());
    db.buyers.push(...datos.buyers);
    db.buyer_criteria.push(...datos.buyer_criteria);
    db.notes.push(...datos.notes);
    db.properties.push(...datos.properties);
    db.discards.push(...datos.discards);
    db.matches.push(...datos.matches);
  }

  function assertUniqueBuyerEmail(buyers: Buyer[], email: string | null, exceptoId?: Id) {
    if (!email) return;
    const repetido = buyers.find((b) => b.email === email && b.id !== exceptoId);
    if (repetido) {
      throw new DataError("duplicate_email", `Ya tenés un cliente con ese email: ${repetido.name}.`, {
        id: repetido.id,
        name: repetido.name,
      });
    }
  }

  function cleanEmail(email: string | null | undefined): string | null {
    if (!email || !email.trim()) return null;
    if (!isValidEmail(email)) throw new DataError("invalid", "Ese email no parece válido.");
    return normalizeEmail(email);
  }

  function blankCriteria(buyerId: Id, agentId: Id): BuyerCriteria {
    return {
      buyer_id: buyerId,
      agent_id: agentId,
      operation: "buy",
      property_type: null,
      rooms_min: null,
      rooms_max: null,
      bedrooms: null,
      neighborhood: null,
      subzones: [],
      currency: "USD",
      budget_max: null,
      budget_tolerance_pct: 0,
      financing: "undefined",
      move_by: null,
      must_haves: [],
      nice_to_haves: [],
      deal_breakers: [],
      source_note_id: null,
      field_sources: {},
      updated_at: now().toISOString(),
    };
  }

  // --- API ------------------------------------------------------------------

  const ds: DataSource = {
    kind: "mock",

    auth: {
      getSession,
      onChange(avisar) {
        oyentes.add(avisar);
        // Otra pestaña cerró o abrió sesión.
        const alCambiar = (e: StorageEvent) => {
          if (e.key === SESSION_KEY || e.key === null) avisar();
        };
        const hayVentana = typeof window !== "undefined";
        if (hayVentana) window.addEventListener("storage", alCambiar);
        return () => {
          oyentes.delete(avisar);
          if (hayVentana) window.removeEventListener("storage", alCambiar);
        };
      },

      async signIn({ email, name }) {
        if (!isValidEmail(email)) throw new DataError("invalid", "Ese email no parece válido.");
        const limpio = normalizeEmail(email);
        const db = load();
        let agente = db.agents.find((a) => a.email === limpio);
        if (!agente) {
          agente = {
            id: newId(),
            name: name?.trim() || limpio.split("@")[0],
            email: limpio,
            phone: null,
            office: null,
            work_zone: null,
            settings: { ...DEFAULT_AGENT_SETTINGS },
            created_at: now().toISOString(),
          };
          db.agents.push(agente);
          save(db);
        }
        const sesion = { agentId: agente.id, email: agente.email };
        setSession(sesion);
        return sesion;
      },

      async signInDemo() {
        const db = load();
        const emailDemo = normalizeEmail(DEMO_AGENT.email);
        let agente = db.agents.find((a) => a.email === emailDemo);
        if (!agente) {
          agente = buildDemoAgent(newId(), now());
          db.agents.push(agente);
          loadDemoData(db, agente.id);
          save(db);
        }
        const sesion = { agentId: agente.id, email: agente.email };
        setSession(sesion);
        return sesion;
      },

      async signOut() {
        setSession(null);
      },
    },

    agent: {
      async get() {
        const { agentId, db } = scoped();
        const agente = db.agents.find((a) => a.id === agentId);
        if (!agente) throw new DataError("not_found", "No encontramos tu cuenta.");
        return agente;
      },
      async update(cambios) {
        const { agentId, db } = scoped();
        const agente = db.agents.find((a) => a.id === agentId);
        if (!agente) throw new DataError("not_found", "No encontramos tu cuenta.");
        Object.assign(agente, cambios);
        save(db);
        return agente;
      },
      async exportAll() {
        const { agentId, db, mine } = scoped();
        const agente = db.agents.find((a) => a.id === agentId);
        return {
          exportado: now().toISOString(),
          agente,
          clientes: mine(db.buyers),
          fichas: mine(db.buyer_criteria),
          notas: mine(db.notes),
          propiedades: mine(db.properties),
          descartes: mine(db.discards),
          oportunidades: mine(db.matches),
          mensajes: mine(db.messages),
        };
      },
      async deleteAccount() {
        const { agentId, db } = scoped();
        clearAgentData(db, agentId);
        db.agents = db.agents.filter((a) => a.id !== agentId);
        save(db);
        setSession(null);
      },
      async updateSettings(cambios) {
        const { agentId, db } = scoped();
        const agente = db.agents.find((a) => a.id === agentId);
        if (!agente) throw new DataError("not_found", "No encontramos tu cuenta.");
        agente.settings = { ...agente.settings, ...cambios };
        save(db);
        return agente;
      },
    },

    buyers: {
      async list(filtro) {
        const { db, mine } = scoped();
        return mine(db.buyers)
          .filter((b) => !filtro?.status || b.status === filtro.status)
          .sort((a, b) => (b.last_contact_at ?? "").localeCompare(a.last_contact_at ?? ""));
      },
      async get(id) {
        const { db, mine } = scoped();
        return mine(db.buyers).find((b) => b.id === id) ?? null;
      },
      async create(datos: NewBuyer) {
        const { agentId, db, mine } = scoped();
        const nombre = datos.name.trim();
        if (!nombre) throw new DataError("invalid", "El cliente necesita un nombre.");
        const email = cleanEmail(datos.email);
        assertUniqueBuyerEmail(mine(db.buyers), email);
        const ahora = now().toISOString();
        const cliente: Buyer = {
          id: newId(),
          agent_id: agentId,
          name: nombre,
          phone: datos.phone?.trim() || null,
          email,
          status: datos.status ?? "active",
          last_contact_at: ahora,
          summary: null,
          created_at: ahora,
        };
        db.buyers.push(cliente);
        db.buyer_criteria.push(blankCriteria(cliente.id, agentId));
        save(db);
        return cliente;
      },
      async update(id, cambios) {
        const { db, mine } = scoped();
        const cliente = mine(db.buyers).find((b) => b.id === id);
        if (!cliente) throw new DataError("not_found", "No encontramos ese cliente.");
        if (cambios.email !== undefined) {
          const email = cleanEmail(cambios.email);
          assertUniqueBuyerEmail(mine(db.buyers), email, id);
          cliente.email = email;
        }
        if (cambios.name !== undefined) {
          const nombre = cambios.name.trim();
          if (!nombre) throw new DataError("invalid", "El cliente necesita un nombre.");
          cliente.name = nombre;
        }
        if (cambios.phone !== undefined) cliente.phone = cambios.phone?.trim() || null;
        if (cambios.status !== undefined) cliente.status = cambios.status;
        if (cambios.last_contact_at !== undefined) cliente.last_contact_at = cambios.last_contact_at;
        if (cambios.summary !== undefined) cliente.summary = cambios.summary;
        save(db);
        return cliente;
      },
      async getCriteria(buyerId) {
        const { db, mine } = scoped();
        return mine(db.buyer_criteria).find((c) => c.buyer_id === buyerId) ?? null;
      },
      async updateCriteria(buyerId, cambios) {
        const { agentId, db, mine } = scoped();
        if (!mine(db.buyers).some((b) => b.id === buyerId)) {
          throw new DataError("not_found", "No encontramos ese cliente.");
        }
        let criterios = mine(db.buyer_criteria).find((c) => c.buyer_id === buyerId);
        if (!criterios) {
          criterios = blankCriteria(buyerId, agentId);
          db.buyer_criteria.push(criterios);
        }
        Object.assign(criterios, cambios, { buyer_id: buyerId, agent_id: agentId, updated_at: now().toISOString() });
        save(db);
        return criterios;
      },
      async listNotes(buyerId) {
        const { db, mine } = scoped();
        return mine(db.notes)
          .filter((n) => n.buyer_id === buyerId)
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
      },
      async listDiscards(buyerId) {
        const { db, mine } = scoped();
        const propiedades = mine(db.properties);
        return mine(db.discards)
          .filter((d) => d.buyer_id === buyerId)
          .map((d) => ({ ...d, property: propiedades.find((p) => p.id === d.property_id) ?? null }));
      },
      async addNote(buyerId, datos: NewNote) {
        const { agentId, db, mine } = scoped();
        if (!mine(db.buyers).some((b) => b.id === buyerId)) {
          throw new DataError("not_found", "No encontramos ese cliente.");
        }
        const texto = datos.transcript?.trim() || null;
        if (!texto && !datos.audio_path) throw new DataError("invalid", "La nota está vacía.");
        const nota: Note = {
          id: newId(),
          agent_id: agentId,
          buyer_id: buyerId,
          kind: datos.kind,
          audio_path: datos.audio_path ?? null,
          duration_seconds: datos.duration_seconds ?? null,
          transcript: texto,
          extracted_json: datos.extracted_json ?? null,
          changes: datos.changes ?? [],
          created_at: now().toISOString(),
        };
        db.notes.push(nota);
        save(db);
        return nota;
      },
      async addDiscard(buyerId, datos: NewDiscard) {
        const { agentId, db, mine } = scoped();
        if (!mine(db.buyers).some((b) => b.id === buyerId)) {
          throw new DataError("not_found", "No encontramos ese cliente.");
        }
        const motivo = datos.reason.trim();
        if (!motivo) throw new DataError("invalid", "Contá por qué la descartó.");
        const propiedad = datos.property_id
          ? (mine(db.properties).find((p) => p.id === datos.property_id) ?? null)
          : null;
        if (datos.property_id && !propiedad) throw new DataError("not_found", "No encontramos esa propiedad.");
        const texto = datos.property_text?.trim() || null;
        if (!propiedad && !texto) throw new DataError("invalid", "Indicá qué propiedad descartó.");
        const descarte: Discard = {
          id: newId(),
          agent_id: agentId,
          buyer_id: buyerId,
          property_id: propiedad?.id ?? null,
          property_text: propiedad ? null : texto,
          reason: motivo,
          created_at: now().toISOString(),
        };
        db.discards.push(descarte);
        save(db);
        return { ...descarte, property: propiedad };
      },
      async removeDiscard(discardId) {
        const { db, mine } = scoped();
        if (!mine(db.discards).some((d) => d.id === discardId)) {
          throw new DataError("not_found", "No encontramos ese descarte.");
        }
        db.discards = db.discards.filter((d) => d.id !== discardId);
        save(db);
      },
    },

    properties: {
      async list() {
        const { db, mine } = scoped();
        return mine(db.properties).sort((a, b) => b.published_at.localeCompare(a.published_at));
      },
      async get(id) {
        const { db, mine } = scoped();
        return mine(db.properties).find((p) => p.id === id) ?? null;
      },
      async create(datos: NewProperty) {
        const { agentId, db, mine } = scoped();
        const direccion = datos.address.trim();
        if (direccion.length < 3) throw new DataError("invalid", "Falta la dirección.");
        if (!datos.neighborhood.trim()) throw new DataError("invalid", "Falta el barrio.");
        if (!(datos.price > 0)) throw new DataError("invalid", "El precio tiene que ser mayor a cero.");
        if (!(datos.rooms >= 1)) throw new DataError("invalid", "Indicá cuántos ambientes tiene.");
        const clave = normalizarDireccion(direccion);
        const repetida = mine(db.properties).find((p) => normalizarDireccion(p.address) === clave);
        if (repetida) {
          throw new DataError("duplicate", `Ya tenés cargada ${repetida.address}.`, {
            id: repetida.id,
            name: repetida.address,
          });
        }
        const ahora = now().toISOString();
        const propiedad: Property = {
          ...datos,
          id: newId(),
          agent_id: agentId,
          address: direccion,
          neighborhood: datos.neighborhood.trim(),
          subzone: datos.subzone?.trim() || null,
          published_at: datos.published_at ?? ahora,
          created_at: ahora,
        };
        db.properties.push(propiedad);
        save(db);
        return propiedad;
      },
    },

    matches: {
      async get(id) {
        const { db, mine } = scoped();
        const m = mine(db.matches).find((x) => x.id === id);
        if (!m) return null;
        const buyer = mine(db.buyers).find((b) => b.id === m.buyer_id);
        const property = mine(db.properties).find((p) => p.id === m.property_id);
        return buyer && property ? { ...m, buyer, property } : null;
      },
      async upsert(datos: NewMatch) {
        const { agentId, db, mine } = scoped();
        if (!mine(db.buyers).some((b) => b.id === datos.buyer_id)) throw new DataError("not_found", "No encontramos ese cliente.");
        if (!mine(db.properties).some((p) => p.id === datos.property_id)) throw new DataError("not_found", "No encontramos esa propiedad.");
        const existente = mine(db.matches).find((x) => x.buyer_id === datos.buyer_id && x.property_id === datos.property_id);
        if (existente) {
          Object.assign(existente, { score: datos.score, reasons: datos.reasons, similar_to_discard: datos.similar_to_discard });
          save(db);
          return { match: existente, creada: false };
        }
        const ahora = now().toISOString();
        const nueva: Match = {
          ...datos,
          id: newId(),
          agent_id: agentId,
          status: "new",
          notified_at: ahora,
          sent_at: null,
          created_at: ahora,
        };
        db.matches.push(nueva);
        save(db);
        return { match: nueva, creada: true };
      },
      async setStatus(id, status) {
        const { db, mine } = scoped();
        const m = mine(db.matches).find((x) => x.id === id);
        if (!m) throw new DataError("not_found", "No encontramos esa oportunidad.");
        m.status = status;
        if (status === "sent") m.sent_at = now().toISOString();
        save(db);
        return m;
      },
      async remove(id) {
        const { db, mine } = scoped();
        if (!mine(db.matches).some((x) => x.id === id)) throw new DataError("not_found", "No encontramos esa oportunidad.");
        db.matches = db.matches.filter((x) => x.id !== id);
        save(db);
      },
      async list(filtro) {
        const { db, mine } = scoped();
        const clientes = mine(db.buyers);
        const propiedades = mine(db.properties);
        const resultado: MatchWithRefs[] = [];
        for (const m of mine(db.matches)) {
          if (filtro?.status && !filtro.status.includes(m.status)) continue;
          if (filtro?.buyerId && m.buyer_id !== filtro.buyerId) continue;
          if (filtro?.propertyId && m.property_id !== filtro.propertyId) continue;
          const buyer = clientes.find((b) => b.id === m.buyer_id);
          const property = propiedades.find((p) => p.id === m.property_id);
          if (buyer && property) resultado.push({ ...m, buyer, property });
        }
        return resultado.sort((a, b) => b.created_at.localeCompare(a.created_at));
      },
    },

    messages: {
      async create(datos: NewMessage) {
        const { agentId, db, mine } = scoped();
        if (!mine(db.matches).some((x) => x.id === datos.match_id)) throw new DataError("not_found", "No encontramos esa oportunidad.");
        const texto = datos.text.trim();
        if (!texto) throw new DataError("invalid", "El mensaje está vacío.");
        const mensaje: Message = {
          id: newId(),
          agent_id: agentId,
          match_id: datos.match_id,
          text: texto,
          tone: datos.tone,
          sent_via: "whatsapp",
          sent_at: now().toISOString(),
        };
        db.messages.push(mensaje);
        save(db);
        return mensaje;
      },
      async listByMatch(matchId) {
        const { db, mine } = scoped();
        return mine(db.messages)
          .filter((x) => x.match_id === matchId)
          .sort((a, b) => b.sent_at.localeCompare(a.sent_at));
      },
    },

    push: {
      async save(suscripcion) {
        const { agentId, db, mine } = scoped();
        const existente = mine(db.push_subscriptions).find((x) => x.endpoint === suscripcion.endpoint);
        if (existente) {
          existente.keys = suscripcion.keys;
          save(db);
          return existente;
        }
        const fila: PushSubscriptionRow = {
          id: newId(),
          agent_id: agentId,
          endpoint: suscripcion.endpoint,
          keys: suscripcion.keys,
          created_at: now().toISOString(),
        };
        db.push_subscriptions.push(fila);
        save(db);
        return fila;
      },
      async list() {
        const { db, mine } = scoped();
        return mine(db.push_subscriptions);
      },
      async remove(endpoint) {
        const { agentId, db } = scoped();
        db.push_subscriptions = db.push_subscriptions.filter((x) => !(x.agent_id === agentId && x.endpoint === endpoint));
        save(db);
      },
    },

    demo: {
      async simulateProperty() {
        const { agentId, db, mine } = scoped();
        const cargadas = new Set(mine(db.properties).map((p) => normalizarDireccion(p.address)));
        const proxima = PROPIEDADES_PARA_SIMULAR.find((p) => !cargadas.has(normalizarDireccion(p.address)));
        if (!proxima) return null;
        const propiedad = propiedadDeSeed(proxima, agentId, newId(), now());
        db.properties.push(propiedad);
        save(db);
        return propiedad;
      },
      async reset() {
        const { agentId, db } = scoped();
        clearAgentData(db, agentId);
        loadDemoData(db, agentId);
        save(db);
      },
    },
  };

  return ds;
}
