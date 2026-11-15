/**
 * Modelo de datos de Kairos. Los nombres coinciden con las columnas de Supabase
 * (supabase/migrations). En el código el cliente es `buyer`; en la interfaz, siempre "cliente".
 */

export type Id = string;
export type ISODate = string; // 2026-11-12T18:32:00.000Z
export type Currency = "USD" | "ARS";

// --- Agente -----------------------------------------------------------------

export type AgentSettings = {
  /** Umbral de alerta en % (por defecto 75). */
  alert_threshold: number;
  /** Horario de "no molestar" en HH:mm, o null si no está activo. */
  dnd_start: string | null;
  dnd_end: string | null;
  /** Borrar el audio después de transcribir (activado por defecto). */
  delete_audio_after_transcribe: boolean;
  privacy_accepted_at: ISODate | null;
};

export type Agent = {
  id: Id;
  name: string;
  email: string;
  phone: string | null;
  office: string | null;
  work_zone: string | null;
  settings: AgentSettings;
  created_at: ISODate;
};

export const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  alert_threshold: 75,
  dnd_start: null,
  dnd_end: null,
  delete_audio_after_transcribe: true,
  privacy_accepted_at: null,
};

// --- Cliente ----------------------------------------------------------------

export type BuyerStatus = "active" | "paused" | "closed" | "lost";

export type Buyer = {
  id: Id;
  agent_id: Id;
  name: string;
  /** Formato 549… */
  phone: string | null;
  email: string | null;
  status: BuyerStatus;
  last_contact_at: ISODate | null;
  /** La frase resumen: "Busca 3 ambientes en Palermo, hasta USD 180.000". */
  summary: string | null;
  created_at: ISODate;
};

export type Operation = "buy" | "rent";
export type PropertyType = "apartment" | "house" | "ph" | "land" | "commercial" | "other";
export type Financing = "cash" | "preapproved_credit" | "undefined";

export type BuyerCriteria = {
  buyer_id: Id;
  agent_id: Id;
  operation: Operation;
  property_type: PropertyType | null;
  rooms_min: number | null;
  rooms_max: number | null;
  bedrooms: number | null;
  neighborhood: string | null;
  subzones: string[];
  currency: Currency;
  budget_max: number | null;
  budget_tolerance_pct: number;
  financing: Financing;
  /** Fecha límite de mudanza (YYYY-MM-DD). */
  move_by: string | null;
  /** Claves de lib/domain/features cuando se conocen; si no, texto libre. */
  must_haves: string[];
  nice_to_haves: string[];
  deal_breakers: string[];
  source_note_id: Id | null;
  /** De qué nota salió cada dato, campo por campo. */
  field_sources: Record<string, Id>;
  updated_at: ISODate;
};

// --- Notas ------------------------------------------------------------------

export type Note = {
  id: Id;
  agent_id: Id;
  buyer_id: Id;
  kind: "audio" | "text";
  audio_path: string | null;
  duration_seconds: number | null;
  transcript: string | null;
  extracted_json: unknown | null;
  /** Qué cambió esta nota en la ficha, en frases cortas. */
  changes: string[];
  created_at: ISODate;
};

// --- Propiedades ------------------------------------------------------------

export type PropertySource = "manual" | "pasted" | "imported" | "demo";
export type Portal = "zonaprop" | "argenprop" | "mercadolibre" | "other";
export type TriState = "yes" | "no" | "unconfirmed";

export type Property = {
  id: Id;
  agent_id: Id;
  source: PropertySource;
  url: string | null;
  portal: Portal | null;
  operation: Operation;
  property_type: PropertyType;
  address: string;
  neighborhood: string;
  subzone: string | null;
  price: number;
  currency: Currency;
  /** Expensas en pesos. */
  expenses: number | null;
  rooms: number;
  bedrooms: number | null;
  covered_m2: number | null;
  total_m2: number | null;
  /** 0 es planta baja. */
  floor: number | null;
  orientation: string | null;
  balcony: boolean;
  on_avenue: boolean;
  credit_eligible: TriState;
  amenities: string[];
  photos: string[];
  description: string | null;
  published_at: ISODate;
  created_at: ISODate;
};

// --- Descartes, oportunidades y mensajes ------------------------------------

export type Discard = {
  id: Id;
  agent_id: Id;
  buyer_id: Id;
  property_id: Id | null;
  /** Texto libre cuando la propiedad no está cargada. */
  property_text: string | null;
  /** Con las palabras del cliente: "Muy ruidosa, da a la avenida". */
  reason: string;
  created_at: ISODate;
};

export type MatchStatus = "new" | "seen" | "sent" | "dismissed";

export type MatchReasons = {
  met: string[];
  unmet: string[];
  unconfirmed: string[];
  /** "No se parece a lo que descartó: …" o el parecido que encontró. */
  discard_note: string | null;
};

export type Match = {
  id: Id;
  agent_id: Id;
  buyer_id: Id;
  property_id: Id;
  /** 0 a 100 */
  score: number;
  reasons: MatchReasons;
  similar_to_discard: boolean;
  status: MatchStatus;
  notified_at: ISODate | null;
  sent_at: ISODate | null;
  created_at: ISODate;
};

export type MessageTone = "normal" | "shorter" | "formal";

export type Message = {
  id: Id;
  agent_id: Id;
  match_id: Id;
  text: string;
  tone: MessageTone;
  sent_via: "whatsapp";
  sent_at: ISODate;
};

export type PushSubscriptionRow = {
  id: Id;
  agent_id: Id;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  created_at: ISODate;
};

// --- Vistas compuestas ------------------------------------------------------

export type MatchWithRefs = Match & { buyer: Buyer; property: Property };
export type DiscardWithProperty = Discard & { property: Property | null };
