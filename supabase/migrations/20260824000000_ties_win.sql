-- Ties at the top all win (owner's ruling): the prize criterion is POINTS,
-- not the display tie-break. The snapshot keeps its ordered ranks for the
-- board, and `won` marks every player whose points equalled the month's
-- maximum — each of them gets lifetime Pro, and the client trophies them all.
alter table public.challenge_hall_of_fame
  add column if not exists won boolean not null default false;
