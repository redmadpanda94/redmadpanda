-- Adds YouTube clip end-time (play just a segment, official player only --
-- no downloading) and an "audio only" flag (visually covered by another
-- media item on the same question while the official embed keeps playing,
-- since YouTube's player has no official audio-only mode).

alter table media
  add column youtube_end integer,
  add column youtube_audio_only boolean not null default false;

alter table session_media
  add column youtube_end integer,
  add column youtube_audio_only boolean not null default false;
