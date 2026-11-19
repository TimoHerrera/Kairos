import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PROPIEDADES_PARA_SIMULAR, propiedadDeSeed } from "../seed/build";
import { DataError, isValidEmail, normalizarDireccion, normalizeEmail, type DataSource, type Session } from "../source";
import type {
  Agent,
  Buyer,
  BuyerCriteria,
  DiscardWithProperty,
  Match,
  MatchWithRefs,
  Message,
  Note,
  Property,
  PushSubscriptionRow,
} from "../types";

/**
 * Fuente de datos de Supabase (NEXT_PUBLIC_DATA_SOURCE=supabase).
 * Corre en el navegador con la clave pública: la seguridad la pone la RLS de la base
 * (agent_id = auth.uid()), no esta capa. El agent_id lo completa la base sola (default auth.uid()).
 *
 * Entrar: link mágico al email. Demo: sesión anónima + kairos_seed_demo.
 * Ver supabase/migrations y el README para configurar el proyecto.
 */

const CLAVE_SESION = "kairos:supabase:sesion";

type Fila = Record<string, unknown>;

function fallar(error: { message: string; code?: string } | null, mensaje = "No pudimos guardar los cambios."): void {
  if (!error) return;
  if (error.code === "23505") throw new DataError("duplicate_email", "Ya tenés un cliente con ese email.");
  if (error.code === "42501") throw new DataError("not_found", "No encontramos ese dato en tu cuenta.");
  throw new DataError("invalid", mensaje);
}

