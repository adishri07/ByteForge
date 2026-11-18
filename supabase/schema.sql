-- BrandProof database tables. Run once in Supabase → SQL Editor.
-- Owner: Member 3

create table if not exists rules (
  id text primary key,            -- e.g. R-04
  category text not null,
  text text not null,
  severity text not null check (severity in ('blocker','warning','suggestion'))
);

create table if not exists terms (
  id serial primary key,
  term text not null,
  type text not null check (type in ('banned','competitor','misspelling','preferred')),
  replacement text,
  rule_id text references rules(id)
);

create table if not exists facts (
  id text primary key,            -- e.g. F-05
  claim text not null,
  source text not null,
  expires_on date not null
);

create table if not exists drafts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  channel text not null,
  status text not null default 'in_review_by_creator'
    check (status in ('in_review_by_creator','pending_approval','changes_requested','approved')),
  risk_level text,
  risk_reasons jsonb,
  ai_note text,
  manager_comment text,
  created_at timestamptz not null default now()
);

create table if not exists draft_versions (
  id serial primary key,
  draft_id uuid not null references drafts(id) on delete cascade,
  version_no int not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists findings (
  id serial primary key,
  draft_id uuid not null references drafts(id) on delete cascade,
  source text not null,
  category text not null,
  severity text not null,
  span_text text not null,
  rule_id text,
  fact_id text,
  explanation text not null,
  suggested_fix text,
  confidence real,
  status text not null default 'open' check (status in ('open','accepted','edited','disputed')),
  user_text text,
  dispute_reason text
);

create table if not exists audit_log (
  id serial primary key,
  draft_id uuid not null references drafts(id) on delete cascade,
  actor_role text not null,
  action text not null,
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists findings_draft_idx on findings(draft_id);
create index if not exists versions_draft_idx on draft_versions(draft_id);
create index if not exists audit_draft_idx on audit_log(draft_id);

-- Lock the tables: only our server (using the secret/service key) can read and write.
alter table rules enable row level security;
alter table terms enable row level security;
alter table facts enable row level security;
alter table drafts enable row level security;
alter table draft_versions enable row level security;
alter table findings enable row level security;
alter table audit_log enable row level security;
