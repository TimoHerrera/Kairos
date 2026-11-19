-- Kairos · demo anónima y borrado de cuenta (fase 7)

-- El perfil también se crea para la sesión anónima de la demo, que no tiene email.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.agents (id, name, email)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Agente'
    ),
    coalesce(lower(new.email), new.id::text || '@anonimo.kairos.app')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Borrar la cuenta (Ley 25.326, derecho de supresión): borra el usuario de auth
-- y, en cascada, el perfil y todos sus clientes, propiedades, notas y oportunidades.
-- Solo puede borrarse a sí mismo.
create or replace function public.kairos_borrar_cuenta()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'No hay una sesión iniciada';
  end if;
  delete from storage.objects where bucket_id in ('audios', 'fotos') and (storage.foldername(name))[1] = auth.uid()::text;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.kairos_borrar_cuenta() from public, anon;
grant execute on function public.kairos_borrar_cuenta() to authenticated;

-- Las cuentas anónimas de demo que nadie usa en 30 días se pueden limpiar con:
--   delete from auth.users where is_anonymous and last_sign_in_at < now() - interval '30 days';
