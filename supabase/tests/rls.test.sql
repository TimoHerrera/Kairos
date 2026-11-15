-- Tests de RLS con pgTAP: cada agente ve solo lo suyo.
-- Correr con: supabase test db   (necesita Supabase local, que usa Docker)
begin;
select plan(14);

-- Dos agentes. El trigger on_auth_user_created les crea el perfil.
insert into auth.users (id, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-00000000000a', 'ana@example.com', '{"name": "Ana"}'),
  ('00000000-0000-0000-0000-00000000000b', 'beto@example.com', '{"name": "Beto"}');

select is((select count(*)::int from public.agents), 2, 'el trigger crea un perfil por usuario');

-- Datos de cada uno, cargados como superusuario.
insert into public.buyers (id, agent_id, name, email) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Cliente de Ana', 'cliente@example.com'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'Cliente de Beto', 'cliente@example.com');
insert into public.properties (id, agent_id, address, neighborhood, price, rooms) values
  ('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Gorriti 4800', 'Palermo', 172000, 3),
  ('20000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'Acevedo 500', 'Villa Crespo', 118000, 2);

select pass('dos agentes pueden tener un cliente con el mismo email');

-- Sin sesión no se ve nada.
set local role anon;
select is((select count(*)::int from public.buyers), 0, 'anon no ve clientes');
select is((select count(*)::int from public.properties), 0, 'anon no ve propiedades');
reset role;

-- Ana.
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select is((select count(*)::int from public.agents), 1, 'Ana ve solo su perfil');
select results_eq(
  'select name from public.buyers', array['Cliente de Ana'], 'Ana ve solo sus clientes'
);
select results_eq(
  'select address from public.properties', array['Gorriti 4800'], 'Ana ve solo sus propiedades'
);

select is_empty(
  $$update public.buyers set name = 'Tocado' where id = '10000000-0000-0000-0000-00000000000b' returning id$$,
  'Ana no puede editar un cliente de Beto'
);
select is_empty(
  $$delete from public.buyers where id = '10000000-0000-0000-0000-00000000000b' returning id$$,
  'Ana no puede borrar un cliente de Beto'
);
select throws_ok(
  $$insert into public.buyers (agent_id, name) values ('00000000-0000-0000-0000-00000000000b', 'Infiltrado')$$,
  '42501', null, 'Ana no puede crear un cliente a nombre de Beto'
);
select throws_ok(
  $$insert into public.notes (buyer_id, kind, transcript) values ('10000000-0000-0000-0000-00000000000b', 'text', 'x')$$,
  '42501', null, 'Ana no puede colgar una nota en un cliente de Beto'
);
select throws_ok(
  $$insert into public.matches (buyer_id, property_id, score)
    values ('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000b', 90)$$,
  '42501', null, 'Ana no puede armar una oportunidad con una propiedad de Beto'
);
select throws_ok(
  $$insert into public.buyers (name, email) values ('Repetido', 'cliente@example.com')$$,
  '23505', null, 'el email de un cliente no se repite dentro del mismo agente'
);

-- Beto sigue teniendo lo suyo intacto.
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select results_eq(
  'select name from public.buyers', array['Cliente de Beto'], 'el cliente de Beto sigue intacto'
);

select * from finish();
rollback;
