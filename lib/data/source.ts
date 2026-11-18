import type {
  Agent,
  AgentSettings,
  Buyer,
  BuyerCriteria,
  BuyerStatus,
  DiscardWithProperty,
  Id,
  MatchStatus,
  MatchWithRefs,
  Note,
  Property,
} from "./types";

/**
 * La interfaz que usa toda la app para leer y escribir.
 * Hay dos implementaciones: mock (en memoria + localStorage) y Supabase,
 * elegidas con NEXT_PUBLIC_DATA_SOURCE.
 *
 * Ningún método recibe el id del agente: siempre trabaja con la sesión actual,
 * igual que la RLS de Supabase (agent_id = auth.uid()).
 */
export interface DataSource {
  readonly kind: "mock" | "supabase";
  auth: AuthApi;
  agent: {
    get(): Promise<Agent>;
    update(cambios: Partial<Pick<Agent, "name" | "phone" | "office" | "work_zone">>): Promise<Agent>;
    updateSettings(cambios: Partial<AgentSettings>): Promise<Agent>;
  };
  buyers: {
    list(filtro?: { status?: BuyerStatus }): Promise<Buyer[]>;
    get(id: Id): Promise<Buyer | null>;
    create(datos: NewBuyer): Promise<Buyer>;
    update(id: Id, cambios: Partial<NewBuyer> & { last_contact_at?: string | null; summary?: string | null }): Promise<Buyer>;
    getCriteria(buyerId: Id): Promise<BuyerCriteria | null>;
    updateCriteria(buyerId: Id, cambios: Partial<Omit<BuyerCriteria, "buyer_id" | "agent_id">>): Promise<BuyerCriteria>;
    listNotes(buyerId: Id): Promise<Note[]>;
    addNote(buyerId: Id, datos: NewNote): Promise<Note>;
    listDiscards(buyerId: Id): Promise<DiscardWithProperty[]>;
    /** Un descarte apunta a una propiedad cargada o, si no lo está, a un texto libre. */
    addDiscard(buyerId: Id, datos: NewDiscard): Promise<DiscardWithProperty>;
    removeDiscard(discardId: Id): Promise<void>;
  };
  properties: {
    list(): Promise<Property[]>;
    get(id: Id): Promise<Property | null>;
  };
  matches: {
    list(filtro?: { status?: MatchStatus[]; buyerId?: Id; propertyId?: Id }): Promise<MatchWithRefs[]>;
  };
  demo: {
    /** Borra los datos del agente actual y vuelve a cargar los del prototipo. */
    reset(): Promise<void>;
  };
}

export type NewBuyer = {
  name: string;
  phone?: string | null;
  email?: string | null;
  status?: BuyerStatus;
};

export type NewNote = Pick<Note, "kind" | "transcript"> &
  Partial<Pick<Note, "audio_path" | "duration_seconds" | "extracted_json" | "changes">>;

export type NewDiscard = {
  property_id?: Id | null;
  property_text?: string | null;
  reason: string;
};

export type Session = { agentId: Id; email: string };

export interface AuthApi {
  getSession(): Session | null;
  /** Avisa cuando la sesión cambia (también desde otra pestaña). Devuelve cómo dejar de escuchar. */
  onChange(avisar: () => void): () => void;
  /** Entra con un email. Si el agente no existe, lo crea con la cartera vacía. */
  signIn(datos: { email: string; name?: string }): Promise<Session>;
  /** Entra a la cuenta de demostración, con los datos del prototipo. */
  signInDemo(): Promise<Session>;
  signOut(): Promise<void>;
}

export type DataErrorCode = "duplicate_email" | "not_found" | "no_session" | "invalid" | "not_implemented";

export class DataError extends Error {
  constructor(
    public code: DataErrorCode,
    message: string,
    /** Para duplicados: el registro que ya existe. */
    public existing?: { id: Id; name: string },
  ) {
    super(message);
    this.name = "DataError";
  }
}

/** Email único por agente, siempre normalizado en minúsculas. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeEmail(email));
}
