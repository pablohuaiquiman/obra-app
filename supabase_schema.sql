-- ============================================================
-- ESQUEMA: App multi-empresa de control de obra
-- Pega este script completo en Supabase → SQL Editor → Run
-- ============================================================

-- ============================================================
-- TABLA: empresas
-- ============================================================
create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  tipo_construccion text not null check (tipo_construccion in ('Edificio','Casa','Departamento','Urbanización')),
  avance_global numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_empresas_user_id on public.empresas(user_id);

-- ============================================================
-- TABLA: responsables
-- ============================================================
create table public.responsables (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  cargo text,
  contacto text,
  created_at timestamptz not null default now()
);
create index idx_responsables_empresa_id on public.responsables(empresa_id);

-- ============================================================
-- TABLA: etapas
-- ============================================================
create table public.etapas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  orden int not null default 0,
  responsable_id uuid references public.responsables(id) on delete set null,
  avance_porcentaje numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_etapas_empresa_id on public.etapas(empresa_id);

-- ============================================================
-- TABLA: fases
-- ============================================================
create table public.fases (
  id uuid primary key default gen_random_uuid(),
  etapa_id uuid not null references public.etapas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  orden int not null default 0,
  responsable_id uuid references public.responsables(id) on delete set null,
  avance_porcentaje numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_fases_etapa_id on public.fases(etapa_id);

-- ============================================================
-- TABLA: catalogo_partidas (catálogo GLOBAL, no por usuario)
-- ============================================================
create table public.catalogo_partidas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  created_at timestamptz not null default now()
);

insert into public.catalogo_partidas (nombre) values
  ('Excavación'),('Movimiento de tierra'),('Fundaciones'),('Radier'),
  ('Estructura de hormigón armado'),('Estructura metálica'),('Muros de contención'),
  ('Albañilería'),('Tabiquería'),('Instalación eléctrica'),('Instalación sanitaria'),
  ('Instalación de gas'),('Instalación de climatización'),('Impermeabilización'),
  ('Aislación térmica'),('Cielo falso'),('Revestimiento de muros'),('Cerámica / Porcelanato'),
  ('Pintura interior'),('Pintura exterior'),('Instalación de puertas'),('Instalación de ventanas'),
  ('Piso vinílico / flotante'),('Instalación de muebles de cocina'),
  ('Instalación de artefactos sanitarios'),('Urbanización / pavimentación'),
  ('Áreas verdes'),('Cierre perimetral'),('Aseo final'),('Entrega');

