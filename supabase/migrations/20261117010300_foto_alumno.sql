-- Foto opcional para el carnet.
alter table public.alumnos add column if not exists foto_url text;

comment on column public.alumnos.foto_url is 'URL pública de la foto; sólo se usa en el carnet';
