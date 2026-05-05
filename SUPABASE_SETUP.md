# Supabase Setup Guide for SURRY Game

## Database Tables Required

The game needs three tables in your Supabase database:
1. `rooms` - Stores room information
2. `room_players` - Stores player seat assignments
3. `game_state` - Stores active game state

## Setup Instructions

### 1. Go to Your Supabase Project
- Visit [https://app.supabase.com](https://app.supabase.com)
- Select your project (ID: `uvmmwyajighqtvmzxifg`)

### 2. Create Tables

**Option A: Using SQL Editor (Recommended)**
- Go to SQL Editor in left sidebar
- Click "New Query"
- Copy and paste the contents of `database_setup.sql`
- Click "Run"

**Option B: Manual Table Creation**
- Go to Table Editor
- Create three new tables with the schemas below

### Table Schemas

#### rooms
```
- id (text, primary key)
- name (text)
- host_id (text)
- status (text, default: 'waiting')
- created_at (timestamp)
```

#### room_players
```
- id (bigint, primary key, auto-increment)
- room_id (text, foreign key → rooms.id)
- player_id (text)
- player_name (text)
- seat (int, 0-3)
- created_at (timestamp)
- UNIQUE constraint on (room_id, player_id)
```

#### game_state
```
- id (bigint, primary key, auto-increment)
- room_id (text, unique, foreign key → rooms.id)
- phase (text)
- dealer_seat (int)
- current_turn_seat (int)
- hands (jsonb)
- remaining_cards (jsonb)
- current_trick (jsonb)
- trick_pile (jsonb)
- pile_owner_seat (int)
- consecutive_wins (int)
- secured_tricks (jsonb, default: {"02":0,"13":0})
- bid_winner_seat (int)
- winning_bid (int)
- bids (jsonb)
- bid_order (jsonb)
- trump_suit (text)
- last_trick_winner (int)
- pieces (jsonb, default: {"02":0,"13":0})
- sold_count (jsonb, default: {"02":0,"13":0})
- distributor_team (text, default: '02')
- round_number (int, default: 1)
- log (jsonb, default: [])
- updated_at (timestamp)
- created_at (timestamp)
```

### 3. Enable Row Level Security (RLS)

For each table:
1. Open the table in Table Editor
2. Click "RLS Policies" (top right)
3. Click "Enable RLS"

### 4. Create RLS Policies

The policies in `database_setup.sql` allow:
- **Public read/write** for rooms, room_players, and game_state
- This is suitable for a game where all players in a room need full access

**Production Note**: For production, you should implement:
- User authentication
- Stricter RLS policies based on user_id
- Update/delete restrictions based on ownership

## Verification Checklist

- [ ] All 3 tables created
- [ ] All columns have correct types
- [ ] Foreign key relationships established
- [ ] RLS enabled on all tables
- [ ] RLS policies created
- [ ] Indexes created for performance

## Common Issues

### 404 Errors in Console
- Tables don't exist or have wrong names
- RLS policies are too restrictive
- Check that table names are lowercase

### Can't Join Rooms
- Player is missing `player_id` or `player_name` fields
- Room has 4 players already
- Check RLS policies allow inserts
- Verify the `rooms` table exists and has the correct structure

### Can't Sit at Table / Update Seat
**Most Common Cause**: RLS policy on `room_players` is too restrictive

**Fix**: Update the RLS policy for `room_players`:
1. Go to Table Editor → room_players
2. Click "RLS Policies"
3. Find or create "room_players_update" policy
4. Set it to: `FOR UPDATE USING (true) WITH CHECK (true)`
5. Save

This allows any player to update their seat position. For production, you'd restrict this to only the player updating their own seat.

### Tables Already Exist But Still Getting Errors
1. Drop and recreate the tables using the SQL in `database_setup.sql`
2. OR manually verify all columns and RLS policies match the schema above
3. Check that all JSONB fields have the correct default values

## Testing

1. Click "Create Room" with your name
2. Copy the room code
3. Open the game in another browser tab/window
4. Enter a different name
5. Paste the room code and click "Join"
6. Click "Sit" to take a seat
7. All 4 players should be seated before "Start Game" button appears
