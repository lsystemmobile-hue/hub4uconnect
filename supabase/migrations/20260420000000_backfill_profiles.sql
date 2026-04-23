-- Cria profile para todos os usuários Auth que ainda não têm linha em profiles.
-- Necessário para usuários criados antes do trigger on_auth_user_created existir.
insert into public.profiles (id, email, full_name, role, is_active)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  'admin',
  true
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
)
on conflict (id) do nothing;