-- ============================================================
-- TABLA: partidas
-- ============================================================
create table public.partidas (
  id uuid primary key default gen_random_uuid(),
  fase_id uuid not null references public.fases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  fecha_inicio date,
  fecha_termino date,
  responsable_id uuid references public.responsables(id) on delete set null,
  avance_porcentaje numeric(5,2) not null default 0 check (avance_porcentaje between 0 and 100),
  estado text not null default 'en plazo' check (estado in ('en plazo','atrasado','completado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_partidas_fase_id on public.partidas(fase_id);
create index idx_partidas_fecha_termino on public.partidas(fecha_termino);

-- ============================================================
-- VISTA DE SOPORTE: partidas_full
-- Expone empresa_id/etapa_id/nombres ya unidos para que el cliente
-- pueda filtrar partidas de una empresa (dashboard, gantt) sin tener
-- que encadenar joins manuales contra fases/etapas en cada consulta.
-- security_invoker hace que la vista respete el RLS de las tablas base.
-- ============================================================
create view public.partidas_full
with (security_invoker = true) as
select
  p.*,
  f.nombre as fase_nombre,
  f.etapa_id,
  e.nombre as etapa_nombre,
  e.empresa_id
from public.partidas p
join public.fases f on f.id = p.fase_id
join public.etapas e on e.id = f.etapa_id;

-- ============================================================
-- RLS
-- ============================================================
alter table public.empresas enable row level security;
alter table public.responsables enable row level security;
alter table public.etapas enable row level security;
alter table public.fases enable row level security;
alter table public.partidas enable row level security;
alter table public.catalogo_partidas enable row level security;

create policy "empresas_all_own" on public.empresas for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "responsables_all_own" on public.responsables for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "etapas_all_own" on public.etapas for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "fases_all_own" on public.fases for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "partidas_all_own" on public.partidas for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- catalogo_partidas: global, lectura/inserción para cualquier usuario autenticado
-- (así "escribir una partida nueva" la suma al catálogo sin fricción)
create policy "catalogo_select_all" on public.catalogo_partidas for select
  using (auth.role() = 'authenticated');
create policy "catalogo_insert_all" on public.catalogo_partidas for insert
  with check (auth.role() = 'authenticated');

-- ============================================================
-- TRIGGERS: poblar user_id automáticamente en tablas hijas desde el padre
-- ============================================================
create or replace function public.fn_set_user_id_from_empresa()
returns trigger language plpgsql as $$
begin
  select user_id into new.user_id from public.empresas where id = new.empresa_id;
  return new;
end; $$;
create trigger trg_responsables_set_user_id before insert on public.responsables
  for each row execute function public.fn_set_user_id_from_empresa();
create trigger trg_etapas_set_user_id before insert on public.etapas
  for each row execute function public.fn_set_user_id_from_empresa();

create or replace function public.fn_set_user_id_from_etapa()
returns trigger language plpgsql as $$
begin
  select user_id into new.user_id from public.etapas where id = new.etapa_id;
  return new;
end; $$;
create trigger trg_fases_set_user_id before insert on public.fases
  for each row execute function public.fn_set_user_id_from_etapa();

create or replace function public.fn_set_user_id_from_fase()
returns trigger language plpgsql as $$
begin
  select user_id into new.user_id from public.fases where id = new.fase_id;
  return new;
end; $$;
create trigger trg_partidas_set_user_id before insert on public.partidas
  for each row execute function public.fn_set_user_id_from_fase();

-- ============================================================
-- TRIGGER: poblar 3 etapas por defecto al crear una empresa
-- ============================================================
create or replace function public.fn_seed_etapas_default()
returns trigger language plpgsql as $$
begin
  insert into public.etapas (empresa_id, user_id, nombre, orden) values
    (new.id, new.user_id, 'Obras Previas', 1),
    (new.id, new.user_id, 'Obra Gruesa', 2),
    (new.id, new.user_id, 'Terminaciones', 3);
  return new;
end; $$;
create trigger trg_empresas_seed_etapas after insert on public.empresas
  for each row execute function public.fn_seed_etapas_default();

-- ============================================================
-- FUNCIÓN + TRIGGER: estado automático de partida
-- Regla: completado si avance=100; atrasado si hoy > fecha_termino y avance<100;
--        en plazo en cualquier otro caso (incluye sin fecha_termino definida).
-- ============================================================
create or replace function public.fn_calc_estado_partida(p_avance numeric, p_fecha_termino date)
returns text language sql immutable as $$
  select case
    when p_avance >= 100 then 'completado'
    when p_fecha_termino is not null and current_date > p_fecha_termino and p_avance < 100 then 'atrasado'
    else 'en plazo'
  end;
$$;

create or replace function public.fn_partida_set_estado()
returns trigger language plpgsql as $$
begin
  new.estado := public.fn_calc_estado_partida(new.avance_porcentaje, new.fecha_termino);
  new.updated_at := now();
  return new;
end; $$;
create trigger trg_partidas_set_estado
  before insert or update of avance_porcentaje, fecha_termino on public.partidas
  for each row execute function public.fn_partida_set_estado();

-- ============================================================
-- CASCADA DE AVANCE PONDERADO (promedio simple entre hijos directos)
-- partida -> fase -> etapa -> empresa.avance_global
-- ============================================================
create or replace function public.fn_recalc_fase(p_fase_id uuid)
returns void language plpgsql as $$
declare v_avg numeric(5,2); v_etapa_id uuid;
begin
  select etapa_id into v_etapa_id from public.fases where id = p_fase_id;
  select coalesce(round(avg(avance_porcentaje),2),0) into v_avg
    from public.partidas where fase_id = p_fase_id;
  update public.fases set avance_porcentaje = v_avg, updated_at = now() where id = p_fase_id;
  perform public.fn_recalc_etapa(v_etapa_id);
end; $$;

create or replace function public.fn_recalc_etapa(p_etapa_id uuid)
returns void language plpgsql as $$
declare v_avg numeric(5,2); v_empresa_id uuid;
begin
  select empresa_id into v_empresa_id from public.etapas where id = p_etapa_id;
  select coalesce(round(avg(avance_porcentaje),2),0) into v_avg
    from public.fases where etapa_id = p_etapa_id;
  update public.etapas set avance_porcentaje = v_avg, updated_at = now() where id = p_etapa_id;
  perform public.fn_recalc_empresa(v_empresa_id);
end; $$;

create or replace function public.fn_recalc_empresa(p_empresa_id uuid)
returns void language plpgsql as $$
declare v_avg numeric(5,2);
begin
  select coalesce(round(avg(avance_porcentaje),2),0) into v_avg
    from public.etapas where empresa_id = p_empresa_id;
  update public.empresas set avance_global = v_avg, updated_at = now() where id = p_empresa_id;
end; $$;

create or replace function public.fn_partidas_cascade()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform public.fn_recalc_fase(old.fase_id);
    return old;
  else
    perform public.fn_recalc_fase(new.fase_id);
    if tg_op = 'UPDATE' and old.fase_id is distinct from new.fase_id then
      perform public.fn_recalc_fase(old.fase_id);
    end if;
    return new;
  end if;
end; $$;
create trigger trg_partidas_cascade
  after insert or delete or update of avance_porcentaje, fase_id on public.partidas
  for each row execute function public.fn_partidas_cascade();

create or replace function public.fn_fases_cascade()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform public.fn_recalc_etapa(old.etapa_id);
    return old;
  else
    perform public.fn_recalc_etapa(new.etapa_id);
    return new;
  end if;
end; $$;
create trigger trg_fases_cascade after insert or delete on public.fases
  for each row execute function public.fn_fases_cascade();

create or replace function public.fn_etapas_cascade()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform public.fn_recalc_empresa(old.empresa_id);
    return old;
  else
    perform public.fn_recalc_empresa(new.empresa_id);
    return new;
  end if;
end; $$;
create trigger trg_etapas_cascade after insert or delete on public.etapas
  for each row execute function public.fn_etapas_cascade();

-- ============================================================
-- GRANTS: necesarios porque el proyecto se crea con
-- "Exponer automáticamente nuevas tablas" DESACTIVADO (más seguro).
-- RLS controla qué FILAS ve cada usuario; estos GRANT controlan si
-- el rol puede tocar la TABLA en absoluto. Solo se otorgan al rol
-- "authenticated" porque toda la app requiere login (no hay acceso anónimo).
-- ============================================================
grant select, insert, update, delete on public.empresas to authenticated;
grant select, insert, update, delete on public.responsables to authenticated;
grant select, insert, update, delete on public.etapas to authenticated;
grant select, insert, update, delete on public.fases to authenticated;
grant select, insert, update, delete on public.partidas to authenticated;
grant select, insert on public.catalogo_partidas to authenticated;
grant select on public.partidas_full to authenticated;
