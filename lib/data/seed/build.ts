import type {
  Agent,
  Buyer,
  BuyerCriteria,
  Discard,
  Id,
  Match,
  Note,
  Property,
} from "../types";
import { DEFAULT_AGENT_SETTINGS } from "../types";
import demo from "./demo.json";

export type AgentData = {
  buyers: Buyer[];
  buyer_criteria: BuyerCriteria[];
  notes: Note[];
  properties: Property[];
  discards: Discard[];
  matches: Match[];
};

export const DEMO_AGENT = demo.agent;

const HORA = 3_600_000;
const DIA = 24 * HORA;

type PropiedadSeed = (typeof demo.properties)[number];

/** Una propiedad del seed, ya con el id y el agente. */
export function propiedadDeSeed(p: PropiedadSeed, agentId: Id, id: Id, ahora: Date = new Date()): Property {
  const publicado = new Date(ahora.getTime() - p.hours_ago * HORA).toISOString();
  return {
    id,
    agent_id: agentId,
    source: "demo",
    url: null,
    portal: p.portal as Property["portal"],
    operation: "buy",
    property_type: p.type as Property["property_type"],
    address: p.address,
    neighborhood: p.neighborhood,
    subzone: p.subzone,
    price: p.price,
    currency: "USD",
    expenses: p.expenses,
    rooms: p.rooms,
    bedrooms: p.bedrooms,
    covered_m2: p.covered_m2,
    total_m2: p.total_m2,
    floor: p.floor,
    orientation: p.orientation,
    balcony: p.balcony,
    on_avenue: p.on_avenue,
    credit_eligible: p.credit as Property["credit_eligible"],
    amenities: p.amenities,
    photos: p.photo ? [p.photo] : [],
    description: p.description,
    published_at: publicado,
    created_at: publicado,
  };
}

/** Las propiedades que el modo demo puede "hacer entrar", en orden. */
export const PROPIEDADES_PARA_SIMULAR: PropiedadSeed[] = demo.simular;

/**
 * Arma los datos del prototipo para un agente.
 * Ningún id viene fijo del seed: se generan acá y todo queda con el agent_id recibido.
 * Las fechas son relativas a `ahora`, así "hace 4 meses sin hablar" sigue siendo cierto.
 */
export function buildDemoData(agentId: Id, newId: () => Id, ahora: Date = new Date()): AgentData {
  const t = ahora.getTime();
  const iso = (ms: number) => new Date(ms).toISOString();

  const propertyIds = new Map<string, Id>();
  const properties: Property[] = demo.properties.map((p) => {
    const id = newId();
    propertyIds.set(p.key, id);
    return propiedadDeSeed(p, agentId, id, ahora);
  });

  const buyerIds = new Map<string, Id>();
  const buyers: Buyer[] = [];
  const buyer_criteria: BuyerCriteria[] = [];
  const notes: Note[] = [];
  const discards: Discard[] = [];

  for (const b of demo.buyers) {
    const id = newId();
    buyerIds.set(b.key, id);
    const ultimoContacto = iso(t - b.days_since_contact * DIA - 5 * 60_000);
    buyers.push({
      id,
      agent_id: agentId,
      name: b.name,
      phone: b.phone,
      email: b.email,
      status: b.status as Buyer["status"],
      last_contact_at: ultimoContacto,
      summary: b.summary,
      created_at: ultimoContacto,
    });

    let noteId: Id | null = null;
    if ("note" in b && b.note) {
      noteId = newId();
      notes.push({
        id: noteId,
        agent_id: agentId,
        buyer_id: id,
        kind: b.note.kind as Note["kind"],
        audio_path: null,
        duration_seconds: b.note.duration_seconds,
        transcript: b.note.transcript,
        extracted_json: null,
        changes: [],
        created_at: ultimoContacto,
      });
    }

    const c = b.criteria;
    buyer_criteria.push({
      buyer_id: id,
      agent_id: agentId,
      operation: c.operation as BuyerCriteria["operation"],
      property_type: c.property_type as BuyerCriteria["property_type"],
      rooms_min: c.rooms_min,
      rooms_max: c.rooms_max,
      bedrooms: c.bedrooms,
      neighborhood: c.neighborhood,
      subzones: c.subzones,
      currency: c.currency as BuyerCriteria["currency"],
      budget_max: c.budget_max,
      budget_tolerance_pct: c.budget_tolerance_pct,
      financing: c.financing as BuyerCriteria["financing"],
      move_by: c.move_by,
      must_haves: c.must_haves,
      nice_to_haves: c.nice_to_haves,
      deal_breakers: c.deal_breakers,
      source_note_id: noteId,
      field_sources: {},
      updated_at: ultimoContacto,
    });

    for (const d of b.discards) {
      discards.push({
        id: newId(),
        agent_id: agentId,
        buyer_id: id,
        property_id: propertyIds.get(d.property) ?? null,
        property_text: null,
        reason: d.reason,
        created_at: ultimoContacto,
      });
    }
  }

  const matches: Match[] = demo.matches.map((m) => {
    const creado = iso(t - m.hours_ago * HORA);
    const enviado = m.status === "sent";
    return {
      id: newId(),
      agent_id: agentId,
      buyer_id: buyerIds.get(m.buyer)!,
      property_id: propertyIds.get(m.property)!,
      score: m.score,
      reasons: m.reasons,
      similar_to_discard: false,
      status: m.status as Match["status"],
      notified_at: creado,
      sent_at: enviado ? iso(t - 60_000) : null,
      created_at: creado,
    };
  });

  return { buyers, buyer_criteria, notes, properties, discards, matches };
}

export function buildDemoAgent(id: Id, ahora: Date = new Date()): Agent {
  return {
    id,
    name: demo.agent.name,
    email: demo.agent.email,
    phone: demo.agent.phone,
    office: demo.agent.office,
    work_zone: demo.agent.work_zone,
    settings: { ...DEFAULT_AGENT_SETTINGS },
    created_at: ahora.toISOString(),
  };
}
