-- Quiz Night: initial schema
-- Private multiplayer Jeopardy-style quiz platform
-- All game/session mutation happens through server-side API routes using the
-- service role key. RLS below still locks tables down so the anon/public key
-- (used only for Realtime and by host-authenticated browser clients) can
-- never read or write data it should not touch.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------

create type media_type as enum ('image', 'gif', 'youtube', 'video', 'audio');
create type media_placement as enum ('before_question', 'after_question', 'instead_of_question');
create type question_status as enum ('available', 'selected', 'completed');
create type session_status as enum (
  'lobby', 'board', 'question', 'media', 'answer', 'buzzing', 'answering',
  'scoring', 'final_question', 'finished', 'paused'
);
create type buzz_status as enum ('active', 'skipped', 'correct', 'incorrect');
create type score_reason as enum ('correct', 'incorrect', 'manual', 'undo', 'final_question', 'reset');

-- ---------------------------------------------------------------------------
-- GAME TEMPLATES (reusable quiz content)
-- ---------------------------------------------------------------------------

create table games (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  game_type text not null default 'classic' check (game_type in ('classic', 'custom')),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index games_owner_id_idx on games(owner_id);

create table categories (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  name text not null,
  description text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index categories_game_id_idx on categories(game_id, position);

create table questions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  points integer not null,
  question_text text not null default '',
  answer_text text not null default '',
  notes text,
  media_placement media_placement not null default 'after_question',
  status question_status not null default 'available',
  position integer not null default 0,
  is_final boolean not null default false,
  created_at timestamptz not null default now()
);
create index questions_category_id_idx on questions(category_id, position);

create table media (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  type media_type not null,
  url text,
  storage_path text,
  original_storage_path text,
  youtube_id text,
  youtube_start integer,
  trim_start numeric,
  trim_end numeric,
  duration numeric,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index media_question_id_idx on media(question_id, position);

-- ---------------------------------------------------------------------------
-- GAME SESSIONS (live play, decoupled snapshot of a game template)
-- ---------------------------------------------------------------------------

create table game_sessions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  host_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  join_code text not null unique,
  status session_status not null default 'lobby',
  previous_status session_status,
  settings jsonb not null default '{}'::jsonb,
  current_session_question_id uuid,
  buzzers_open boolean not null default false,
  buzzers_opened_at timestamptz,
  active_team_id uuid,
  timer_seconds integer,
  timer_started_at timestamptz,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
create index game_sessions_join_code_idx on game_sessions(join_code);
create index game_sessions_host_id_idx on game_sessions(host_id);

create table session_categories (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references game_sessions(id) on delete cascade,
  source_category_id uuid references categories(id) on delete set null,
  name text not null,
  position integer not null default 0
);
create index session_categories_session_id_idx on session_categories(session_id, position);

create table session_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references game_sessions(id) on delete cascade,
  session_category_id uuid not null references session_categories(id) on delete cascade,
  source_question_id uuid references questions(id) on delete set null,
  points integer not null,
  question_text text not null default '',
  answer_text text not null default '',
  notes text,
  media_placement media_placement not null default 'after_question',
  status question_status not null default 'available',
  position integer not null default 0,
  is_final boolean not null default false
);
create index session_questions_session_id_idx on session_questions(session_id, position);
create index session_questions_category_idx on session_questions(session_category_id);

alter table game_sessions
  add constraint game_sessions_current_question_fk
  foreign key (current_session_question_id) references session_questions(id) on delete set null;

create table session_media (
  id uuid primary key default gen_random_uuid(),
  session_question_id uuid not null references session_questions(id) on delete cascade,
  type media_type not null,
  url text,
  storage_path text,
  youtube_id text,
  youtube_start integer,
  trim_start numeric,
  trim_end numeric,
  duration numeric,
  position integer not null default 0
);
create index session_media_question_idx on session_media(session_question_id, position);

-- ---------------------------------------------------------------------------
-- TEAMS
-- ---------------------------------------------------------------------------

create table teams (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references game_sessions(id) on delete cascade,
  name text not null,
  color text,
  score integer not null default 0,
  secret_hash text not null,
  connected boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index teams_session_id_idx on teams(session_id);
create unique index teams_session_name_unique on teams(session_id, lower(name));

alter table game_sessions
  add constraint game_sessions_active_team_fk
  foreign key (active_team_id) references teams(id) on delete set null;

-- ---------------------------------------------------------------------------
-- BUZZ EVENTS (server-authoritative ordering via bigserial sequence)
-- ---------------------------------------------------------------------------

create table buzz_events (
  id uuid primary key default gen_random_uuid(),
  sequence bigserial not null,
  session_id uuid not null references game_sessions(id) on delete cascade,
  session_question_id uuid not null references session_questions(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  status buzz_status not null default 'active',
  server_time timestamptz not null default clock_timestamp(),
  client_latency_ms integer
);
create unique index buzz_events_unique_team_question on buzz_events(session_question_id, team_id);
create index buzz_events_question_idx on buzz_events(session_question_id, sequence);

-- ---------------------------------------------------------------------------
-- SCORING
-- ---------------------------------------------------------------------------

create table score_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references game_sessions(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  session_question_id uuid references session_questions(id) on delete set null,
  delta integer not null,
  resulting_score integer not null,
  reason score_reason not null,
  note text,
  undone boolean not null default false,
  created_at timestamptz not null default now()
);
create index score_events_session_idx on score_events(session_id, created_at);
create index score_events_team_idx on score_events(team_id);

create table final_wagers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references game_sessions(id) on delete cascade,
  session_question_id uuid not null references session_questions(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  amount integer not null default 0,
  locked boolean not null default false,
  correct boolean,
  created_at timestamptz not null default now()
);
create unique index final_wagers_unique on final_wagers(session_question_id, team_id);

-- ---------------------------------------------------------------------------
-- EVENT LOG (host-visible history / debugging)
-- ---------------------------------------------------------------------------

create table game_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references game_sessions(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index game_events_session_idx on game_events(session_id, created_at);

-- ---------------------------------------------------------------------------
-- updated_at trigger for games
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger games_set_updated_at
  before update on games
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
-- Only the authenticated host who owns a game/session can read or write it
-- directly. Team (anon) clients never talk to Postgres directly -- they go
-- through API routes that use the service role key, which bypasses RLS by
-- design and enforces its own authorization (team secret token, session
-- membership, question/answer redaction). This keeps "team clients can never
-- fetch the answer" true regardless of RLS policy correctness.

alter table games enable row level security;
alter table categories enable row level security;
alter table questions enable row level security;
alter table media enable row level security;
alter table game_sessions enable row level security;
alter table session_categories enable row level security;
alter table session_questions enable row level security;
alter table session_media enable row level security;
alter table teams enable row level security;
alter table buzz_events enable row level security;
alter table score_events enable row level security;
alter table final_wagers enable row level security;
alter table game_events enable row level security;

create policy games_owner_all on games
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy categories_owner_all on categories
  for all using (exists (select 1 from games g where g.id = categories.game_id and g.owner_id = auth.uid()))
  with check (exists (select 1 from games g where g.id = categories.game_id and g.owner_id = auth.uid()));

create policy questions_owner_all on questions
  for all using (exists (
    select 1 from categories c join games g on g.id = c.game_id
    where c.id = questions.category_id and g.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from categories c join games g on g.id = c.game_id
    where c.id = questions.category_id and g.owner_id = auth.uid()
  ));

create policy media_owner_all on media
  for all using (exists (
    select 1 from questions q
    join categories c on c.id = q.category_id
    join games g on g.id = c.game_id
    where q.id = media.question_id and g.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from questions q
    join categories c on c.id = q.category_id
    join games g on g.id = c.game_id
    where q.id = media.question_id and g.owner_id = auth.uid()
  ));

create policy sessions_owner_all on game_sessions
  for all using (host_id = auth.uid()) with check (host_id = auth.uid());

create policy session_categories_owner_all on session_categories
  for all using (exists (select 1 from game_sessions s where s.id = session_categories.session_id and s.host_id = auth.uid()))
  with check (exists (select 1 from game_sessions s where s.id = session_categories.session_id and s.host_id = auth.uid()));

create policy session_questions_owner_all on session_questions
  for all using (exists (select 1 from game_sessions s where s.id = session_questions.session_id and s.host_id = auth.uid()))
  with check (exists (select 1 from game_sessions s where s.id = session_questions.session_id and s.host_id = auth.uid()));

create policy session_media_owner_all on session_media
  for all using (exists (
    select 1 from session_questions sq join game_sessions s on s.id = sq.session_id
    where sq.id = session_media.session_question_id and s.host_id = auth.uid()
  ))
  with check (exists (
    select 1 from session_questions sq join game_sessions s on s.id = sq.session_id
    where sq.id = session_media.session_question_id and s.host_id = auth.uid()
  ));

create policy teams_owner_all on teams
  for all using (exists (select 1 from game_sessions s where s.id = teams.session_id and s.host_id = auth.uid()))
  with check (exists (select 1 from game_sessions s where s.id = teams.session_id and s.host_id = auth.uid()));

create policy buzz_events_owner_all on buzz_events
  for all using (exists (select 1 from game_sessions s where s.id = buzz_events.session_id and s.host_id = auth.uid()))
  with check (exists (select 1 from game_sessions s where s.id = buzz_events.session_id and s.host_id = auth.uid()));

create policy score_events_owner_all on score_events
  for all using (exists (select 1 from game_sessions s where s.id = score_events.session_id and s.host_id = auth.uid()))
  with check (exists (select 1 from game_sessions s where s.id = score_events.session_id and s.host_id = auth.uid()));

create policy final_wagers_owner_all on final_wagers
  for all using (exists (select 1 from game_sessions s where s.id = final_wagers.session_id and s.host_id = auth.uid()))
  with check (exists (select 1 from game_sessions s where s.id = final_wagers.session_id and s.host_id = auth.uid()));

create policy game_events_owner_all on game_events
  for all using (exists (select 1 from game_sessions s where s.id = game_events.session_id and s.host_id = auth.uid()))
  with check (exists (select 1 from game_sessions s where s.id = game_events.session_id and s.host_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- STORAGE
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('quiz-media', 'quiz-media', true)
on conflict (id) do nothing;

-- Only authenticated hosts can write to storage; reads are public so that
-- both host and team browsers can play media without extra signed-URL
-- plumbing (this is a private, unlisted-URL app, not a public content site).
create policy "quiz-media read" on storage.objects
  for select using (bucket_id = 'quiz-media');

create policy "quiz-media host write" on storage.objects
  for insert to authenticated with check (bucket_id = 'quiz-media');

create policy "quiz-media host update" on storage.objects
  for update to authenticated using (bucket_id = 'quiz-media');

create policy "quiz-media host delete" on storage.objects
  for delete to authenticated using (bucket_id = 'quiz-media');
