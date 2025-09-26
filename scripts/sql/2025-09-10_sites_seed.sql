-- Seed de sedes con geo y radios (idempotente)
-- Si NO tienes unique(name), usa el UPDATE+INSERT en dos pasos (ver abajo).

-- Asegura columnas
alter table sites
  add column if not exists is_active boolean default true,
  add column if not exists radius_m integer default 150;

-- (OPCIONAL) hacer name único para simplificar futuros upserts
-- alter table sites add constraint sites_name_unique unique (name);

-- UPSERT por nombre (requiere unique(name))
insert into sites (name, lat, lng, radius_m, is_active)
values
  ('Cochabamba', -17.3986667, -66.1713056, 150, true),
  ('La Paz',     -16.5313380, -68.0981670, 200, true),
  ('Sucre',      -19.0465790, -65.2417980, 150, true),
  ('Santa Cruz', -17.7793980, -63.1628840, 200, true),
  ('El Alto',    -16.5250490, -68.1572420, 200, true)
on conflict (name) do update
set lat       = excluded.lat,
    lng       = excluded.lng,
    radius_m  = excluded.radius_m,
    is_active = excluded.is_active;

-- Si NO puedes hacer unique(name), usa esta alternativa idempotente:
-- 1) UPDATE existentes
-- update sites s set
--   lat       = v.lat,
--   lng       = v.lng,
--   radius_m  = v.radius_m,
--   is_active = v.is_active
-- from (
--   values
--     ('Cochabamba', -17.3986667, -66.1713056, 150, true),
--     ('La Paz',     -16.5313380, -68.0981670, 200, true),
--     ('Sucre',      -19.0465790, -65.2417980, 150, true),
--     ('Santa Cruz', -17.7793980, -63.1628840, 200, true),
--     ('El Alto',    -16.5250490, -68.1572420, 200, true)
-- ) as v(name, lat, lng, radius_m, is_active)
-- where s.name = v.name;
--
-- 2) INSERT faltantes
-- insert into sites (name, lat, lng, radius_m, is_active)
-- select v.name, v.lat, v.lng, v.radius_m, v.is_active
-- from (
--   values
--     ('Cochabamba', -17.3986667, -66.1713056, 150, true),
--     ('La Paz',     -16.5313380, -68.0981670, 200, true),
--     ('Sucre',      -19.0465790, -65.2417980, 150, true),
--     ('Santa Cruz', -17.7793980, -63.1628840, 200, true),
--     ('El Alto',    -16.5250490, -68.1572420, 200, true)
-- ) as v(name, lat, lng, radius_m, is_active)
-- left join sites s on s.name = v.name
-- where s.id is null;