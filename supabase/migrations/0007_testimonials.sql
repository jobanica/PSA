-- =============================================================================
-- Migration 0007: Admin-managed testimonials (text + video) shown on the
-- public landing page. Includes a public Storage bucket for uploaded videos
-- and poster images.
-- =============================================================================

create table if not exists testimonials (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null default 'text',   -- 'text' | 'youtube' | 'file'
  quote        text,
  author_name  text not null,
  location     text,
  stars        int not null default 5,
  youtube_id   text,        -- for kind = 'youtube'
  video_url    text,        -- for kind = 'file' (public storage URL)
  poster_url   text,        -- thumbnail for kind = 'file'
  active       boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists testimonials_active_idx on testimonials (active, sort_order);

alter table testimonials enable row level security;

-- Public (anon) can read only active testimonials for the landing page.
drop policy if exists testimonials_public_read on testimonials;
create policy testimonials_public_read on testimonials
  for select to anon using (active = true);

-- Staff (authenticated) can read + manage everything.
drop policy if exists testimonials_staff_all on testimonials;
create policy testimonials_staff_all on testimonials
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Storage bucket for testimonial videos + posters (public read).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('testimonials', 'testimonials', true)
on conflict (id) do nothing;

-- Public read of files in the bucket (bucket is public, but be explicit).
drop policy if exists "testimonials public read" on storage.objects;
create policy "testimonials public read" on storage.objects
  for select using (bucket_id = 'testimonials');

-- Staff can upload / replace / delete files in the bucket.
drop policy if exists "testimonials staff insert" on storage.objects;
create policy "testimonials staff insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'testimonials');

drop policy if exists "testimonials staff update" on storage.objects;
create policy "testimonials staff update" on storage.objects
  for update to authenticated using (bucket_id = 'testimonials');

drop policy if exists "testimonials staff delete" on storage.objects;
create policy "testimonials staff delete" on storage.objects
  for delete to authenticated using (bucket_id = 'testimonials');
