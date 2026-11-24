-- BrandProof Round 3 database update. Run ONCE in Supabase → SQL Editor.
-- Safe for the existing database: keeps the BrightPath demo brand and all drafts.
-- Owner: Member 3

-- 1. Workspaces (one per organisation / brand)
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);
insert into workspaces (id, name)
values ('00000000-0000-0000-0000-000000000001', 'BrightPath Learning (demo)')
on conflict (id) do nothing;

-- 2. Guideline uploads
create table if not exists guideline_uploads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  filename text not null,
  file_path text,
  status text not null default 'processing' check (status in ('processing','review','approved','failed')),
  extracted_chars int,
  error text,
  created_at timestamptz not null default now()
);

-- 3. Rules / terms / facts: per workspace, with review status.
--    Rule and fact codes (R-01, F-01) are now unique per brand, not globally,
--    so each row gets its own internal id (uid).
alter table terms drop constraint if exists terms_rule_id_fkey;

alter table rules add column if not exists workspace_id uuid not null default '00000000-0000-0000-0000-000000000001' references workspaces(id) on delete cascade;
alter table rules add column if not exists status text not null default 'active';
alter table rules add column if not exists upload_id uuid references guideline_uploads(id) on delete cascade;
alter table rules drop constraint if exists rules_pkey;
alter table rules add column if not exists uid uuid not null default gen_random_uuid();
alter table rules add primary key (uid);

alter table facts add column if not exists workspace_id uuid not null default '00000000-0000-0000-0000-000000000001' references workspaces(id) on delete cascade;
alter table facts add column if not exists status text not null default 'active';
alter table facts add column if not exists upload_id uuid references guideline_uploads(id) on delete cascade;
alter table facts drop constraint if exists facts_pkey;
alter table facts add column if not exists uid uuid not null default gen_random_uuid();
alter table facts add primary key (uid);

alter table terms add column if not exists workspace_id uuid not null default '00000000-0000-0000-0000-000000000001' references workspaces(id) on delete cascade;
alter table terms add column if not exists status text not null default 'active';
alter table terms add column if not exists upload_id uuid references guideline_uploads(id) on delete cascade;

-- the severity check stays; categories now also allow 'visual'
-- (rules.category had no check constraint in Round 2, so nothing to change)

-- 4. Drafts: per workspace, and image drafts
alter table drafts add column if not exists workspace_id uuid not null default '00000000-0000-0000-0000-000000000001' references workspaces(id) on delete cascade;
alter table drafts add column if not exists kind text not null default 'text';
alter table drafts add column if not exists image_path text;
alter table drafts add column if not exists alt_text text;

-- 5. Conflicts found between rules
create table if not exists rule_conflicts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  upload_id uuid references guideline_uploads(id) on delete cascade,
  rule_a text not null,
  rule_b text not null,
  explanation text not null,
  suggestion text,
  status text not null default 'open' check (status in ('open','resolved')),
  resolution text,
  created_at timestamptz not null default now()
);

-- 6. Brand assets: colours and logo
create table if not exists brand_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  type text not null check (type in ('color','logo')),
  label text,
  value text not null,           -- hex code for colours, storage path for logos
  status text not null default 'active',
  upload_id uuid references guideline_uploads(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 7. Chat history
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  citations jsonb,
  created_at timestamptz not null default now()
);

create index if not exists rules_ws_idx on rules(workspace_id, status);
create index if not exists terms_ws_idx on terms(workspace_id, status);
create index if not exists facts_ws_idx on facts(workspace_id, status);
create index if not exists drafts_ws_idx on drafts(workspace_id, status);
create index if not exists assets_ws_idx on brand_assets(workspace_id, status);
create index if not exists conflicts_upload_idx on rule_conflicts(upload_id);

-- 8. Visual rules + colours for the BrightPath demo
insert into rules (id, workspace_id, category, text, severity, status)
select v.id, '00000000-0000-0000-0000-000000000001', v.category, v.text, v.severity, 'active'
from (values
  ('V-01','visual','Use only approved brand colours in images.','warning'),
  ('V-02','visual','Images must show the approved logo, unaltered.','blocker'),
  ('V-03','accessibility','Text on images must have a contrast ratio of at least 4.5:1 (WCAG AA).','warning'),
  ('V-04','accessibility','Every image needs alt text describing it.','warning')
) as v(id, category, text, severity)
where not exists (select 1 from rules r where r.id = v.id and r.workspace_id = '00000000-0000-0000-0000-000000000001');

insert into brand_assets (workspace_id, type, label, value)
select '00000000-0000-0000-0000-000000000001', 'color', c.label, c.hex
from (values ('Indigo','#4F46E5'),('Navy','#1E1B4B'),('Amber','#F59E0B'),('White','#FFFFFF'),('Mist','#F1F5F9')) as c(label, hex)
where not exists (select 1 from brand_assets a where a.workspace_id = '00000000-0000-0000-0000-000000000001' and a.type = 'color');

-- 9. Private file storage for guideline files, images and logos
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false)
on conflict (id) do nothing;

-- 10. Security: server-only access (same as Round 2)
alter table workspaces enable row level security;
alter table guideline_uploads enable row level security;
alter table rule_conflicts enable row level security;
alter table brand_assets enable row level security;
alter table chat_messages enable row level security;
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
