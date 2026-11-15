// Genera supabase/seed.sql a partir de lib/data/seed/demo.json,
// para que el mock y Supabase carguen exactamente los mismos datos.
// Uso: npm run seed:sql
import { readFileSync, writeFileSync } from "node:fs";

const demo = JSON.parse(readFileSync(new URL("../lib/data/seed/demo.json", import.meta.url), "utf8"));

const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const arr = (a) => (a.length ? `array[${a.map(q).join(", ")}]::text[]` : `'{}'::text[]`);
const hace = (horas) => `v_ahora - interval '${Math.round(horas * 60)} minutes'`;

const l = [];
l.push(`-- GENERADO por scripts/gen-seed-sql.mjs desde lib/data/seed/demo.json. No editar a mano.
--
-- Define public.kairos_seed_demo(p_agent): borra los datos de ese agente y carga
-- los del prototipo. No hay ids fijos: todo queda con el agent_id recibido.
--
-- Uso, con el id de un usuario ya registrado:
--   select public.kairos_seed_demo('<uuid del agente>');

create or replace function public.kairos_seed_demo(p_agent uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_ahora timestamptz := now();
  v_buyer uuid;
  v_note uuid;
  v_contacto timestamptz;
begin
  if not exists (select 1 from public.agents where id = p_agent) then
    raise exception 'No existe el agente %', p_agent;
  end if;

  delete from public.matches where agent_id = p_agent;
  delete from public.discards where agent_id = p_agent;
  delete from public.notes where agent_id = p_agent;
  delete from public.buyers where agent_id = p_agent;
  delete from public.properties where agent_id = p_agent;

  update public.agents
     set name = ${q(demo.agent.name)}, phone = ${q(demo.agent.phone)},
         office = ${q(demo.agent.office)}, work_zone = ${q(demo.agent.work_zone)}
   where id = p_agent;

  create temporary table _prop (clave text primary key, id uuid not null) on commit drop;
  create temporary table _buyer (clave text primary key, id uuid not null) on commit drop;
`);

l.push("  -- Propiedades");
for (const p of demo.properties) {
  l.push(`  with nueva as (
    insert into public.properties (agent_id, source, portal, operation, property_type, address, neighborhood, subzone,
      price, currency, expenses, rooms, bedrooms, covered_m2, total_m2, floor, orientation, balcony, on_avenue,
      credit_eligible, amenities, photos, description, published_at, created_at)
    values (p_agent, 'demo', ${q(p.portal)}, 'buy', ${q(p.type)}, ${q(p.address)}, ${q(p.neighborhood)}, ${q(p.subzone)},
      ${p.price}, 'USD', ${p.expenses ?? "null"}, ${p.rooms}, ${p.bedrooms ?? "null"}, ${p.covered_m2 ?? "null"}, ${p.total_m2 ?? "null"}, ${p.floor ?? "null"}, ${q(p.orientation)}, ${p.balcony}, ${p.on_avenue},
      ${q(p.credit)}, ${arr(p.amenities)}, ${arr(p.photo ? [p.photo] : [])}, ${q(p.description)}, ${hace(p.hours_ago)}, ${hace(p.hours_ago)})
    returning id
  ) insert into _prop select ${q(p.key)}, id from nueva;`);
}

l.push("\n  -- Clientes, fichas, notas y descartes");
for (const b of demo.buyers) {
  const c = b.criteria;
  l.push(`  v_contacto := v_ahora - interval '${b.days_since_contact} days' - interval '5 minutes';
  insert into public.buyers (agent_id, name, phone, email, status, last_contact_at, summary, created_at)
  values (p_agent, ${q(b.name)}, ${q(b.phone)}, ${q(b.email.toLowerCase())}, ${q(b.status)}, v_contacto, ${q(b.summary)}, v_contacto)
  returning id into v_buyer;
  insert into _buyer values (${q(b.key)}, v_buyer);
  v_note := null;`);
  if (b.note) {
    l.push(`  insert into public.notes (agent_id, buyer_id, kind, duration_seconds, transcript, created_at)
  values (p_agent, v_buyer, ${q(b.note.kind)}, ${b.note.duration_seconds}, ${q(b.note.transcript)}, v_contacto)
  returning id into v_note;`);
  }
  l.push(`  insert into public.buyer_criteria (buyer_id, agent_id, operation, property_type, rooms_min, rooms_max, bedrooms,
    neighborhood, subzones, currency, budget_max, budget_tolerance_pct, financing, move_by,
    must_haves, nice_to_haves, deal_breakers, source_note_id, updated_at)
  values (v_buyer, p_agent, ${q(c.operation)}, ${q(c.property_type)}, ${c.rooms_min ?? "null"}, ${c.rooms_max ?? "null"}, ${c.bedrooms ?? "null"},
    ${q(c.neighborhood)}, ${arr(c.subzones)}, ${q(c.currency)}, ${c.budget_max ?? "null"}, ${c.budget_tolerance_pct}, ${q(c.financing)}, ${q(c.move_by)},
    ${arr(c.must_haves)}, ${arr(c.nice_to_haves)}, ${arr(c.deal_breakers)}, v_note, v_contacto);`);
  for (const d of b.discards) {
    l.push(`  insert into public.discards (agent_id, buyer_id, property_id, reason, created_at)
  values (p_agent, v_buyer, (select id from _prop where clave = ${q(d.property)}), ${q(d.reason)}, v_contacto);`);
  }
  l.push("");
}

l.push("  -- Oportunidades");
for (const m of demo.matches) {
  l.push(`  insert into public.matches (agent_id, buyer_id, property_id, score, reasons, status, notified_at, sent_at, created_at)
  values (p_agent, (select id from _buyer where clave = ${q(m.buyer)}), (select id from _prop where clave = ${q(m.property)}),
    ${m.score}, ${q(JSON.stringify(m.reasons))}::jsonb, ${q(m.status)}, ${hace(m.hours_ago)},
    ${m.status === "sent" ? "v_ahora - interval '1 minute'" : "null"}, ${hace(m.hours_ago)});`);
}

l.push(`end;
$$;

-- Solo el propio agente puede sembrar su cuenta.
revoke all on function public.kairos_seed_demo(uuid) from public, anon;
grant execute on function public.kairos_seed_demo(uuid) to authenticated, service_role;
`);

writeFileSync(new URL("../supabase/seed.sql", import.meta.url), l.join("\n"));
console.log(`supabase/seed.sql: ${demo.properties.length} propiedades, ${demo.buyers.length} clientes, ${demo.matches.length} oportunidades`);
