-- Create rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  host_id TEXT NOT NULL,
  status TEXT DEFAULT 'waiting',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create room_players table
CREATE TABLE IF NOT EXISTS public.room_players (
  id BIGSERIAL PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  seat INT CHECK (seat >= 0 AND seat <= 3),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(room_id, player_id)
);

-- Create game_state table
CREATE TABLE IF NOT EXISTS public.game_state (
  id BIGSERIAL PRIMARY KEY,
  room_id TEXT NOT NULL UNIQUE REFERENCES public.rooms(id) ON DELETE CASCADE,
  phase TEXT DEFAULT 'waiting',
  dealer_seat INT,
  current_turn_seat INT,
  hands JSONB,
  remaining_cards JSONB,
  current_trick JSONB,
  trick_pile JSONB,
  pile_owner_seat INT,
  consecutive_wins INT DEFAULT 0,
  secured_tricks JSONB DEFAULT '{"02":0,"13":0}',
  bid_winner_seat INT,
  winning_bid INT,
  bids JSONB,
  bid_order JSONB,
  trump_suit TEXT,
  last_trick_winner INT,
  pieces JSONB DEFAULT '{"02":0,"13":0}',
  sold_count JSONB DEFAULT '{"02":0,"13":0}',
  distributor_team TEXT DEFAULT '02',
  round_number INT DEFAULT 1,
  log JSONB DEFAULT '[]',
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies (idempotent: no errors if they already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='rooms' AND policyname='rooms_read'
  ) THEN
    EXECUTE 'CREATE POLICY rooms_read ON public.rooms FOR SELECT USING (true);';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='rooms' AND policyname='rooms_insert'
  ) THEN
    EXECUTE 'CREATE POLICY rooms_insert ON public.rooms FOR INSERT WITH CHECK (true);';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='room_players' AND policyname='room_players_read'
  ) THEN
    EXECUTE 'CREATE POLICY room_players_read ON public.room_players FOR SELECT USING (true);';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='room_players' AND policyname='room_players_insert'
  ) THEN
    EXECUTE 'CREATE POLICY room_players_insert ON public.room_players FOR INSERT WITH CHECK (true);';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='room_players' AND policyname='room_players_update'
  ) THEN
    EXECUTE 'CREATE POLICY room_players_update ON public.room_players FOR UPDATE USING (true) WITH CHECK (true);';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='game_state' AND policyname='game_state_read'
  ) THEN
    EXECUTE 'CREATE POLICY game_state_read ON public.game_state FOR SELECT USING (true);';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='game_state' AND policyname='game_state_insert'
  ) THEN
    EXECUTE 'CREATE POLICY game_state_insert ON public.game_state FOR INSERT WITH CHECK (true);';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='game_state' AND policyname='game_state_update'
  ) THEN
    EXECUTE 'CREATE POLICY game_state_update ON public.game_state FOR UPDATE USING (true) WITH CHECK (true);';
  END IF;
END $$;

-- Create indexes for performance
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_room_players_room_id') THEN
    EXECUTE 'CREATE INDEX idx_room_players_room_id ON public.room_players(room_id);';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_game_state_room_id') THEN
    EXECUTE 'CREATE INDEX idx_game_state_room_id ON public.game_state(room_id);';
  END IF;
END $$;

-- Enable Supabase Realtime for gameplay tables
-- If this fails with "must be owner" or publication missing, enable Realtime in Supabase Dashboard instead:
-- Database -> Replication -> Realtime -> toggle tables on
DO $$
BEGIN
  -- Only attempt if publication exists and table isn't already in it
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_rel pr
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_publication p ON p.oid = pr.prpubid
      WHERE p.pubname='supabase_realtime' AND n.nspname='public' AND c.relname='room_players'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;';
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_rel pr
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_publication p ON p.oid = pr.prpubid
      WHERE p.pubname='supabase_realtime' AND n.nspname='public' AND c.relname='game_state'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.game_state;';
    END IF;
  END IF;
END $$;
