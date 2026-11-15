-- Kairos · esquema inicial
-- Cada agente ve y escribe solo lo suyo: todas las tablas tienen agent_id
-- y una política de RLS agent_id = auth.uid().
-- Los nombres de columnas coinciden con lib/data/types.ts.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- agents: un perfil por usuario de auth
-- ---------------------------------------------------------------------------
create table public.agents (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  office text,
  work_zone text,
  settings jsonb not null default jsonb_build_object(
    'alert_threshold', 75,
    'dnd_start', null,
    'dnd_end', null,
    'delete_audio_after_transcribe', true,
    'privacy_accepted_at', null
  ),
  created_at timestamptz not null default now(),
  constraint agents_email_minusculas check (email = lower(email))
);
create unique index agents_email_unico on public.agents (email);

-- Crea el perfil cuando se registra un usuario.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.agents (id, name, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
    lower(new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- buyers: los clientes (en la interfaz, siempre "cliente")
-- ---------------------------------------------------------------------------
create table public.buyers (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null default auth.uid() references public.agents (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  phone text,
  email text,
  status text not null default 'active' check (status in ('active', 'paused', 'closed', 'lost')),
  last_contact_at timestamptz,
  summary text,
  created_at timestamptz not null default now(),
  constraint buyers_email_minusculas check (email is null or email = lower(email))
);
create index buyers_agent on public.buyers (agent_id, last_contact_at desc);
-- Email único dentro de la cartera de un mismo agente.
create unique index buyers_email_unico_por_agente on public.buyers (agent_id, email) where email is not null;

-- ---------------------------------------------------------------------------
-- notes: el historial de cada cliente
-- ---------------------------------------------------------------------------
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null default auth.uid() references public.agents (id) on delete cascade,
  buyer_id uuid not null references public.buyers (id) on delete cascade,
  kind text not null check (kind in ('audio', 'text')),
  audio_path text,
  duration_seconds integer check (duration_seconds is null or duration_seconds between 0 and 180),
  transcript text,
  extracted_json jsonb,
  changes text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index notes_buyer on public.notes (buyer_id, created_at desc);

-- ---------------------------------------------------------------------------
-- buyer_criteria: la ficha, 1 a 1 con el cliente
-- ---------------------------------------------------------------------------
create table public.buyer_criteria (
  buyer_id uuid primary key references public.buyers (id) on delete cascade,
  agent_id uuid not null default auth.uid() references public.agents (id) on delete cascade,
  operation text not null default 'buy' check (operation in ('buy', 'rent')),
  property_type text check (property_type in ('apartment', 'house', 'ph', 'land', 'commercial', 'other')),
  rooms_min integer,
  rooms_max integer,
  bedrooms integer,
  neighborhood text,
  subzones text[] not null default '{}',
  currency text not null default 'USD' check (currency in ('USD', 'ARS')),
  budget_max numeric,
  budget_tolerance_pct numeric not null default 0 check (budget_tolerance_pct between 0 and 100),
  financing text not null default 'undefined' check (financing in ('cash', 'preapproved_credit', 'undefined')),
  move_by date,
  must_haves text[] not null default '{}',
  nice_to_haves text[] not null default '{}',
  deal_breakers text[] not null default '{}',
  source_note_id uuid references public.notes (id) on delete set null,
  field_sources jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  constraint criteria_rango_ambientes check (rooms_min is null or rooms_max is null or rooms_min <= rooms_max)
);
create index buyer_criteria_agent on public.buyer_criteria (agent_id);

-- ---------------------------------------------------------------------------
-- properties
-- ---------------------------------------------------------------------------
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null default auth.uid() references public.agents (id) on delete cascade,
  source text not null default 'manual' check (source in ('manual', 'pasted', 'imported', 'demo')),
  url text,
  portal text check (portal in ('zonaprop', 'argenprop', 'mercadolibre', 'other')),
  operation text not null default 'buy' check (operation in ('buy', 'rent')),
  property_type text not null default 'apartment'
    check (property_type in ('apartment', 'house', 'ph', 'land', 'commercial', 'other')),
  address text not null,
  neighborhood text not null,
  subzone text,
  price numeric not null check (price >= 0),
  currency text not null default 'USD' check (currency in ('USD', 'ARS')),
  expenses numeric,
  rooms integer not null,
  bedrooms integer,
  covered_m2 numeric,
  total_m2 numeric,
  floor integer,
  orientation text,
  balcony boolean not null default false,
  on_avenue boolean not null default false,
  credit_eligible text not null default 'unconfirmed' check (credit_eligible in ('yes', 'no', 'unconfirmed')),
  amenities text[] not null default '{}',
  photos text[] not null default '{}',
  description text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index properties_agent on public.properties (agent_id, published_at desc);

-- ---------------------------------------------------------------------------
-- discards: lo que el cliente ya descartó, con el motivo en sus palabras
-- ---------------------------------------------------------------------------
create table public.discards (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null default auth.uid() references public.agents (id) on delete cascade,
  buyer_id uuid not null references public.buyers (id) on delete cascade,
  property_id uuid references public.properties (id) on delete set null,
  property_text text,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint discards_propiedad_o_texto check (property_id is not null or property_text is not null)
);
create index discards_buyer on public.discards (buyer_id);

-- ---------------------------------------------------------------------------
-- matches: las oportunidades
-- ---------------------------------------------------------------------------
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null default auth.uid() references public.agents (id) on delete cascade,
  buyer_id uuid not null references public.buyers (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  score integer not null check (score between 0 and 100),
  reasons jsonb not null default '{"met": [], "unmet": [], "unconfirmed": [], "discard_note": null}',
  similar_to_discard boolean not null default false,
  status text not null default 'new' check (status in ('new', 'seen', 'sent', 'dismissed')),
  notified_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (buyer_id, property_id)
);
create index matches_agent on public.matches (agent_id, created_at desc);

-- ---------------------------------------------------------------------------
-- messages: lo que se le mandó al cliente
-- ---------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null default auth.uid() references public.agents (id) on delete cascade,
  match_id uuid not null references public.matches (id) on delete cascade,
  text text not null,
  tone text not null default 'normal' check (tone in ('normal', 'shorter', 'formal')),
  sent_via text not null default 'whatsapp' check (sent_via in ('whatsapp')),
  sent_at timestamptz not null default now()
);
create index messages_match on public.messages (match_id);

-- ---------------------------------------------------------------------------
-- push_subscriptions
-- ---------------------------------------------------------------------------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null default auth.uid() references public.agents (id) on delete cascade,
  endpoint text not null,
  keys jsonb not null,
  created_at timestamptz not null default now(),
  unique (agent_id, endpoint)
);

-- ---------------------------------------------------------------------------
-- Las filas hijas no pueden apuntar a un cliente, propiedad u oportunidad de otro agente.
-- (La RLS sola no lo impide: alguien podría insertar con su agent_id y un buyer_id ajeno.)
-- ---------------------------------------------------------------------------
create function public.assert_same_agent()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  fila jsonb := to_jsonb(new);
  dueno uuid;
begin
  if fila ? 'buyer_id' and fila ->> 'buyer_id' is not null then
    select agent_id into dueno from public.buyers where id = (fila ->> 'buyer_id')::uuid;
    if dueno is distinct from new.agent_id then
      raise exception 'El cliente no pertenece a este agente' using errcode = '42501';
    end if;
  end if;
  if fila ? 'property_id' and fila ->> 'property_id' is not null then
    select agent_id into dueno from public.properties where id = (fila ->> 'property_id')::uuid;
    if dueno is distinct from new.agent_id then
      raise exception 'La propiedad no pertenece a este agente' using errcode = '42501';
    end if;
  end if;
  if fila ? 'match_id' and fila ->> 'match_id' is not null then
    select agent_id into dueno from public.matches where id = (fila ->> 'match_id')::uuid;
    if dueno is distinct from new.agent_id then
      raise exception 'La oportunidad no pertenece a este agente' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger notes_mismo_agente before insert or update on public.notes
  for each row execute function public.assert_same_agent();
create trigger buyer_criteria_mismo_agente before insert or update on public.buyer_criteria
  for each row execute function public.assert_same_agent();
create trigger discards_mismo_agente before insert or update on public.discards
  for each row execute function public.assert_same_agent();
create trigger matches_mismo_agente before insert or update on public.matches
  for each row execute function public.assert_same_agent();
create trigger messages_mismo_agente before insert or update on public.messages
  for each row execute function public.assert_same_agent();

-- ---------------------------------------------------------------------------
-- RLS: cada agente ve solo lo suyo (Ley 25.326)
-- ---------------------------------------------------------------------------
alter table public.agents enable row level security;
alter table public.buyers enable row level security;
alter table public.buyer_criteria enable row level security;
alter table public.notes enable row level security;
alter table public.properties enable row level security;
alter table public.discards enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;
alter table public.push_subscriptions enable row level security;

create policy agents_propio_ver on public.agents
  for select to authenticated using (id = (select auth.uid()));
create policy agents_propio_editar on public.agents
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- El alta la hace el trigger; el borrado, la baja de la cuenta en auth.users (cascada).

create policy buyers_propios on public.buyers
  for all to authenticated
  using (agent_id = (select auth.uid())) with check (agent_id = (select auth.uid()));
create policy buyer_criteria_propios on public.buyer_criteria
  for all to authenticated
  using (agent_id = (select auth.uid())) with check (agent_id = (select auth.uid()));
create policy notes_propias on public.notes
  for all to authenticated
  using (agent_id = (select auth.uid())) with check (agent_id = (select auth.uid()));
create policy properties_propias on public.properties
  for all to authenticated
  using (agent_id = (select auth.uid())) with check (agent_id = (select auth.uid()));
create policy discards_propios on public.discards
  for all to authenticated
  using (agent_id = (select auth.uid())) with check (agent_id = (select auth.uid()));
create policy matches_propios on public.matches
  for all to authenticated
  using (agent_id = (select auth.uid())) with check (agent_id = (select auth.uid()));
create policy messages_propios on public.messages
  for all to authenticated
  using (agent_id = (select auth.uid())) with check (agent_id = (select auth.uid()));
create policy push_subscriptions_propias on public.push_subscriptions
  for all to authenticated
  using (agent_id = (select auth.uid())) with check (agent_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Storage: audios y fotos, cada agente en su carpeta {agent_id}/...
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('audios', 'audios', false), ('fotos', 'fotos', false)
on conflict (id) do nothing;

create policy storage_carpeta_propia on storage.objects
  for all to authenticated
  using (bucket_id in ('audios', 'fotos') and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id in ('audios', 'fotos') and (storage.foldername(name))[1] = (select auth.uid())::text);