export function createSupabaseDataSource(): DataSource {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new DataError("not_implemented", "Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  const sb: SupabaseClient = createClient(url, anon, {
    auth: { storageKey: CLAVE_SESION, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  const oyentes = new Set<() => void>();
  sb.auth.onAuthStateChange(() => oyentes.forEach((f) => f()));

  /** La sesión, leída al instante del almacenamiento (Supabase la guarda ahí). */
  function getSession(): Session | null {
    if (typeof window === "undefined") return null;
    try {
      const crudo = window.localStorage.getItem(CLAVE_SESION);
      if (!crudo) return null;
      const s = JSON.parse(crudo) as { user?: { id?: string; email?: string | null; is_anonymous?: boolean } };
      if (!s.user?.id) return null;
      return { agentId: s.user.id, email: s.user.email || "demo@kairos.app" };
    } catch {
      return null;
    }
  }

  function uid(): string {
    const s = getSession();
    if (!s) throw new DataError("no_session", "No hay una sesión iniciada.");
    return s.agentId;
  }

  async function filas<T>(consulta: PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>): Promise<T> {
    const { data, error } = await consulta;
    fallar(error, "No pudimos leer tus datos.");
    return data as T;
  }

  const conRefs = "*, buyer:buyers(*), property:properties(*)";

  async function emailRepetido(email: string | null, exceptoId?: string) {
    if (!email) return;
    let q = sb.from("buyers").select("id, name").eq("email", email);
    if (exceptoId) q = q.neq("id", exceptoId);
    const { data } = await q.limit(1);
    const otro = (data as Array<{ id: string; name: string }> | null)?.[0];
    if (otro) throw new DataError("duplicate_email", `Ya tenés un cliente con ese email: ${otro.name}.`, otro);
  }

  function limpiarEmail(email: string | null | undefined): string | null {
    if (!email || !email.trim()) return null;
    if (!isValidEmail(email)) throw new DataError("invalid", "Ese email no parece válido.");
    return normalizeEmail(email);
  }

  const ds: DataSource = {
    kind: "supabase",

    auth: {
      getSession,
      onChange(avisar) {
        oyentes.add(avisar);
        const alCambiar = (e: StorageEvent) => {
          if (e.key === CLAVE_SESION || e.key === null) avisar();
        };
        window.addEventListener("storage", alCambiar);
        return () => {
          oyentes.delete(avisar);
          window.removeEventListener("storage", alCambiar);
        };
      },
      async signIn({ email, name }) {
        if (!isValidEmail(email)) throw new DataError("invalid", "Ese email no parece válido.");
        const { error } = await sb.auth.signInWithOtp({
          email: normalizeEmail(email),
          options: { emailRedirectTo: `${window.location.origin}/hoy`, data: name ? { name } : undefined },
        });
        if (error) throw new DataError("invalid", "No pudimos mandarte el link. Probá de nuevo.");
        // La sesión llega cuando el agente toca el link del email.
        throw new DataError("check_email", `Te mandamos un link a ${normalizeEmail(email)}. Abrilo desde este dispositivo para entrar.`);
      },
      async signInDemo() {
        const { data, error } = await sb.auth.signInAnonymously({ options: { data: { name: "Lucía F." } } });
        if (error || !data.user) throw new DataError("invalid", "No pudimos abrir la demo. ¿Está activado el acceso anónimo en Supabase?");
        const { count } = await sb.from("buyers").select("id", { count: "exact", head: true });
        if (!count) await filas(sb.rpc("kairos_seed_demo", { p_agent: data.user.id }));
        return { agentId: data.user.id, email: data.user.email || "demo@kairos.app" };
      },
      async signOut() {
        await sb.auth.signOut();
        oyentes.forEach((f) => f());
      },
    },

    agent: {
      async get() {
        return filas<Agent>(sb.from("agents").select("*").eq("id", uid()).single());
      },
      async update(cambios) {
        return filas<Agent>(sb.from("agents").update(cambios).eq("id", uid()).select().single());
      },
      async updateSettings(cambios) {
        const actual = await ds.agent.get();
        return filas<Agent>(
          sb
            .from("agents")
            .update({ settings: { ...actual.settings, ...cambios } })
            .eq("id", uid())
            .select()
            .single(),
        );
      },
      async exportAll() {
        const tablas = ["buyers", "buyer_criteria", "notes", "properties", "discards", "matches", "messages"] as const;
        const datos: Record<string, unknown> = { exportado: new Date().toISOString(), agente: await ds.agent.get() };
        for (const t of tablas) datos[t] = await filas(sb.from(t).select("*"));
        return datos;
      },
      async deleteAccount() {
        await filas(sb.rpc("kairos_borrar_cuenta"));
        await sb.auth.signOut();
        oyentes.forEach((f) => f());
      },
    },

    buyers: {
      async list(filtro) {
        let q = sb.from("buyers").select("*").order("last_contact_at", { ascending: false, nullsFirst: false });
        if (filtro?.status) q = q.eq("status", filtro.status);
        return filas<Buyer[]>(q);
      },
      async get(id) {
        return filas<Buyer | null>(sb.from("buyers").select("*").eq("id", id).maybeSingle());
      },
      async create(datos) {
        const nombre = datos.name.trim();
        if (!nombre) throw new DataError("invalid", "El cliente necesita un nombre.");
        const email = limpiarEmail(datos.email);
        await emailRepetido(email);
        const cliente = await filas<Buyer>(
          sb
            .from("buyers")
            .insert({ name: nombre, phone: datos.phone?.trim() || null, email, status: datos.status ?? "active", last_contact_at: new Date().toISOString() })
            .select()
            .single(),
        );
        await filas(sb.from("buyer_criteria").insert({ buyer_id: cliente.id }));
        return cliente;
      },
      async update(id, cambios) {
        const fila: Fila = { ...cambios };
        if (cambios.email !== undefined) {
          fila.email = limpiarEmail(cambios.email);
          await emailRepetido(fila.email as string | null, id);
        }
        if (cambios.name !== undefined) {
          if (!cambios.name.trim()) throw new DataError("invalid", "El cliente necesita un nombre.");
          fila.name = cambios.name.trim();
        }
        const r = await filas<Buyer | null>(sb.from("buyers").update(fila).eq("id", id).select().maybeSingle());
        if (!r) throw new DataError("not_found", "No encontramos ese cliente.");
        return r;
      },
      async getCriteria(buyerId) {
        return filas<BuyerCriteria | null>(sb.from("buyer_criteria").select("*").eq("buyer_id", buyerId).maybeSingle());
      },
      async updateCriteria(buyerId, cambios) {
        const r = await filas<BuyerCriteria | null>(
          sb
            .from("buyer_criteria")
            .upsert({ ...cambios, buyer_id: buyerId, updated_at: new Date().toISOString() }, { onConflict: "buyer_id" })
            .select()
            .maybeSingle(),
        );
        if (!r) throw new DataError("not_found", "No encontramos ese cliente.");
        return r;
      },
      async listNotes(buyerId) {
        return filas<Note[]>(sb.from("notes").select("*").eq("buyer_id", buyerId).order("created_at", { ascending: false }));
      },
      async addNote(buyerId, datos) {
        if (!datos.transcript?.trim() && !datos.audio_path) throw new DataError("invalid", "La nota está vacía.");
        return filas<Note>(
          sb
            .from("notes")
            .insert({ buyer_id: buyerId, ...datos, transcript: datos.transcript?.trim() || null })
            .select()
            .single(),
        );
      },
      async listDiscards(buyerId) {
        return filas<DiscardWithProperty[]>(sb.from("discards").select("*, property:properties(*)").eq("buyer_id", buyerId).order("created_at"));
      },
      async addDiscard(buyerId, datos) {
        if (!datos.reason.trim()) throw new DataError("invalid", "Contá por qué la descartó.");
        if (!datos.property_id && !datos.property_text?.trim()) throw new DataError("invalid", "Indicá qué propiedad descartó.");
        return filas<DiscardWithProperty>(
          sb
            .from("discards")
            .insert({
              buyer_id: buyerId,
              property_id: datos.property_id || null,
              property_text: datos.property_id ? null : datos.property_text?.trim(),
              reason: datos.reason.trim(),
            })
            .select("*, property:properties(*)")
            .single(),
        );
      },
      async removeDiscard(discardId) {
        await filas(sb.from("discards").delete().eq("id", discardId));
      },
    },

    properties: {
      async list() {
        return filas<Property[]>(sb.from("properties").select("*").order("published_at", { ascending: false }));
      },
      async get(id) {
        return filas<Property | null>(sb.from("properties").select("*").eq("id", id).maybeSingle());
      },
      async create(datos) {
        const existentes = await filas<Array<{ id: string; address: string }>>(sb.from("properties").select("id, address"));
        const repetida = existentes.find((p) => normalizarDireccion(p.address) === normalizarDireccion(datos.address));
        if (repetida) throw new DataError("duplicate", `Ya tenés cargada ${repetida.address}.`, { id: repetida.id, name: repetida.address });
        return filas<Property>(sb.from("properties").insert({ ...datos, published_at: datos.published_at ?? new Date().toISOString() }).select().single());
      },
    },

    matches: {
      async list(filtro) {
        let q = sb.from("matches").select(conRefs).order("created_at", { ascending: false });
        if (filtro?.status) q = q.in("status", filtro.status);
        if (filtro?.buyerId) q = q.eq("buyer_id", filtro.buyerId);
        if (filtro?.propertyId) q = q.eq("property_id", filtro.propertyId);
        return filas<MatchWithRefs[]>(q);
      },
      async get(id) {
        return filas<MatchWithRefs | null>(sb.from("matches").select(conRefs).eq("id", id).maybeSingle());
      },
      async upsert(datos) {
        const existente = await filas<Match | null>(
          sb.from("matches").select("*").eq("buyer_id", datos.buyer_id).eq("property_id", datos.property_id).maybeSingle(),
        );
        if (existente) {
          const match = await filas<Match>(
            sb
              .from("matches")
              .update({ score: datos.score, reasons: datos.reasons, similar_to_discard: datos.similar_to_discard })
              .eq("id", existente.id)
              .select()
              .single(),
          );
          return { match, creada: false };
        }
        const match = await filas<Match>(sb.from("matches").insert({ ...datos, status: "new", notified_at: new Date().toISOString() }).select().single());
        return { match, creada: true };
      },
      async setStatus(id, status) {
        const cambios: Fila = { status };
        if (status === "sent") cambios.sent_at = new Date().toISOString();
        return filas<Match>(sb.from("matches").update(cambios).eq("id", id).select().single());
      },
      async remove(id) {
        await filas(sb.from("matches").delete().eq("id", id));
      },
    },

    messages: {
      async create(datos) {
        if (!datos.text.trim()) throw new DataError("invalid", "El mensaje está vacío.");
        return filas<Message>(sb.from("messages").insert({ ...datos, text: datos.text.trim() }).select().single());
      },
      async listByMatch(matchId) {
        return filas<Message[]>(sb.from("messages").select("*").eq("match_id", matchId).order("sent_at", { ascending: false }));
      },
    },

    push: {
      async save(s) {
        return filas<PushSubscriptionRow>(
          sb
            .from("push_subscriptions")
            .upsert({ agent_id: uid(), endpoint: s.endpoint, keys: s.keys }, { onConflict: "agent_id,endpoint" })
            .select()
            .single(),
        );
      },
      async list() {
        return filas<PushSubscriptionRow[]>(sb.from("push_subscriptions").select("*"));
      },
      async remove(endpoint) {
        await filas(sb.from("push_subscriptions").delete().eq("endpoint", endpoint));
      },
    },

    demo: {
      async reset() {
        await filas(sb.rpc("kairos_seed_demo", { p_agent: uid() }));
      },
      async simulateProperty() {
        const existentes = await filas<Array<{ address: string }>>(sb.from("properties").select("address"));
        const cargadas = new Set(existentes.map((p) => normalizarDireccion(p.address)));
        const proxima = PROPIEDADES_PARA_SIMULAR.find((p) => !cargadas.has(normalizarDireccion(p.address)));
        if (!proxima) return null;
        // Sin id ni agent_id: los pone la base.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, agent_id, ...fila } = propiedadDeSeed(proxima, uid(), "", new Date());
        return filas<Property>(sb.from("properties").insert(fila).select().single());
      },
    },
  };

  return ds;
}
