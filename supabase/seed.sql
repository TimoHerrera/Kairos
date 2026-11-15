-- GENERADO por scripts/gen-seed-sql.mjs desde lib/data/seed/demo.json. No editar a mano.
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
     set name = 'Lucía F.', phone = '5491155550100',
         office = 'RE/MAX Palermo', work_zone = 'Palermo, Villa Crespo, Belgrano'
   where id = p_agent;

  create temporary table _prop (clave text primary key, id uuid not null) on commit drop;
  create temporary table _buyer (clave text primary key, id uuid not null) on commit drop;

  -- Propiedades
  with nueva as (
    insert into public.properties (agent_id, source, portal, operation, property_type, address, neighborhood, subzone,
      price, currency, expenses, rooms, bedrooms, covered_m2, total_m2, floor, orientation, balcony, on_avenue,
      credit_eligible, amenities, photos, description, published_at, created_at)
    values (p_agent, 'demo', 'zonaprop', 'buy', 'apartment', 'Gorriti 4800', 'Palermo', 'Soho',
      172000, 'USD', 185000, 3, 2, 72, 78, 4, 'Norte', true, false,
      'unconfirmed', array['luminoso', 'ascensor']::text[], array['/props/living-1.svg']::text[], '3 ambientes con balcón al frente sobre calle tranquila. Orientación norte, muy luminoso.', v_ahora - interval '4 minutes', v_ahora - interval '4 minutes')
    returning id
  ) insert into _prop select 'gorriti_4800', id from nueva;
  with nueva as (
    insert into public.properties (agent_id, source, portal, operation, property_type, address, neighborhood, subzone,
      price, currency, expenses, rooms, bedrooms, covered_m2, total_m2, floor, orientation, balcony, on_avenue,
      credit_eligible, amenities, photos, description, published_at, created_at)
    values (p_agent, 'demo', 'zonaprop', 'buy', 'apartment', 'Av. Santa Fe 3900', 'Palermo', 'Botánico',
      176000, 'USD', 210000, 3, 2, 75, 79, 6, 'Sur', true, true,
      'yes', array['ascensor']::text[], array['/props/living-2.svg']::text[], '3 ambientes al frente sobre Av. Santa Fe, a metros del subte.', v_ahora - interval '28800 minutes', v_ahora - interval '28800 minutes')
    returning id
  ) insert into _prop select 'santa_fe_3900', id from nueva;
  with nueva as (
    insert into public.properties (agent_id, source, portal, operation, property_type, address, neighborhood, subzone,
      price, currency, expenses, rooms, bedrooms, covered_m2, total_m2, floor, orientation, balcony, on_avenue,
      credit_eligible, amenities, photos, description, published_at, created_at)
    values (p_agent, 'demo', 'argenprop', 'buy', 'apartment', 'Thames 1700', 'Palermo', 'Soho',
      168000, 'USD', 120000, 3, 2, 70, 82, 0, 'Este', false, false,
      'yes', array['patio']::text[], array['/props/living-3.svg']::text[], '3 ambientes en planta baja con patio propio.', v_ahora - interval '1800 minutes', v_ahora - interval '1800 minutes')
    returning id
  ) insert into _prop select 'thames_1700', id from nueva;
  with nueva as (
    insert into public.properties (agent_id, source, portal, operation, property_type, address, neighborhood, subzone,
      price, currency, expenses, rooms, bedrooms, covered_m2, total_m2, floor, orientation, balcony, on_avenue,
      credit_eligible, amenities, photos, description, published_at, created_at)
    values (p_agent, 'demo', 'zonaprop', 'buy', 'apartment', 'Acevedo 500', 'Villa Crespo', null,
      118000, 'USD', 95000, 2, 1, 46, 50, 5, 'Noreste', true, false,
      'yes', array['luminoso', 'ascensor']::text[], '{}'::text[], '2 ambientes luminoso con balcón, edificio de 10 años.', v_ahora - interval '120 minutes', v_ahora - interval '120 minutes')
    returning id
  ) insert into _prop select 'acevedo_500', id from nueva;
  with nueva as (
    insert into public.properties (agent_id, source, portal, operation, property_type, address, neighborhood, subzone,
      price, currency, expenses, rooms, bedrooms, covered_m2, total_m2, floor, orientation, balcony, on_avenue,
      credit_eligible, amenities, photos, description, published_at, created_at)
    values (p_agent, 'demo', 'argenprop', 'buy', 'house', 'Echeverría 3600', 'Belgrano', 'Belgrano R',
      410000, 'USD', null, 5, 3, 190, 310, null, 'Norte', false, false,
      'unconfirmed', array['jardin', 'cochera']::text[], '{}'::text[], 'Casa de 5 ambientes con jardín y cochera en Belgrano R.', v_ahora - interval '1560 minutes', v_ahora - interval '1560 minutes')
    returning id
  ) insert into _prop select 'echeverria_3600', id from nueva;
  with nueva as (
    insert into public.properties (agent_id, source, portal, operation, property_type, address, neighborhood, subzone,
      price, currency, expenses, rooms, bedrooms, covered_m2, total_m2, floor, orientation, balcony, on_avenue,
      credit_eligible, amenities, photos, description, published_at, created_at)
    values (p_agent, 'demo', 'zonaprop', 'buy', 'apartment', 'Honduras 5200', 'Palermo', 'Hollywood',
      195000, 'USD', 230000, 3, 2, 80, 88, 7, 'Norte', true, false,
      'yes', array['luminoso', 'pileta', 'ascensor']::text[], '{}'::text[], '3 ambientes con amenities en Palermo Hollywood.', v_ahora - interval '4320 minutes', v_ahora - interval '4320 minutes')
    returning id
  ) insert into _prop select 'honduras_5200', id from nueva;
  with nueva as (
    insert into public.properties (agent_id, source, portal, operation, property_type, address, neighborhood, subzone,
      price, currency, expenses, rooms, bedrooms, covered_m2, total_m2, floor, orientation, balcony, on_avenue,
      credit_eligible, amenities, photos, description, published_at, created_at)
    values (p_agent, 'demo', 'mercadolibre', 'buy', 'apartment', 'El Salvador 4600', 'Palermo', 'Soho',
      135000, 'USD', 140000, 2, 1, 48, 52, 3, 'Oeste', true, false,
      'yes', array['ascensor']::text[], '{}'::text[], '2 ambientes con balcón en el corazón de Soho.', v_ahora - interval '5760 minutes', v_ahora - interval '5760 minutes')
    returning id
  ) insert into _prop select 'el_salvador_4600', id from nueva;
  with nueva as (
    insert into public.properties (agent_id, source, portal, operation, property_type, address, neighborhood, subzone,
      price, currency, expenses, rooms, bedrooms, covered_m2, total_m2, floor, orientation, balcony, on_avenue,
      credit_eligible, amenities, photos, description, published_at, created_at)
    values (p_agent, 'demo', 'zonaprop', 'buy', 'apartment', 'Av. Córdoba 5400', 'Palermo', 'Hollywood',
      158000, 'USD', 175000, 3, 2, 68, 72, 2, 'Sur', true, true,
      'yes', array['ascensor']::text[], '{}'::text[], '3 ambientes al frente sobre Av. Córdoba.', v_ahora - interval '7200 minutes', v_ahora - interval '7200 minutes')
    returning id
  ) insert into _prop select 'cordoba_5400', id from nueva;
  with nueva as (
    insert into public.properties (agent_id, source, portal, operation, property_type, address, neighborhood, subzone,
      price, currency, expenses, rooms, bedrooms, covered_m2, total_m2, floor, orientation, balcony, on_avenue,
      credit_eligible, amenities, photos, description, published_at, created_at)
    values (p_agent, 'demo', 'argenprop', 'buy', 'apartment', 'Ugarteche 3100', 'Palermo', 'Chico',
      340000, 'USD', 420000, 4, 3, 130, 140, 8, 'Norte', true, false,
      'no', array['luminoso', 'cochera', 'ascensor']::text[], '{}'::text[], '4 ambientes con dependencia y cochera en Palermo Chico.', v_ahora - interval '12000 minutes', v_ahora - interval '12000 minutes')
    returning id
  ) insert into _prop select 'ugarteche_3100', id from nueva;
  with nueva as (
    insert into public.properties (agent_id, source, portal, operation, property_type, address, neighborhood, subzone,
      price, currency, expenses, rooms, bedrooms, covered_m2, total_m2, floor, orientation, balcony, on_avenue,
      credit_eligible, amenities, photos, description, published_at, created_at)
    values (p_agent, 'demo', 'mercadolibre', 'buy', 'apartment', 'Malabia 900', 'Villa Crespo', null,
      99000, 'USD', 70000, 2, 1, 42, 42, 1, 'Sur', false, false,
      'yes', array['a_refaccionar', 'contrafrente']::text[], '{}'::text[], '2 ambientes al contrafrente, a refaccionar.', v_ahora - interval '9000 minutes', v_ahora - interval '9000 minutes')
    returning id
  ) insert into _prop select 'malabia_900', id from nueva;
  with nueva as (
    insert into public.properties (agent_id, source, portal, operation, property_type, address, neighborhood, subzone,
      price, currency, expenses, rooms, bedrooms, covered_m2, total_m2, floor, orientation, balcony, on_avenue,
      credit_eligible, amenities, photos, description, published_at, created_at)
    values (p_agent, 'demo', 'zonaprop', 'buy', 'apartment', 'Av. Corrientes 5300', 'Villa Crespo', null,
      112000, 'USD', 110000, 2, 1, 45, 48, 9, 'Norte', true, true,
      'yes', array['luminoso', 'ascensor']::text[], '{}'::text[], '2 ambientes con vista abierta sobre Av. Corrientes.', v_ahora - interval '18000 minutes', v_ahora - interval '18000 minutes')
    returning id
  ) insert into _prop select 'corrientes_5300', id from nueva;
  with nueva as (
    insert into public.properties (agent_id, source, portal, operation, property_type, address, neighborhood, subzone,
      price, currency, expenses, rooms, bedrooms, covered_m2, total_m2, floor, orientation, balcony, on_avenue,
      credit_eligible, amenities, photos, description, published_at, created_at)
    values (p_agent, 'demo', 'argenprop', 'buy', 'ph', 'Vera 700', 'Villa Crespo', null,
      165000, 'USD', 15000, 3, 2, 78, 105, 0, 'Este', false, false,
      'unconfirmed', array['patio', 'terraza']::text[], '{}'::text[], 'PH de 3 ambientes con patio y terraza, sin expensas altas.', v_ahora - interval '5400 minutes', v_ahora - interval '5400 minutes')
    returning id
  ) insert into _prop select 'vera_700', id from nueva;
  with nueva as (
    insert into public.properties (agent_id, source, portal, operation, property_type, address, neighborhood, subzone,
      price, currency, expenses, rooms, bedrooms, covered_m2, total_m2, floor, orientation, balcony, on_avenue,
      credit_eligible, amenities, photos, description, published_at, created_at)
    values (p_agent, 'demo', 'zonaprop', 'buy', 'house', 'Conesa 2100', 'Belgrano', 'Belgrano R',
      520000, 'USD', null, 6, 4, 240, 380, null, 'Noroeste', false, false,
      'no', array['jardin', 'pileta', 'cochera']::text[], '{}'::text[], 'Casa de 6 ambientes con jardín y pileta.', v_ahora - interval '24000 minutes', v_ahora - interval '24000 minutes')
    returning id
  ) insert into _prop select 'conesa_2100', id from nueva;
  with nueva as (
    insert into public.properties (agent_id, source, portal, operation, property_type, address, neighborhood, subzone,
      price, currency, expenses, rooms, bedrooms, covered_m2, total_m2, floor, orientation, balcony, on_avenue,
      credit_eligible, amenities, photos, description, published_at, created_at)
    values (p_agent, 'demo', 'zonaprop', 'buy', 'apartment', 'Av. Cabildo 2300', 'Belgrano', 'Belgrano C',
      185000, 'USD', 240000, 3, 2, 76, 80, 11, 'Este', true, true,
      'yes', array['ascensor', 'luminoso']::text[], '{}'::text[], '3 ambientes en piso alto sobre Av. Cabildo.', v_ahora - interval '15000 minutes', v_ahora - interval '15000 minutes')
    returning id
  ) insert into _prop select 'cabildo_2300', id from nueva;
  with nueva as (
    insert into public.properties (agent_id, source, portal, operation, property_type, address, neighborhood, subzone,
      price, currency, expenses, rooms, bedrooms, covered_m2, total_m2, floor, orientation, balcony, on_avenue,
      credit_eligible, amenities, photos, description, published_at, created_at)
    values (p_agent, 'demo', 'argenprop', 'buy', 'apartment', 'Juramento 3200', 'Belgrano', 'Belgrano R',
      285000, 'USD', 310000, 4, 3, 115, 125, 3, 'Norte', true, false,
      'yes', array['cochera', 'ascensor']::text[], '{}'::text[], '4 ambientes con cochera a metros de la estación.', v_ahora - interval '10800 minutes', v_ahora - interval '10800 minutes')
    returning id
  ) insert into _prop select 'juramento_3200', id from nueva;
  with nueva as (
    insert into public.properties (agent_id, source, portal, operation, property_type, address, neighborhood, subzone,
      price, currency, expenses, rooms, bedrooms, covered_m2, total_m2, floor, orientation, balcony, on_avenue,
      credit_eligible, amenities, photos, description, published_at, created_at)
    values (p_agent, 'demo', 'zonaprop', 'buy', 'apartment', 'Rojas 400', 'Caballito', null,
      104000, 'USD', 88000, 2, 1, 44, 47, 6, 'Norte', true, false,
      'yes', array['luminoso', 'ascensor']::text[], '{}'::text[], '2 ambientes con balcón cerca de Parque Centenario.', v_ahora - interval '3600 minutes', v_ahora - interval '3600 minutes')
    returning id
  ) insert into _prop select 'rojas_400', id from nueva;
  with nueva as (
    insert into public.properties (agent_id, source, portal, operation, property_type, address, neighborhood, subzone,
      price, currency, expenses, rooms, bedrooms, covered_m2, total_m2, floor, orientation, balcony, on_avenue,
      credit_eligible, amenities, photos, description, published_at, created_at)
    values (p_agent, 'demo', 'mercadolibre', 'buy', 'apartment', 'Av. Rivadavia 5100', 'Caballito', null,
      142000, 'USD', 150000, 3, 2, 70, 74, 4, 'Sur', true, true,
      'yes', array['ascensor']::text[], '{}'::text[], '3 ambientes sobre Av. Rivadavia, a una cuadra del subte A.', v_ahora - interval '19800 minutes', v_ahora - interval '19800 minutes')
    returning id
  ) insert into _prop select 'rivadavia_5100', id from nueva;
  with nueva as (
    insert into public.properties (agent_id, source, portal, operation, property_type, address, neighborhood, subzone,
      price, currency, expenses, rooms, bedrooms, covered_m2, total_m2, floor, orientation, balcony, on_avenue,
      credit_eligible, amenities, photos, description, published_at, created_at)
    values (p_agent, 'demo', 'argenprop', 'buy', 'ph', 'Yerbal 1200', 'Caballito', null,
      198000, 'USD', 12000, 4, 3, 110, 150, 0, 'Norte', false, false,
      'unconfirmed', array['patio', 'terraza', 'mascotas']::text[], '{}'::text[], 'PH de 4 ambientes con patio y terraza propia.', v_ahora - interval '30000 minutes', v_ahora - interval '30000 minutes')
    returning id
  ) insert into _prop select 'yerbal_1200', id from nueva;
  with nueva as (
    insert into public.properties (agent_id, source, portal, operation, property_type, address, neighborhood, subzone,
      price, currency, expenses, rooms, bedrooms, covered_m2, total_m2, floor, orientation, balcony, on_avenue,
      credit_eligible, amenities, photos, description, published_at, created_at)
    values (p_agent, 'demo', 'zonaprop', 'buy', 'ph', 'Zabala 3300', 'Colegiales', null,
      205000, 'USD', 18000, 3, 2, 85, 120, 0, 'Norte', false, false,
      'yes', array['patio', 'terraza', 'luminoso']::text[], '{}'::text[], 'PH de 3 ambientes al frente con patio y terraza.', v_ahora - interval '8400 minutes', v_ahora - interval '8400 minutes')
    returning id
  ) insert into _prop select 'zabala_3300', id from nueva;
  with nueva as (
    insert into public.properties (agent_id, source, portal, operation, property_type, address, neighborhood, subzone,
      price, currency, expenses, rooms, bedrooms, covered_m2, total_m2, floor, orientation, balcony, on_avenue,
      credit_eligible, amenities, photos, description, published_at, created_at)
    values (p_agent, 'demo', 'zonaprop', 'buy', 'apartment', 'Av. Federico Lacroze 2900', 'Colegiales', null,
      128000, 'USD', 125000, 2, 1, 50, 54, 5, 'Oeste', true, true,
      'yes', array['ascensor']::text[], '{}'::text[], '2 ambientes amplio sobre Lacroze.', v_ahora - interval '13200 minutes', v_ahora - interval '13200 minutes')
    returning id
  ) insert into _prop select 'lacroze_2900', id from nueva;
  with nueva as (
    insert into public.properties (agent_id, source, portal, operation, property_type, address, neighborhood, subzone,
      price, currency, expenses, rooms, bedrooms, covered_m2, total_m2, floor, orientation, balcony, on_avenue,
      credit_eligible, amenities, photos, description, published_at, created_at)
    values (p_agent, 'demo', 'argenprop', 'buy', 'ph', 'Conde 800', 'Colegiales', null,
      260000, 'USD', 20000, 4, 3, 120, 165, 0, 'Este', false, false,
      'no', array['patio', 'terraza', 'cochera']::text[], '{}'::text[], 'PH reciclado de 4 ambientes con cochera.', v_ahora - interval '24600 minutes', v_ahora - interval '24600 minutes')
    returning id
  ) insert into _prop select 'conde_800', id from nueva;
  with nueva as (
    insert into public.properties (agent_id, source, portal, operation, property_type, address, neighborhood, subzone,
      price, currency, expenses, rooms, bedrooms, covered_m2, total_m2, floor, orientation, balcony, on_avenue,
      credit_eligible, amenities, photos, description, published_at, created_at)
    values (p_agent, 'demo', 'zonaprop', 'buy', 'apartment', 'Olleros 1800', 'Belgrano', 'Las Cañitas',
      149000, 'USD', 190000, 2, 1, 52, 58, 10, 'Norte', true, false,
      'yes', array['pileta', 'luminoso', 'ascensor']::text[], '{}'::text[], '2 ambientes con amenities en Las Cañitas.', v_ahora - interval '6600 minutes', v_ahora - interval '6600 minutes')
    returning id
  ) insert into _prop select 'olleros_1800', id from nueva;
  with nueva as (
    insert into public.properties (agent_id, source, portal, operation, property_type, address, neighborhood, subzone,
      price, currency, expenses, rooms, bedrooms, covered_m2, total_m2, floor, orientation, balcony, on_avenue,
      credit_eligible, amenities, photos, description, published_at, created_at)
    values (p_agent, 'demo', 'mercadolibre', 'buy', 'apartment', 'La Pampa 2700', 'Belgrano', 'Belgrano C',
      210000, 'USD', 260000, 3, 2, 84, 90, 5, 'Noreste', true, false,
      'yes', array['cochera', 'ascensor', 'luminoso']::text[], '{}'::text[], '3 ambientes con cochera fija.', v_ahora - interval '16200 minutes', v_ahora - interval '16200 minutes')
    returning id
  ) insert into _prop select 'pampa_2700', id from nueva;
  with nueva as (
    insert into public.properties (agent_id, source, portal, operation, property_type, address, neighborhood, subzone,
      price, currency, expenses, rooms, bedrooms, covered_m2, total_m2, floor, orientation, balcony, on_avenue,
      credit_eligible, amenities, photos, description, published_at, created_at)
    values (p_agent, 'demo', 'zonaprop', 'buy', 'apartment', 'Núñez 2400', 'Núñez', null,
      178000, 'USD', 200000, 3, 2, 74, 80, 2, 'Norte', true, false,
      'yes', array['ascensor', 'silencioso']::text[], '{}'::text[], '3 ambientes sobre calle arbolada y silenciosa.', v_ahora - interval '21000 minutes', v_ahora - interval '21000 minutes')
    returning id
  ) insert into _prop select 'nunez_2400', id from nueva;
  with nueva as (
    insert into public.properties (agent_id, source, portal, operation, property_type, address, neighborhood, subzone,
      price, currency, expenses, rooms, bedrooms, covered_m2, total_m2, floor, orientation, balcony, on_avenue,
      credit_eligible, amenities, photos, description, published_at, created_at)
    values (p_agent, 'demo', 'argenprop', 'buy', 'house', 'Arcos 3500', 'Núñez', null,
      365000, 'USD', null, 4, 3, 160, 220, null, 'Este', false, false,
      'unconfirmed', array['jardin', 'cochera']::text[], '{}'::text[], 'Casa de 4 ambientes con jardín al fondo.', v_ahora - interval '36000 minutes', v_ahora - interval '36000 minutes')
    returning id
  ) insert into _prop select 'arcos_3500', id from nueva;
  with nueva as (
    insert into public.properties (agent_id, source, portal, operation, property_type, address, neighborhood, subzone,
      price, currency, expenses, rooms, bedrooms, covered_m2, total_m2, floor, orientation, balcony, on_avenue,
      credit_eligible, amenities, photos, description, published_at, created_at)
    values (p_agent, 'demo', 'zonaprop', 'buy', 'apartment', 'Guardia Vieja 4200', 'Almagro', null,
      139000, 'USD', 130000, 3, 2, 69, 73, 3, 'Norte', true, false,
      'yes', array['luminoso', 'ascensor']::text[], '{}'::text[], '3 ambientes luminoso con balcón corrido.', v_ahora - interval '9600 minutes', v_ahora - interval '9600 minutes')
    returning id
  ) insert into _prop select 'guardia_vieja_4200', id from nueva;
  with nueva as (
    insert into public.properties (agent_id, source, portal, operation, property_type, address, neighborhood, subzone,
      price, currency, expenses, rooms, bedrooms, covered_m2, total_m2, floor, orientation, balcony, on_avenue,
      credit_eligible, amenities, photos, description, published_at, created_at)
    values (p_agent, 'demo', 'mercadolibre', 'buy', 'apartment', 'Av. Medrano 600', 'Almagro', null,
      92000, 'USD', 90000, 2, 1, 40, 43, 7, 'Sur', true, true,
      'yes', array['ascensor']::text[], '{}'::text[], '2 ambientes sobre Av. Medrano.', v_ahora - interval '25200 minutes', v_ahora - interval '25200 minutes')
    returning id
  ) insert into _prop select 'medrano_600', id from nueva;
  with nueva as (
    insert into public.properties (agent_id, source, portal, operation, property_type, address, neighborhood, subzone,
      price, currency, expenses, rooms, bedrooms, covered_m2, total_m2, floor, orientation, balcony, on_avenue,
      credit_eligible, amenities, photos, description, published_at, created_at)
    values (p_agent, 'demo', 'argenprop', 'buy', 'apartment', 'Charcas 4100', 'Palermo', 'Botánico',
      188000, 'USD', 220000, 3, 2, 77, 82, 6, 'Norte', true, false,
      'yes', array['luminoso', 'ascensor']::text[], '{}'::text[], '3 ambientes luminoso cerca del Jardín Botánico.', v_ahora - interval '13800 minutes', v_ahora - interval '13800 minutes')
    returning id
  ) insert into _prop select 'charcas_4100', id from nueva;
  with nueva as (
    insert into public.properties (agent_id, source, portal, operation, property_type, address, neighborhood, subzone,
      price, currency, expenses, rooms, bedrooms, covered_m2, total_m2, floor, orientation, balcony, on_avenue,
      credit_eligible, amenities, photos, description, published_at, created_at)
    values (p_agent, 'demo', 'zonaprop', 'buy', 'ph', 'Nicaragua 5600', 'Palermo', 'Hollywood',
      230000, 'USD', 25000, 3, 2, 90, 125, 1, 'Noroeste', false, false,
      'unconfirmed', array['terraza', 'luminoso', 'mascotas']::text[], '{}'::text[], 'PH en primer piso por escalera con terraza propia.', v_ahora - interval '18600 minutes', v_ahora - interval '18600 minutes')
    returning id
  ) insert into _prop select 'nicaragua_5600', id from nueva;
  with nueva as (
    insert into public.properties (agent_id, source, portal, operation, property_type, address, neighborhood, subzone,
      price, currency, expenses, rooms, bedrooms, covered_m2, total_m2, floor, orientation, balcony, on_avenue,
      credit_eligible, amenities, photos, description, published_at, created_at)
    values (p_agent, 'demo', 'zonaprop', 'buy', 'apartment', 'Aguirre 300', 'Villa Crespo', null,
      152000, 'USD', 135000, 3, 2, 71, 76, 4, 'Este', true, false,
      'yes', array['ascensor', 'luminoso']::text[], '{}'::text[], '3 ambientes con balcón, a estrenar.', v_ahora - interval '2700 minutes', v_ahora - interval '2700 minutes')
    returning id
  ) insert into _prop select 'aguirre_300', id from nueva;

  -- Clientes, fichas, notas y descartes
  v_contacto := v_ahora - interval '0 days' - interval '5 minutes';
  insert into public.buyers (agent_id, name, phone, email, status, last_contact_at, summary, created_at)
  values (p_agent, 'Martina Gómez', '5491155550101', 'martina.gomez@example.com', 'active', v_contacto, 'Busca 3 ambientes en Palermo, hasta USD 180.000', v_contacto)
  returning id into v_buyer;
  insert into _buyer values ('martina', v_buyer);
  v_note := null;
  insert into public.notes (agent_id, buyer_id, kind, duration_seconds, transcript, created_at)
  values (p_agent, v_buyer, 'audio', 24, 'Recién vi con Martina el de Thames. Le gustó la zona pero es planta baja, y no quiere. Busca 3 ambientes en Palermo, hasta 180 mil dólares, que tenga balcón y sea luminoso. Lo de Santa Fe lo descartó por el ruido. Tiene el crédito preaprobado y quiere mudarse antes de marzo.', v_contacto)
  returning id into v_note;
  insert into public.buyer_criteria (buyer_id, agent_id, operation, property_type, rooms_min, rooms_max, bedrooms,
    neighborhood, subzones, currency, budget_max, budget_tolerance_pct, financing, move_by,
    must_haves, nice_to_haves, deal_breakers, source_note_id, updated_at)
  values (v_buyer, p_agent, 'buy', 'apartment', 3, 3, 2,
    'Palermo', array['Soho', 'Hollywood', 'Chico']::text[], 'USD', 180000, 0, 'preapproved_credit', '2027-03-01',
    array['balcon', 'luminoso']::text[], '{}'::text[], array['planta_baja', 'sobre_avenida']::text[], v_note, v_contacto);
  insert into public.discards (agent_id, buyer_id, property_id, reason, created_at)
  values (p_agent, v_buyer, (select id from _prop where clave = 'santa_fe_3900'), 'Muy ruidosa, da a la avenida', v_contacto);
  insert into public.discards (agent_id, buyer_id, property_id, reason, created_at)
  values (p_agent, v_buyer, (select id from _prop where clave = 'thames_1700'), 'Es planta baja', v_contacto);

  v_contacto := v_ahora - interval '6 days' - interval '5 minutes';
  insert into public.buyers (agent_id, name, phone, email, status, last_contact_at, summary, created_at)
  values (p_agent, 'Diego Ruiz', '5491155550102', 'diego.ruiz@example.com', 'active', v_contacto, 'Busca 2 ambientes en Villa Crespo, hasta USD 125.000', v_contacto)
  returning id into v_buyer;
  insert into _buyer values ('diego', v_buyer);
  v_note := null;
  insert into public.buyer_criteria (buyer_id, agent_id, operation, property_type, rooms_min, rooms_max, bedrooms,
    neighborhood, subzones, currency, budget_max, budget_tolerance_pct, financing, move_by,
    must_haves, nice_to_haves, deal_breakers, source_note_id, updated_at)
  values (v_buyer, p_agent, 'buy', 'apartment', 2, 2, 1,
    'Villa Crespo', '{}'::text[], 'USD', 125000, 5, 'cash', null,
    array['luminoso']::text[], array['balcon']::text[], array['a_refaccionar']::text[], v_note, v_contacto);

  v_contacto := v_ahora - interval '12 days' - interval '5 minutes';
  insert into public.buyers (agent_id, name, phone, email, status, last_contact_at, summary, created_at)
  values (p_agent, 'Sofía y Pablo', '5491155550103', 'sofiaypablo@example.com', 'active', v_contacto, 'Buscan una casa en Belgrano R, hasta USD 420.000', v_contacto)
  returning id into v_buyer;
  insert into _buyer values ('sofia_pablo', v_buyer);
  v_note := null;
  insert into public.buyer_criteria (buyer_id, agent_id, operation, property_type, rooms_min, rooms_max, bedrooms,
    neighborhood, subzones, currency, budget_max, budget_tolerance_pct, financing, move_by,
    must_haves, nice_to_haves, deal_breakers, source_note_id, updated_at)
  values (v_buyer, p_agent, 'buy', 'house', 4, 6, 3,
    'Belgrano', array['Belgrano R']::text[], 'USD', 420000, 5, 'undefined', null,
    array['jardin']::text[], array['cochera', 'pileta']::text[], array['sobre_avenida']::text[], v_note, v_contacto);

  v_contacto := v_ahora - interval '125 days' - interval '5 minutes';
  insert into public.buyers (agent_id, name, phone, email, status, last_contact_at, summary, created_at)
  values (p_agent, 'Andrés Molina', '5491155550104', 'andres.molina@example.com', 'active', v_contacto, 'Buscaba 2 amb en Caballito', v_contacto)
  returning id into v_buyer;
  insert into _buyer values ('andres', v_buyer);
  v_note := null;
  insert into public.buyer_criteria (buyer_id, agent_id, operation, property_type, rooms_min, rooms_max, bedrooms,
    neighborhood, subzones, currency, budget_max, budget_tolerance_pct, financing, move_by,
    must_haves, nice_to_haves, deal_breakers, source_note_id, updated_at)
  values (v_buyer, p_agent, 'buy', 'apartment', 2, 2, 1,
    'Caballito', '{}'::text[], 'USD', 110000, 0, 'preapproved_credit', null,
    '{}'::text[], array['balcon']::text[], '{}'::text[], v_note, v_contacto);

  v_contacto := v_ahora - interval '98 days' - interval '5 minutes';
  insert into public.buyers (agent_id, name, phone, email, status, last_contact_at, summary, created_at)
  values (p_agent, 'Carla Vidal', '5491155550105', 'carla.vidal@example.com', 'active', v_contacto, 'Buscaba PH en Colegiales', v_contacto)
  returning id into v_buyer;
  insert into _buyer values ('carla', v_buyer);
  v_note := null;
  insert into public.buyer_criteria (buyer_id, agent_id, operation, property_type, rooms_min, rooms_max, bedrooms,
    neighborhood, subzones, currency, budget_max, budget_tolerance_pct, financing, move_by,
    must_haves, nice_to_haves, deal_breakers, source_note_id, updated_at)
  values (v_buyer, p_agent, 'buy', 'ph', 3, 4, 2,
    'Colegiales', '{}'::text[], 'USD', 210000, 5, 'cash', null,
    array['patio']::text[], array['terraza']::text[], '{}'::text[], v_note, v_contacto);

  -- Oportunidades
  insert into public.matches (agent_id, buyer_id, property_id, score, reasons, status, notified_at, sent_at, created_at)
  values (p_agent, (select id from _buyer where clave = 'martina'), (select id from _prop where clave = 'gorriti_4800'),
    92, '{"met":["3 ambientes en Palermo Soho","USD 172.000 — USD 8.000 por debajo de su tope","Balcón al frente","4º piso, no es planta baja","Orientación norte, muy luminoso","Calle tranquila, no es avenida"],"unmet":[],"unconfirmed":["Apto crédito: a confirmar con el propietario"],"discard_note":"No se parece a lo que descartó: evitamos avenidas y plantas bajas."}'::jsonb, 'sent', v_ahora - interval '4 minutes',
    v_ahora - interval '1 minute', v_ahora - interval '4 minutes');
  insert into public.matches (agent_id, buyer_id, property_id, score, reasons, status, notified_at, sent_at, created_at)
  values (p_agent, (select id from _buyer where clave = 'diego'), (select id from _prop where clave = 'acevedo_500'),
    88, '{"met":["2 ambientes en Villa Crespo","USD 118.000 — USD 7.000 por debajo de su tope","Muy luminoso","Tiene balcón"],"unmet":[],"unconfirmed":[],"discard_note":null}'::jsonb, 'new', v_ahora - interval '120 minutes',
    null, v_ahora - interval '120 minutes');
  insert into public.matches (agent_id, buyer_id, property_id, score, reasons, status, notified_at, sent_at, created_at)
  values (p_agent, (select id from _buyer where clave = 'sofia_pablo'), (select id from _prop where clave = 'echeverria_3600'),
    81, '{"met":["Casa de 5 ambientes en Belgrano R","USD 410.000 — USD 10.000 por debajo de su tope","Tiene jardín","Tiene cochera"],"unmet":["No tiene pileta"],"unconfirmed":[],"discard_note":null}'::jsonb, 'new', v_ahora - interval '1560 minutes',
    null, v_ahora - interval '1560 minutes');
end;
$$;

-- Solo el propio agente puede sembrar su cuenta.
revoke all on function public.kairos_seed_demo(uuid) from public, anon;
grant execute on function public.kairos_seed_demo(uuid) to authenticated, service_role;
