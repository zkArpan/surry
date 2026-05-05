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

-- RLS Policy: Anyone can read rooms
CREATE POLICY rooms_read ON public.rooms
  FOR SELECT USING (true);

-- RLS Policy: Anyone can insert rooms
CREATE POLICY rooms_insert ON public.rooms
  FOR INSERT WITH CHECK (true);

-- RLS Policy: Anyone can read room_players
CREATE POLICY room_players_read ON public.room_players
  FOR SELECT USING (true);

-- RLS Policy: Anyone can insert room_players
CREATE POLICY room_players_insert ON public.room_players
  FOR INSERT WITH CHECK (true);

-- RLS Policy: Anyone can update room_players (for changing seats)
CREATE POLICY room_players_update ON public.room_players
  FOR UPDATE USING (true)
  WITH CHECK (true);

-- RLS Policy: Anyone can read game_state
CREATE POLICY game_state_read ON public.game_state
  FOR SELECT USING (true);

-- RLS Policy: Anyone can insert game_state
CREATE POLICY game_state_insert ON public.game_state
  FOR INSERT WITH CHECK (true);

-- RLS Policy: Anyone can update game_state
CREATE POLICY game_state_update ON public.game_state
  FOR UPDATE USING (true);

-- Create indexes for performance
CREATE INDEX idx_room_players_room_id ON public.room_players(room_id);
CREATE INDEX idx_game_state_room_id ON public.game_state(room_id);
