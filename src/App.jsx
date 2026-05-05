import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Load Supabase credentials from environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase environment variables. Please check your .env.local file.");
}

const supabase = createClient(SUPABASE_URL || "", SUPABASE_KEY || "");

// ── Card utils ────────────────────────────────────────────────────────────────
const SUITS = ["♠","♥","♦","♣"];
const SUIT_NAMES = { "♠":"spades","♥":"hearts","♦":"diamonds","♣":"clubs" };
const SUIT_FROM_NAME = { spades:"♠",hearts:"♥",diamonds:"♦",clubs:"♣" };
const RANKS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const RANK_VAL = Object.fromEntries(RANKS.map((r,i)=>([r,i])));
const RED = {"♥":1,"♦":1};

function makeDeck() {
  const d=[];
  for(const s of SUITS) for(const r of RANKS) d.push(r+s);
  return d;
}
function shuffle(arr) {
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}
function cardRank(c){ return c.slice(0,-1); }
function cardSuit(c){ return c.slice(-1); }
function cardVal(c){ return RANK_VAL[cardRank(c)]; }
function isRed(c){ return RED[cardSuit(c)]; }

// ── Team logic ────────────────────────────────────────────────────────────────
// Seats 0,2 = team "02"; seats 1,3 = team "13"
function seatTeam(seat){ return [0,2].includes(seat)?"02":"13"; }
function teamName(t){ return t==="02"?"Team A (seats 1,3)":"Team B (seats 2,4)"; }
function teammate(seat){ return (seat+2)%4; }

// ── Room ID gen ───────────────────────────────────────────────────────────────
function genRoomId(){ return Math.random().toString(36).slice(2,7).toUpperCase(); }
function genPlayerId(){ return "p_"+Math.random().toString(36).slice(2,10); }

// ── Deal helper ───────────────────────────────────────────────────────────────
function dealCards() {
  const deck = shuffle(makeDeck());
  // First deal: 5 each; final deal: 4+4 each = 13 each
  const hands = {};
  let idx=0;
  for(let s=0;s<4;s++){ hands[s]=deck.slice(idx,idx+5); idx+=5; }
  // Store remaining 32 for final deal
  return { hands, remaining: deck.slice(20) };
}
function finalDeal(hands, remaining) {
  let idx=0;
  const h={...hands};
  for(let s=0;s<4;s++){ 
    h[s]=[...(h[s]||[]), ...remaining.slice(idx,idx+4)]; 
    idx+=4; 
  }
  for(let s=0;s<4;s++){
    h[s]=[...(h[s]||[]), ...remaining.slice(idx,idx+4)];
    idx+=4;
  }
  return h;
}

// ── Game Logic ────────────────────────────────────────────────────────────────
function whoWinsTrick(trick, trump) {
  if(!trick||trick.length===0) return null;
  const lead = cardSuit(trick[0].card);
  const trumpSuit = SUIT_FROM_NAME[trump] || trump;
  let best=trick[0];
  for(const play of trick){
    const s=cardSuit(play.card), bs=cardSuit(best.card);
    if(s===trumpSuit && bs!==trumpSuit){ best=play; }
    else if(s===bs && cardVal(play.card)>cardVal(best.card)){ best=play; }
  }
  return best.seat;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Mono:wght@400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:#0f1117;color:#e8e4d8;font-family:'DM Mono',monospace;}
  :root{
    --green:#1a472a;--green-l:#2d6a40;--green-ll:#3a8f54;
    --gold:#c9a84c;--gold-l:#e8c96c;
    --cream:#e8e4d8;--cream-d:#c4bfa8;
    --red:#c0392b;--red-l:#e74c3c;
    --bg:#0f1117;--bg2:#161921;--bg3:#1e2330;
    --border:#2a3040;
    --suit-red:#e74c3c;--suit-black:#e8e4d8;
  }
  .felt{background:radial-gradient(ellipse at center, #1a472a 0%, #0d2b18 100%); min-height:100vh;}
  /* Lobby */
  .lobby{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:2rem;gap:2rem;}
  .logo{font-family:'Playfair Display',serif;font-size:3.5rem;font-weight:700;color:var(--gold);letter-spacing:4px;text-shadow:0 0 30px rgba(201,168,76,0.4);}
  .logo-sub{color:var(--cream-d);font-size:0.75rem;letter-spacing:6px;margin-top:-0.5rem;}
  .card-panel{background:rgba(0,0,0,0.4);border:1px solid var(--border);border-radius:12px;padding:2rem;width:100%;max-width:420px;backdrop-filter:blur(10px);}
  .panel-title{font-size:0.65rem;letter-spacing:4px;color:var(--cream-d);margin-bottom:1.5rem;text-transform:uppercase;}
  .inp{width:100%;background:rgba(255,255,255,0.06);border:1px solid var(--border);border-radius:6px;padding:0.65rem 0.9rem;color:var(--cream);font-family:'DM Mono',monospace;font-size:0.9rem;outline:none;transition:border-color 0.2s;}
  .inp:focus{border-color:var(--gold);}
  .btn{padding:0.7rem 1.5rem;border-radius:6px;border:none;font-family:'DM Mono',monospace;font-size:0.85rem;cursor:pointer;transition:all 0.15s;letter-spacing:1px;}
  .btn-gold{background:var(--gold);color:#0f1117;font-weight:500;}
  .btn-gold:hover{background:var(--gold-l);}
  .btn-outline{background:transparent;color:var(--cream);border:1px solid var(--border);}
  .btn-outline:hover{border-color:var(--gold);color:var(--gold);}
  .btn-sm{padding:0.4rem 0.9rem;font-size:0.75rem;}
  .divider{display:flex;align-items:center;gap:1rem;color:var(--cream-d);font-size:0.7rem;}
  .divider::before,.divider::after{content:'';flex:1;height:1px;background:var(--border);}
  /* Room lobby */
  .room-header{font-family:'Playfair Display',serif;font-size:1.8rem;color:var(--gold);}
  .room-id-badge{background:rgba(201,168,76,0.15);border:1px solid rgba(201,168,76,0.3);border-radius:6px;padding:0.4rem 1rem;font-size:1.1rem;letter-spacing:4px;color:var(--gold-l);}
  .seat-grid{display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin:1rem 0;}
  .seat-card{background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:8px;padding:0.75rem 1rem;display:flex;align-items:center;gap:0.75rem;transition:border-color 0.2s;}
  .seat-card.taken{border-color:var(--green-l);}
  .seat-card.mine{border-color:var(--gold);background:rgba(201,168,76,0.1);}
  .seat-dot{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.75rem;flex-shrink:0;}
  .seat-dot.empty{background:rgba(255,255,255,0.08);border:1px dashed var(--border);}
  .seat-dot.filled{background:var(--green);border:1px solid var(--green-l);}
  .team-a{color:#7ec8e3;}
  .team-b{color:#f4a261;}
  /* Game table */
  .game-wrap{min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:1rem;}
  .table-area{position:relative;width:100%;max-width:700px;aspect-ratio:1.4;background:radial-gradient(ellipse at center,#1e4d2b 0%,#0d2415 100%);border-radius:50%;border:3px solid rgba(201,168,76,0.3);box-shadow:inset 0 0 60px rgba(0,0,0,0.5),0 0 40px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;}
  /* Player positions on table */
  .player-pos{position:absolute;display:flex;flex-direction:column;align-items:center;gap:4px;}
  .player-pos.top{top:5%;left:50%;transform:translateX(-50%);}
  .player-pos.right{right:3%;top:50%;transform:translateY(-50%);}
  .player-pos.bottom{bottom:5%;left:50%;transform:translateX(-50%);}
  .player-pos.left{left:3%;top:50%;transform:translateY(-50%);}
  .player-name-badge{font-size:0.65rem;letter-spacing:1px;padding:3px 8px;border-radius:4px;border:1px solid var(--border);background:rgba(0,0,0,0.5);}
  .player-name-badge.my-badge{border-color:var(--gold);color:var(--gold);}
  .player-name-badge.active{border-color:var(--green-ll);color:#90ee90;}
  /* Trick area */
  .trick-center{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:6px;width:180px;height:120px;}
  /* Cards */
  .card{width:44px;height:62px;background:white;border-radius:5px;border:1px solid #ccc;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:0.9rem;font-weight:700;cursor:default;position:relative;flex-shrink:0;transition:transform 0.15s,box-shadow 0.15s;}
  .card.red{color:var(--suit-red);}
  .card.black{color:#111;}
  .card.playable{cursor:pointer;box-shadow:0 0 0 2px var(--gold);}
  .card.playable:hover{transform:translateY(-8px);box-shadow:0 4px 12px rgba(201,168,76,0.5);}
  .card.selected{transform:translateY(-12px);box-shadow:0 0 0 2px var(--gold-l),0 6px 16px rgba(201,168,76,0.4);}
  .card.back{background:linear-gradient(135deg,#1a472a,#0d2b18);border:1px solid #3a8f54;color:transparent;}
  .card-sm{width:34px;height:48px;font-size:0.7rem;}
  .card-rank{font-size:0.75rem;line-height:1;position:absolute;top:3px;left:4px;}
  .card-suit{font-size:1rem;}
  .hand-wrap{display:flex;flex-wrap:wrap;gap:4px;justify-content:center;max-width:500px;padding:4px;}
  /* Bid area */
  .bid-panel{background:rgba(0,0,0,0.6);border:1px solid var(--border);border-radius:10px;padding:1.5rem;width:100%;max-width:500px;backdrop-filter:blur(8px);}
  .bid-btns{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:1rem;}
  .bid-btn{width:56px;height:42px;border-radius:6px;border:1px solid var(--border);background:rgba(255,255,255,0.06);color:var(--cream);font-family:'DM Mono',monospace;font-size:0.85rem;cursor:pointer;transition:all 0.15s;}
  .bid-btn:hover:not(:disabled){background:rgba(201,168,76,0.2);border-color:var(--gold);color:var(--gold);}
  .bid-btn.pass-btn{width:80px;color:var(--cream-d);}
  .bid-btn:disabled{opacity:0.3;cursor:not-allowed;}
  /* Trump select */
  .trump-btns{display:flex;gap:1rem;justify-content:center;margin-top:1rem;flex-wrap:wrap;}
  .trump-btn{width:70px;height:60px;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.05);font-size:1.8rem;cursor:pointer;transition:all 0.2s;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;}
  .trump-btn:hover{transform:scale(1.1);background:rgba(201,168,76,0.15);border-color:var(--gold);}
  .trump-btn.red-suit{color:var(--suit-red);}
  .trump-btn.black-suit{color:var(--cream);}
  /* Info bar */
  .info-bar{width:100%;max-width:700px;display:flex;gap:1rem;flex-wrap:wrap;justify-content:center;margin:0.5rem 0;}
  .info-chip{background:rgba(0,0,0,0.4);border:1px solid var(--border);border-radius:6px;padding:4px 12px;font-size:0.7rem;color:var(--cream-d);}
  .info-chip span{color:var(--cream);font-weight:500;}
  /* Score */
  .score-wrap{width:100%;max-width:700px;display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin:0.5rem 0;}
  .score-card{background:rgba(0,0,0,0.4);border:1px solid var(--border);border-radius:8px;padding:0.75rem 1rem;}
  .score-label{font-size:0.6rem;letter-spacing:3px;color:var(--cream-d);margin-bottom:4px;}
  .score-val{font-size:1.4rem;color:var(--gold);}
  /* Log */
  .log-wrap{width:100%;max-width:700px;background:rgba(0,0,0,0.35);border:1px solid var(--border);border-radius:8px;padding:0.75rem 1rem;max-height:80px;overflow-y:auto;font-size:0.68rem;color:var(--cream-d);}
  .log-entry{padding:1px 0;}
  /* Pile count */
  .pile-badge{position:absolute;top:8px;right:8px;background:rgba(201,168,76,0.2);border:1px solid rgba(201,168,76,0.4);border-radius:20px;padding:2px 10px;font-size:0.65rem;color:var(--gold);}
  /* Waiting */
  .waiting-pulse{animation:pulse 1.5s infinite;}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
  /* Round result */
  .result-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:100;}
  .result-panel{background:#161921;border:1px solid var(--gold);border-radius:16px;padding:2rem;text-align:center;max-width:360px;width:90%;}
  .result-title{font-family:'Playfair Display',serif;font-size:2rem;color:var(--gold);margin-bottom:1rem;}
  /* Sold overlay */
  .sold-flash{position:fixed;inset:0;background:rgba(192,57,43,0.7);display:flex;align-items:center;justify-content:center;z-index:200;font-family:'Playfair Display',serif;font-size:5rem;color:white;pointer-events:none;animation:fadeOut 2.5s forwards;}
  @keyframes fadeOut{0%{opacity:1}70%{opacity:1}100%{opacity:0}}
  /* Responsive */
  @media(max-width:600px){
    .table-area{max-width:98vw;}
    .hand-wrap{max-width:98vw;}
    .logo{font-size:2.5rem;}
  }
  .gap-1{gap:0.5rem;}
  .gap-2{gap:1rem;}
  .flex{display:flex;}
  .flex-col{flex-direction:column;}
  .items-center{align-items:center;}
  .justify-center{justify-content:center;}
  .w-full{width:100%;}
  .text-center{text-align:center;}
  .mt-1{margin-top:0.5rem;}
  .mt-2{margin-top:1rem;}
  .hidden{display:none;}
  select.inp{appearance:auto;}
`;

// ── Card rendering ─────────────────────────────────────────────────────────────
function CardView({ card, small, playable, selected, onClick, faceDown }) {
  if (!card) return null;
  if (faceDown) return <div className={`card card-sm ${small?"card-sm":""} back`}/>;
  const rank = cardRank(card), suit = cardSuit(card);
  const red = ["♥","♦"].includes(suit);
  return (
    <div
      className={`card ${small?"card-sm":""} ${red?"red":"black"} ${playable?"playable":""} ${selected?"selected":""}`}
      onClick={playable?onClick:undefined}
    >
      <span className="card-rank">{rank}</span>
      <span className="card-suit">{suit}</span>
    </div>
  );
}

// ── Trick display ──────────────────────────────────────────────────────────────
function TrickDisplay({ trick, mySeat }) {
  // positions: bottom=me, top=opposite, left=right-1, right=left+1
  const pos = ["bottom","left","top","right"];
  // trick is [{seat, card}, ...]
  const byPos = {};
  if (trick) {
    for (const play of trick) {
      const relSeat = ((play.seat - mySeat) + 4) % 4;
      byPos[pos[relSeat]] = play.card;
    }
  }
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 60px 1fr",gridTemplateRows:"1fr 60px 1fr",width:180,height:140,alignItems:"center",justifyItems:"center"}}>
      <div/><CardView card={byPos.top} small/><div/>
      <CardView card={byPos.left} small/><div style={{width:20,height:20,borderRadius:"50%",background:"rgba(255,255,255,0.1)"}}/><CardView card={byPos.right} small/>
      <div/><CardView card={byPos.bottom} small/><div/>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("home"); // home, create, join, room, game
  const [playerName, setPlayerName] = useState(() => localStorage.getItem("surry_name")||"");
  const [playerId] = useState(() => {
    // Per-tab identity so multiple players can be tested in one browser.
    // (localStorage is shared across tabs and would make every tab the same player.)
    let id = sessionStorage.getItem("surry_pid");
    if (!id) {
      id = genPlayerId();
      sessionStorage.setItem("surry_pid", id);
    }
    return id;
  });
  const [roomId, setRoomId] = useState("");
  const [joinInput, setJoinInput] = useState("");
  const [roomPlayers, setRoomPlayers] = useState([]);
  const [mySeat, setMySeat] = useState(null);
  const [gs, setGs] = useState(null); // game_state row
  const [selectedCard, setSelectedCard] = useState(null);
  const [showResult, setShowResult] = useState(null);
  const [showSold, setShowSold] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const channelRef = useRef(null);

  const saveName = (n) => { setPlayerName(n); localStorage.setItem("surry_name",n); };

  // ── Subscribe to room ──────────────────────────────────────────────────────
  const subscribeRoom = useCallback((rid) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const ch = supabase.channel(`room:${rid}`)
      .on("postgres_changes",{event:"*",schema:"public",table:"room_players",filter:`room_id=eq.${rid}`},
        () => loadRoomPlayers(rid))
      .on("postgres_changes",{event:"*",schema:"public",table:"game_state",filter:`room_id=eq.${rid}`},
        (payload) => { 
          const newGs = payload?.new;
          if (!newGs || !newGs.phase) {
            // Some realtime events may not include full row; refetch to keep clients consistent
            loadGs(rid);
            return;
          }
          setGs(prev => {
            // detect SOLD
            if (prev && newGs.sold_count) {
              const prevSold = typeof prev.sold_count === "string" ? JSON.parse(prev.sold_count) : prev.sold_count;
              const newSold = typeof newGs.sold_count === "string" ? JSON.parse(newGs.sold_count) : newGs.sold_count;
              const t02 = (newSold["02"]||0) - (prevSold["02"]||0);
              const t13 = (newSold["13"]||0) - (prevSold["13"]||0);
              if (t02>0) setShowSold("Team A SOLD!");
              if (t13>0) setShowSold("Team B SOLD!");
            }
            return newGs;
          });
        })
      .subscribe();
    channelRef.current = ch;
  }, []);

  const loadRoomPlayers = async (rid) => {
    const { data } = await supabase.from("room_players").select("*").eq("room_id", rid).order("seat");
    setRoomPlayers(data || []);
  };

  const loadGs = async (rid) => {
    const { data, error: e } = await supabase.from("game_state").select("*").eq("room_id", rid).single();
    if (e) {
      setError("Failed to load game state: " + e.message);
      return;
    }
    if (data) setGs(data);
  };

  // ── Create room ────────────────────────────────────────────────────────────
  const createRoom = async () => {
    if (!playerName.trim()) { setError("Enter your name"); return; }
    setLoading(true); setError("");
    try {
      const rid = genRoomId();
      const { error: roomErr } = await supabase.from("rooms").insert({ id: rid, name: `${playerName}'s Room`, host_id: playerId });
      if (roomErr) { setError("Error creating room: " + roomErr.message); setLoading(false); return; }
      const { error: gsErr } = await supabase.from("game_state").insert({ room_id: rid });
      if (gsErr) { setError("Error initializing game: " + gsErr.message); setLoading(false); return; }
      const { error: playerErr } = await supabase.from("room_players").insert({ room_id: rid, player_id: playerId, player_name: playerName.trim(), seat: 0 });
      if (playerErr) { setError("Error adding player: " + playerErr.message); setLoading(false); return; }
      setRoomId(rid); setMySeat(0);
      await loadRoomPlayers(rid);
      await loadGs(rid);
      subscribeRoom(rid);
      setScreen("room");
    } catch (err) {
      setError("Error: " + (err.message || "Unknown error"));
    }
    setLoading(false);
  };

  // ── Join room ──────────────────────────────────────────────────────────────
  const joinRoom = async () => {
    if (!playerName.trim()) { setError("Enter your name"); return; }
    const rid = joinInput.trim().toUpperCase();
    if (!rid) { setError("Enter room code"); return; }
    setLoading(true); setError("");
    try {
      const { data: room, error: roomErr } = await supabase.from("rooms").select("*").eq("id", rid).single();
      if (roomErr || !room) { setError("Room not found"); setLoading(false); return; }
      const { data: existing, error: existErr } = await supabase
        .from("room_players")
        .select("*")
        .eq("room_id", rid);
      if (existErr) { setError("Error loading room: " + existErr.message); setLoading(false); return; }
      const taken = (existing||[]).map(p=>p.seat);
      // Check if already in room
      const me = (existing||[]).find(p=>p.player_id===playerId);
      if (me) {
        setRoomId(rid);
        setMySeat(me.seat);
        await loadRoomPlayers(rid);
        await loadGs(rid);
        subscribeRoom(rid);
        setScreen("room");
        setLoading(false);
        return;
      }
      const free = [0,1,2,3].find(s=>!taken.includes(s));
      if (free===undefined) { setError("Room is full"); setLoading(false); return; }
      const { error: insertErr } = await supabase.from("room_players").insert({ room_id: rid, player_id: playerId, player_name: playerName.trim(), seat: free });
      if (insertErr) { setError("Error joining room: " + insertErr.message); setLoading(false); return; }
      setRoomId(rid); setMySeat(free);
      await loadRoomPlayers(rid); await loadGs(rid);
      subscribeRoom(rid);
      setScreen("room");
    } catch (err) {
      setError("Error: " + (err.message || "Unknown error"));
    }
    setLoading(false);
  };

  // ── Take a seat ────────────────────────────────────────────────────────────
  const takeSeat = async (seat) => {
    setError("");
    const { error: e } = await supabase.from("room_players").update({ seat }).eq("room_id", roomId).eq("player_id", playerId);
    if (e) { 
      setError("Failed to take seat: " + (e.message || "Unknown error"));
      return;
    }
    setMySeat(seat);
    await loadRoomPlayers(roomId);
  };

  // ── Start game (deal 5) ────────────────────────────────────────────────────
  const startGame = async () => {
    if (roomPlayers.length < 4) { setError("Need 4 players"); return; }
    const { hands, remaining } = dealCards();
    const dealerSeat = gs?.dealer_seat || 0;
    const firstBidder = (dealerSeat + 1) % 4;
    const { error: upErr } = await supabase.from("game_state").update({
      phase: "bidding",
      dealer_seat: dealerSeat,
      current_turn_seat: firstBidder,
      hands: hands,
      remaining_cards: remaining, // we'll store in a temp field
      current_trick: [],
      trick_pile: [],
      pile_owner_seat: null,
      consecutive_wins: 0,
      secured_tricks: { "02": 0, "13": 0 },
      bid_winner_seat: null,
      winning_bid: null,
      bids: {},
      bid_order: [],
      trump_suit: null,
      last_trick_winner: null,
      log: ["Game started! Bidding begins."],
      updated_at: new Date().toISOString()
    }).eq("room_id", roomId);
    if (upErr) {
      setError("Failed to start game: " + upErr.message);
      return;
    }
    await supabase.from("rooms").update({ status: "playing" }).eq("id", roomId);
    // Re-fetch from DB to confirm hands were persisted
    const { data: checkGs, error: checkErr } = await supabase
      .from("game_state")
      .select("phase,hands,updated_at")
      .eq("room_id", roomId)
      .single();
    if (checkErr) {
      setError("Started game but failed to recheck state: " + checkErr.message);
    } else {
      const h = typeof checkGs?.hands === "string" ? JSON.parse(checkGs.hands) : (checkGs?.hands || {});
      const sizes = ["0","1","2","3"].map(k => (h?.[k] || h?.[Number(k)] || []).length);
      if (checkGs?.phase !== "bidding" || sizes.some(s => s !== 5)) {
        setError(`Start wrote unexpected state. phase=${checkGs?.phase} sizes=${sizes.join(",")}`);
      }
    }
    await loadGs(roomId);
    setScreen("game");
  };

  // ── Bid ────────────────────────────────────────────────────────────────────
  const placeBid = async (bid) => {
    if (!gs) return;
    const bids = typeof gs.bids === "string" ? JSON.parse(gs.bids) : (gs.bids||{});
    const bidOrder = typeof gs.bid_order === "string" ? JSON.parse(gs.bid_order) : (gs.bid_order||[]);
    const newBids = { ...bids, [mySeat]: bid };
    const newOrder = [...bidOrder, { seat: mySeat, bid }];
    const dealerSeat = gs.dealer_seat;
    const firstBidder = (dealerSeat + 1) % 4;
    // Determine next bidder
    let nextSeat = (mySeat + 1) % 4;
    // Check if bidding complete (all 4 bid, or someone bid 12)
    const allBid = Object.keys(newBids).length === 4;
    const has12 = bid === 12;
    let phase = "bidding";
    let bidWinner = gs.bid_winner_seat;
    let winBid = gs.winning_bid;
    if (has12 || allBid) {
      // Find highest bid
      let maxBid = 7, maxSeat = firstBidder; // default first bidder if all pass
      for (const [s, b] of Object.entries(newBids)) {
        if (b !== "pass" && b > maxBid) { maxBid = b; maxSeat = parseInt(s); }
      }
      // All passed?
      const allPass = Object.values(newBids).every(b => b === "pass");
      bidWinner = allPass ? firstBidder : maxSeat;
      winBid = allPass ? 8 : maxBid;
      phase = "trump_select";
      nextSeat = bidWinner;
    }
    const log = [...(typeof gs.log==="string"?JSON.parse(gs.log):(gs.log||[]))];
    const pName = roomPlayers.find(p=>p.seat===mySeat)?.player_name||`Seat ${mySeat+1}`;
    log.push(`${pName} bids ${bid==="pass"?"Pass":bid}`);
    await supabase.from("game_state").update({
      bids: newBids, bid_order: newOrder,
      current_turn_seat: nextSeat,
      bid_winner_seat: bidWinner,
      winning_bid: winBid,
      phase,
      log: log.slice(-20),
      updated_at: new Date().toISOString()
    }).eq("room_id", roomId);
  };

  // ── Select trump ───────────────────────────────────────────────────────────
  const selectTrump = async (suit) => {
    if (!gs) return;
    const hands = typeof gs.hands==="string"?JSON.parse(gs.hands):gs.hands;
    const remaining = typeof gs.remaining_cards==="string"?JSON.parse(gs.remaining_cards):(gs.remaining_cards||[]);
    const finalHands = finalDeal(hands, remaining);
    const log = [...(typeof gs.log==="string"?JSON.parse(gs.log):(gs.log||[]))];
    const pName = roomPlayers.find(p=>p.seat===mySeat)?.player_name||`Seat ${mySeat+1}`;
    log.push(`${pName} selects ${suit} as trump`);
    // First player to move is bid winner
    const firstTurn = gs.bid_winner_seat;
    await supabase.from("game_state").update({
      trump_suit: suit,
      hands: finalHands,
      remaining_cards: null,
      phase: "playing",
      current_turn_seat: firstTurn,
      log: log.slice(-20),
      updated_at: new Date().toISOString()
    }).eq("room_id", roomId);
  };

  // ── Play card ──────────────────────────────────────────────────────────────
  const playCard = async (card) => {
    if (!gs || gs.current_turn_seat !== mySeat) return;
    const hands = typeof gs.hands==="string"?JSON.parse(gs.hands):gs.hands;
    const myHand = [...(hands[mySeat]||[])];
    const trick = typeof gs.current_trick==="string"?JSON.parse(gs.current_trick):(gs.current_trick||[]);
    const trump = gs.trump_suit;
    const trumpSuit = SUIT_FROM_NAME[trump];
    // Validate follow-suit
    if (trick.length > 0) {
      const lead = cardSuit(trick[0].card);
      const hasLead = myHand.some(c => cardSuit(c) === lead);
      if (hasLead && cardSuit(card) !== lead) { setError("Must follow suit!"); return; }
      if (!hasLead && cardSuit(card) === trumpSuit) {
        // Can play trump when no lead suit - OK
      }
    }
    setError("");
    setSelectedCard(null);
    const newHand = myHand.filter(c => c !== card);
    const newTrick = [...trick, { seat: mySeat, card }];
    const newHands = { ...hands, [mySeat]: newHand };
    const log = [...(typeof gs.log==="string"?JSON.parse(gs.log):(gs.log||[]))];
    const pName = roomPlayers.find(p=>p.seat===mySeat)?.player_name||`Seat ${mySeat+1}`;
    log.push(`${pName} plays ${card}`);

    let updates = { hands: newHands, current_trick: newTrick, log: log.slice(-20), updated_at: new Date().toISOString() };

    if (newTrick.length === 4) {
      // Resolve trick
      const winner = whoWinsTrick(newTrick, trump);
      const winTeam = seatTeam(winner);
      const winPName = roomPlayers.find(p=>p.seat===winner)?.player_name||`Seat ${winner+1}`;
      const pile = typeof gs.trick_pile==="string"?JSON.parse(gs.trick_pile):(gs.trick_pile||[]);
      const newPile = [...pile, ...newTrick];
      const prevOwner = gs.pile_owner_seat;
      const prevConsec = gs.consecutive_wins || 0;
      let newConsec, newPileOwner, secured = typeof gs.secured_tricks==="string"?JSON.parse(gs.secured_tricks):(gs.secured_tricks||{"02":0,"13":0});
      
      if (prevOwner === winner) {
        // Same player wins again → secure pile
        newConsec = prevConsec + 1;
        newPileOwner = winner;
        // Secure all tricks in pile (count them - each trick = 4 cards, 4 played cards = 1 trick)
        const tricksInPile = Math.floor(newPile.length / 4);
        secured = { ...secured, [winTeam]: (secured[winTeam]||0) + tricksInPile };
        log.push(`★ ${winPName} secures ${tricksInPile} trick(s)!`);
        updates.trick_pile = [];
        updates.pile_owner_seat = null;
        updates.consecutive_wins = 0;
      } else {
        newConsec = 1;
        newPileOwner = winner;
        updates.trick_pile = newPile;
        updates.pile_owner_seat = winner;
        updates.consecutive_wins = 1;
        log.push(`${winPName} wins trick (pile grows)`);
      }
      updates.secured_tricks = secured;
      updates.current_trick = [];
      updates.last_trick_winner = winner;
      updates.log = log.slice(-20);

      // Check if round over (all cards played = 13 tricks = 52 cards)
      const totalSecured = (secured["02"]||0) + (secured["13"]||0);
      // If pile still remaining + secured = 13 total
      const pileLeft = updates.trick_pile ? Math.floor((typeof updates.trick_pile==="string"?JSON.parse(updates.trick_pile):updates.trick_pile).length / 4) : 0;
      if (totalSecured + pileLeft >= 13 || Object.values(newHands).every(h=>h.length===0)) {
        // Also, any remaining pile goes unsecured (if hand ends without 2-consec)
        updates = await resolveRoundEnd(updates, secured, newPile.length > 0 && !updates.trick_pile?.length === false ? newPile : [], log);
      } else {
        updates.current_turn_seat = winner;
        updates.phase = "playing";
      }
    } else {
      updates.current_turn_seat = (mySeat + 1) % 4;
    }

    await supabase.from("game_state").update(updates).eq("room_id", roomId);
  };

  const resolveRoundEnd = async (updates, secured, remainingPile, log) => {
    const pieces = typeof gs.pieces==="string"?JSON.parse(gs.pieces):(gs.pieces||{"02":0,"13":0});
    const soldCount = typeof gs.sold_count==="string"?JSON.parse(gs.sold_count):(gs.sold_count||{"02":0,"13":0});
    const bidWinner = gs.bid_winner_seat;
    const bidTeam = seatTeam(bidWinner);
    const bidVal = gs.winning_bid || 8;
    const teamTricks = secured[bidTeam] || 0;
    const newPieces = { ...pieces };
    const newSold = { ...soldCount };
    let newDistributor = typeof gs.distributor_team==="string"?gs.distributor_team:"02";

    // Surry check
    if (teamTricks === 13) {
      log.push(`★★★ SURRY! ${bidTeam==="02"?"Team A":"Team B"} wins ALL 13 tricks!`);
    }

    if (teamTricks >= bidVal) {
      // Success - score goes to opponent
      const opp = bidTeam === "02" ? "13" : "02";
      newPieces[opp] = (newPieces[opp]||0) + teamTricks;
      log.push(`${bidTeam==="02"?"Team A":"Team B"} made their bid! +${teamTricks} pieces to opponents.`);
    } else {
      // Failure - penalty = 2x bid added to bidding team
      const penalty = bidVal * 2;
      newPieces[bidTeam] = (newPieces[bidTeam]||0) + penalty;
      log.push(`${bidTeam==="02"?"Team A":"Team B"} failed bid! +${penalty} piece penalty.`);
    }

    // Check SOLD (>52)
    for (const t of ["02","13"]) {
      if (newPieces[t] > 52) {
        newSold[t] = (newSold[t]||0) + 1;
        newPieces[t] = 0;
        // Distributor shifts to teammate - simplified: toggle distributor to other team
        newDistributor = t === "02" ? "13" : "02";
        log.push(`SOLD! ${t==="02"?"Team A":"Team B"} pieces reset to 0. Times SOLD: ${newSold[t]}`);
      }
    }

    // Determine distributor = team with MORE pieces
    if (newPieces["02"] !== newPieces["13"]) {
      newDistributor = newPieces["02"] > newPieces["13"] ? "02" : "13";
    }

    updates.phase = "round_end";
    updates.pieces = newPieces;
    updates.sold_count = newSold;
    updates.distributor_team = newDistributor;
    updates.round_number = (gs.round_number||1) + 1;
    updates.log = log.slice(-20);
    setShowResult({ secured, bidTeam, bidVal, pieces: newPieces, sold: newSold });
    return updates;
  };

  // ── Next round ─────────────────────────────────────────────────────────────
  const nextRound = async () => {
    setShowResult(null);
    const pieces = typeof gs.pieces==="string"?JSON.parse(gs.pieces):(gs.pieces||{"02":0,"13":0});
    const soldCount = typeof gs.sold_count==="string"?JSON.parse(gs.sold_count):(gs.sold_count||{"02":0,"13":0});
    // New dealer = next seat from current dealer
    const newDealer = ((gs.dealer_seat||0) + 1) % 4;
    const { hands, remaining } = dealCards();
    const firstBidder = (newDealer + 1) % 4;
    await supabase.from("game_state").update({
      phase: "bidding",
      dealer_seat: newDealer,
      current_turn_seat: firstBidder,
      hands,
      remaining_cards: remaining,
      current_trick: [],
      trick_pile: [],
      pile_owner_seat: null,
      consecutive_wins: 0,
      secured_tricks: { "02": 0, "13": 0 },
      bid_winner_seat: null,
      winning_bid: null,
      bids: {},
      bid_order: [],
      trump_suit: null,
      last_trick_winner: null,
      log: [...(typeof gs.log==="string"?JSON.parse(gs.log):(gs.log||[])), "New round begins!"].slice(-20),
      updated_at: new Date().toISOString()
    }).eq("room_id", roomId);
  };

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen === "game" && gs?.phase === "round_end" && !showResult) {
      // Already set by resolveRoundEnd for the player who triggered it
      // For others, derive from gs
      const secured = typeof gs.secured_tricks==="string"?JSON.parse(gs.secured_tricks):(gs.secured_tricks||{});
      const pieces = typeof gs.pieces==="string"?JSON.parse(gs.pieces):(gs.pieces||{});
      const sold = typeof gs.sold_count==="string"?JSON.parse(gs.sold_count):(gs.sold_count||{});
      setShowResult({ secured, bidTeam: seatTeam(gs.bid_winner_seat||0), bidVal: gs.winning_bid||8, pieces, sold });
    }
    if (gs?.phase !== "round_end") setShowResult(null);
  }, [gs?.phase]);

  useEffect(() => {
    if (showSold) { setTimeout(() => setShowSold(null), 2500); }
  }, [showSold]);

  // ── Reconnect to active room on load ──────────────────────────────────────
  useEffect(() => {
    const savedRoom = localStorage.getItem("surry_room");
    const savedSeat = localStorage.getItem("surry_seat");
    if (savedRoom && savedSeat !== null) {
      setRoomId(savedRoom);
      setMySeat(parseInt(savedSeat));
      loadRoomPlayers(savedRoom);
      loadGs(savedRoom);
      subscribeRoom(savedRoom);
      // Set screen based on game state
      setTimeout(() => {
        setScreen("room"); // Will auto-switch to game if gs.phase is set
      }, 100);
    }
  }, []);

  useEffect(() => {
    if (roomId && mySeat !== null) {
      localStorage.setItem("surry_room", roomId);
      localStorage.setItem("surry_seat", mySeat);
    }
  }, [roomId, mySeat]);

  // Ensure mySeat is set (derive from room_players if missing)
  useEffect(() => {
    if (!roomId) return;
    if (mySeat !== null) return;
    if (!roomPlayers || roomPlayers.length === 0) return;
    const me = roomPlayers.find(p => p.player_id === playerId);
    if (me && typeof me.seat === "number") {
      setMySeat(me.seat);
    }
  }, [roomId, mySeat, roomPlayers, playerId]);

  // Fallback sync (if Supabase Realtime isn't enabled)
  useEffect(() => {
    if (!roomId) return;
    if (screen !== "room" && screen !== "game") return;
    const t = setInterval(() => {
      loadRoomPlayers(roomId);
      loadGs(roomId);
    }, 1500);
    return () => clearInterval(t);
  }, [roomId, screen]);

  // Auto-switch to game screen if game active
  useEffect(() => {
    if (gs && gs.phase && gs.phase !== "waiting" && screen === "room") {
      setScreen("game");
    }
  }, [gs?.phase, screen]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const hands = gs ? (typeof gs.hands==="string"?JSON.parse(gs.hands):(gs.hands||{})) : {};
  const myHandRaw = mySeat === null ? [] : (hands?.[mySeat] || hands?.[String(mySeat)] || []);
  const myHand = (myHandRaw || []).sort((a,b) => {
    const as = cardSuit(a), bs2 = cardSuit(b);
    if (as !== bs2) return SUITS.indexOf(as) - SUITS.indexOf(bs2);
    return cardVal(b) - cardVal(a);
  });
  const trick = gs ? (typeof gs.current_trick==="string"?JSON.parse(gs.current_trick):(gs.current_trick||[])) : [];
  const pile = gs ? (typeof gs.trick_pile==="string"?JSON.parse(gs.trick_pile):(gs.trick_pile||[])) : [];
  const secured = gs ? (typeof gs.secured_tricks==="string"?JSON.parse(gs.secured_tricks):(gs.secured_tricks||{"02":0,"13":0})) : {"02":0,"13":0};
  const pieces = gs ? (typeof gs.pieces==="string"?JSON.parse(gs.pieces):(gs.pieces||{"02":0,"13":0})) : {"02":0,"13":0};
  const soldCount = gs ? (typeof gs.sold_count==="string"?JSON.parse(gs.sold_count):(gs.sold_count||{"02":0,"13":0})) : {"02":0,"13":0};
  const bids = gs ? (typeof gs.bids==="string"?JSON.parse(gs.bids):(gs.bids||{})) : {};
  const log = gs ? (typeof gs.log==="string"?JSON.parse(gs.log):(gs.log||[])) : [];
  const isMyTurn = gs?.current_turn_seat === mySeat;
  const myTeam = mySeat !== null ? seatTeam(mySeat) : null;
  const trumpSymbol = gs?.trump_suit ? SUIT_FROM_NAME[gs.trump_suit] : null;

  // Valid bids for current player
  const maxBid = Math.max(...Object.values(bids).filter(b=>b!=="pass").map(Number), 8);
  const validBids = ["pass",9,10,11,12].filter(b => b==="pass" || b > maxBid);

  // Playable cards
  const getPlayable = () => {
    if (!isMyTurn || gs?.phase !== "playing") return [];
    if (trick.length === 0) return myHand; // lead - can play anything
    const lead = cardSuit(trick[0].card);
    const hasLead = myHand.some(c => cardSuit(c) === lead);
    if (hasLead) return myHand.filter(c => cardSuit(c) === lead);
    return myHand; // no lead suit, can play anything
  };
  const playable = getPlayable();

  const getPlayerAt = (seat) => roomPlayers.find(p => p.seat === seat);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style dangerouslySetInnerHTML={{__html: CSS}}/>
      <div className="felt">

        {/* HOME */}
        {screen === "home" && (
          <div className="lobby">
            <div className="text-center">
              <div className="logo">SURRY</div>
              <div className="logo-sub">taash • trick-taking • 4 players</div>
            </div>
            <div className="card-panel">
              <div className="panel-title">Your Name</div>
              <input className="inp" placeholder="Enter your name..." value={playerName} onChange={e=>saveName(e.target.value)} maxLength={20}/>
              <div style={{height:"1.5rem"}}/>
              <div className="flex flex-col gap-1">
                <button className="btn btn-gold w-full" onClick={()=>setScreen("create")}>Create Room</button>
                <div className="divider" style={{margin:"0.5rem 0"}}>or</div>
                <div className="flex gap-1">
                  <input className="inp" placeholder="Room code..." value={joinInput} onChange={e=>setJoinInput(e.target.value.toUpperCase())} maxLength={5} style={{flex:1}}/>
                  <button className="btn btn-outline" onClick={joinRoom} disabled={loading}>Join</button>
                </div>
              </div>
              {error && <div style={{color:"#e74c3c",fontSize:"0.75rem",marginTop:"0.5rem"}}>{error}</div>}
            </div>
            <div style={{color:"var(--cream-d)",fontSize:"0.68rem",textAlign:"center",maxWidth:320,lineHeight:1.6}}>
              Win 2 consecutive tricks to secure the pile.<br/>
              Teams: Seats 1&3 vs 2&4. Be the one to bid and dominate.
            </div>
          </div>
        )}

        {/* CREATE */}
        {screen === "create" && (
          <div className="lobby">
            <div className="logo" style={{fontSize:"2rem"}}>New Room</div>
            <div className="card-panel">
              <div className="panel-title">Playing as</div>
              <input className="inp" value={playerName} onChange={e=>saveName(e.target.value)} maxLength={20}/>
              <div style={{height:"1.5rem"}}/>
              <button className="btn btn-gold w-full" onClick={createRoom} disabled={loading}>
                {loading ? "Creating..." : "Create & Join"}
              </button>
              <button className="btn btn-outline w-full mt-1" onClick={()=>setScreen("home")}>Back</button>
              {error && <div style={{color:"#e74c3c",fontSize:"0.75rem",marginTop:"0.5rem"}}>{error}</div>}
            </div>
          </div>
        )}

        {/* ROOM LOBBY */}
        {screen === "room" && (
          <div className="lobby">
            <div className="room-header">Room Lobby</div>
            <div style={{display:"flex",gap:"0.75rem",alignItems:"center"}}>
              <div className="room-id-badge">{roomId}</div>
              <button className="btn btn-outline btn-sm" onClick={()=>navigator.clipboard.writeText(roomId)}>Copy</button>
            </div>
            <div className="card-panel" style={{maxWidth:480}}>
              <div className="panel-title">Seats — Teams: ♦ A (0,2) vs ♣ B (1,3)</div>
              <div className="seat-grid">
                {[0,1,2,3].map(seat => {
                  const p = getPlayerAt(seat);
                  const isMe = p?.player_id === playerId;
                  const teamColor = [0,2].includes(seat) ? "team-a" : "team-b";
                  return (
                    <div key={seat} className={`seat-card ${p?"taken":""} ${isMe?"mine":""}`}>
                      <div className={`seat-dot ${p?"filled":"empty"}`} style={{color: p?"#90ee90":"var(--cream-d)"}}>
                        {p ? p.player_name.slice(0,2).toUpperCase() : seat+1}
                      </div>
                      <div>
                        <div className={`${teamColor}`} style={{fontSize:"0.7rem",letterSpacing:1}}>
                          {[0,2].includes(seat)?"Team A":"Team B"} · Seat {seat+1}
                        </div>
                        <div style={{fontSize:"0.8rem",color:"var(--cream)"}}>
                          {p ? p.player_name : <span style={{color:"var(--cream-d)"}}>Empty</span>}
                          {isMe && <span style={{color:"var(--gold)",marginLeft:4}}>(you)</span>}
                        </div>
                      </div>
                      {!p && (
                        <button className="btn btn-outline btn-sm" style={{marginLeft:"auto"}} onClick={()=>takeSeat(seat)}>
                          Sit
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{fontSize:"0.7rem",color:"var(--cream-d)",marginBottom:"1rem"}}>
                Players: {roomPlayers.length}/4
                {roomPlayers.length < 4 && <span className="waiting-pulse"> · Waiting for players...</span>}
              </div>
              {roomPlayers.length === 4 && [0,1,2,3].every(s => roomPlayers.some(p=>p.seat===s)) && (
                <button className="btn btn-gold w-full" onClick={startGame}>Start Game</button>
              )}
              {error && <div style={{color:"#e74c3c",fontSize:"0.75rem",marginTop:"0.5rem"}}>{error}</div>}
            </div>
          </div>
        )}

        {/* GAME */}
        {screen === "game" && gs && (
          <div className="game-wrap">
            {/* Info */}
            <div className="info-bar">
              <div className="info-chip">Room <span>{roomId}</span></div>
              <div className="info-chip">Phase <span>{gs.phase}</span></div>
              {gs.trump_suit && <div className="info-chip">Trump <span style={{color:["♥","♦"].includes(trumpSymbol)?"var(--suit-red)":"var(--cream)"}}>{trumpSymbol} {gs.trump_suit}</span></div>}
              {gs.winning_bid && <div className="info-chip">Bid <span>{gs.winning_bid}</span> by <span>{getPlayerAt(gs.bid_winner_seat)?.player_name||"?"}</span></div>}
              <div className="info-chip">Round <span>{gs.round_number||1}</span></div>
            </div>

            {/* Score */}
            <div className="score-wrap">
              {["02","13"].map(t => (
                <div key={t} className="score-card" style={{borderColor: t===myTeam?"rgba(201,168,76,0.4)":"var(--border)"}}>
                  <div className="score-label">{t==="02"?"Team A (seats 1,3)":"Team B (seats 2,4)"}{t===myTeam?" · YOU":""}</div>
                  <div style={{display:"flex",gap:"1rem",alignItems:"baseline"}}>
                    <div><div style={{fontSize:"0.6rem",color:"var(--cream-d)"}}>pieces</div><div className="score-val">{pieces[t]||0}</div></div>
                    <div><div style={{fontSize:"0.6rem",color:"var(--cream-d)"}}>tricks</div><div className="score-val" style={{fontSize:"1rem"}}>{secured[t]||0}</div></div>
                    <div><div style={{fontSize:"0.6rem",color:"var(--cream-d)"}}>sold</div><div className="score-val" style={{fontSize:"1rem",color:"var(--red-l)"}}>{soldCount[t]||0}</div></div>
                  </div>
                  {gs.distributor_team === t && <div style={{fontSize:"0.6rem",color:"var(--red-l)",marginTop:4}}>▲ DISTRIBUTOR</div>}
                </div>
              ))}
            </div>

            {/* Table */}
            <div className="table-area" style={{position:"relative",margin:"0.5rem 0"}}>
              {/* Player positions */}
              {[0,1,2,3].map(seat => {
                const relSeat = ((seat - mySeat) + 4) % 4;
                const pos = ["bottom","right","top","left"][relSeat];
                const p = getPlayerAt(seat);
                const isActive = gs.current_turn_seat === seat;
                const team = seatTeam(seat);
                return (
                  <div key={seat} className={`player-pos ${pos}`}>
                    <div className={`player-name-badge ${seat===mySeat?"my-badge":""} ${isActive?"active":""}`}>
                      {p?.player_name||`Seat ${seat+1}`} {isActive?"●":""}
                    </div>
                    <div style={{fontSize:"0.6rem",color:team==="02"?"#7ec8e3":"#f4a261"}}>
                      {team==="02"?"A":"B"}
                    </div>
                    {/* Face-down cards for others */}
                    {seat !== mySeat && (
                      <div style={{display:"flex",gap:2}}>
                        {(hands[seat]||[]).slice(0,Math.min(5,(hands[seat]||[]).length)).map((_,i)=>(
                          <div key={i} className="card card-sm back"/>
                        ))}
                        {(hands[seat]||[]).length > 5 && <div style={{fontSize:"0.6rem",color:"var(--cream-d)",alignSelf:"center"}}>+{(hands[seat]||[]).length-5}</div>}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Center trick */}
              <TrickDisplay trick={trick} mySeat={mySeat}/>

              {/* Pile count */}
              {pile.length > 0 && (
                <div className="pile-badge">Pile: {Math.floor(pile.length/4)} trick{Math.floor(pile.length/4)!==1?"s":""}</div>
              )}
            </div>

            {/* Phase-specific UI */}
            {gs.phase === "bidding" && (
              <div className="bid-panel">
                <div style={{fontSize:"0.7rem",color:"var(--cream-d)"}}>
                  {isMyTurn ? "★ YOUR TURN TO BID" : `Waiting for ${getPlayerAt(gs.current_turn_seat)?.player_name||"..."}...`}
                </div>
                <div style={{fontSize:"0.65rem",color:"var(--cream-d)",marginTop:6}}>
                  Seat: <span style={{color:"var(--cream)"}}>{mySeat===null?"?":(mySeat+1)}</span>{" "}
                  · Hand cards: <span style={{color:"var(--cream)"}}>{(hands?.[mySeat]||[]).length}</span>
                </div>
                <div style={{fontSize:"0.62rem",color:"var(--cream-d)",marginTop:6,opacity:0.9,lineHeight:1.6}}>
                  gs.phase: <span style={{color:"var(--cream)"}}>{String(gs?.phase||"")}</span>{" "}
                  · hands keys: <span style={{color:"var(--cream)"}}>{hands ? Object.keys(hands).join(",") : "none"}</span>
                  <br/>
                  hand sizes:{" "}
                  <span style={{color:"var(--cream)"}}>
                    {["0","1","2","3"].map(k => `${k}:${(hands?.[k]||[]).length}`).join("  ")}
                  </span>
                </div>
                <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid var(--border)"}}>
                  <div style={{fontSize:"0.65rem",color:"var(--cream-d)",marginBottom:6,letterSpacing:2,textAlign:"center"}}>
                    Initial 5-card hand (use this to bid)
                  </div>
                  <div className="hand-wrap" style={{maxWidth:"100%",padding:0}}>
                    {myHand.map(card => (
                      <CardView key={card} card={card} playable={false} />
                    ))}
                  </div>
                  {myHand.length === 0 && (
                    <div style={{marginTop:8,fontSize:"0.7rem",color:"#e74c3c",textAlign:"center"}}>
                      No cards loaded for your seat yet.
                      <div style={{fontSize:"0.62rem",color:"var(--cream-d)",marginTop:4}}>
                        Tip: If testing with multiple players, use separate tabs (now supported) and ensure Start Game shows no DB error.
                      </div>
                    </div>
                  )}
                </div>
                {Object.entries(bids).map(([s,b]) => (
                  <div key={s} style={{fontSize:"0.7rem",color:"var(--cream-d)",marginTop:2}}>
                    {getPlayerAt(parseInt(s))?.player_name}: {b==="pass"?"Pass":b}
                  </div>
                ))}
                {isMyTurn && (
                  <div className="bid-btns">
                    {validBids.map(b => (
                      <button key={b} className={`bid-btn ${b==="pass"?"pass-btn":""}`} onClick={()=>placeBid(b)}>
                        {b==="pass"?"Pass":b}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {gs.phase === "trump_select" && isMyTurn && gs.bid_winner_seat === mySeat && (
              <div className="bid-panel">
                <div style={{fontSize:"0.7rem",color:"var(--gold)"}}>★ YOU WON THE BID ({gs.winning_bid}) — SELECT TRUMP</div>
                <div className="trump-btns">
                  {SUITS.map(s => (
                    <button key={s} className={`trump-btn ${["♥","♦"].includes(s)?"red-suit":"black-suit"}`}
                      onClick={()=>selectTrump(SUIT_NAMES[s])}>
                      <span style={{fontSize:"1.8rem"}}>{s}</span>
                      <span style={{fontSize:"0.6rem"}}>{SUIT_NAMES[s]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {gs.phase === "trump_select" && gs.bid_winner_seat !== mySeat && (
              <div className="bid-panel">
                <div style={{fontSize:"0.7rem",color:"var(--cream-d)"}}>
                  Waiting for {getPlayerAt(gs.bid_winner_seat)?.player_name||"..."} to select trump...
                </div>
              </div>
            )}

            {/* My hand */}
            {gs.phase === "playing" && (
              <div style={{width:"100%",maxWidth:700,padding:"0.5rem"}}>
                <div style={{fontSize:"0.65rem",color:isMyTurn?"var(--gold)":"var(--cream-d)",marginBottom:4,textAlign:"center",letterSpacing:2}}>
                  {isMyTurn ? "★ YOUR TURN — TAP A CARD TO PLAY" : `Waiting for ${getPlayerAt(gs.current_turn_seat)?.player_name||"..."}...`}
                </div>
                <div className="hand-wrap">
                  {myHand.map(card => {
                    const isPlayable = playable.includes(card);
                    return (
                      <CardView
                        key={card}
                        card={card}
                        playable={gs.phase === "playing" ? isPlayable : false}
                        selected={selectedCard === card}
                        onClick={() => {
                          if (gs.phase !== "playing") return;
                          if (selectedCard === card) { playCard(card); setSelectedCard(null); }
                          else setSelectedCard(card);
                        }}
                      />
                    );
                  })}
                </div>
                {selectedCard && (
                  <div style={{textAlign:"center",marginTop:4}}>
                    <button className="btn btn-gold btn-sm" onClick={()=>playCard(selectedCard)}>
                      Play {selectedCard}
                    </button>
                    <button className="btn btn-outline btn-sm" style={{marginLeft:8}} onClick={()=>setSelectedCard(null)}>
                      Cancel
                    </button>
                  </div>
                )}
                {error && <div style={{color:"#e74c3c",fontSize:"0.75rem",textAlign:"center",marginTop:4}}>{error}</div>}
              </div>
            )}

            {/* Log */}
            <div className="log-wrap" ref={el => el && (el.scrollTop = el.scrollHeight)}>
              {log.map((l,i) => <div key={i} className="log-entry">{l}</div>)}
            </div>

            <button className="btn btn-outline btn-sm" style={{marginTop:8}} onClick={()=>setScreen("room")}>← Lobby</button>
          </div>
        )}

        {/* Round result overlay */}
        {showResult && (
          <div className="result-overlay">
            <div className="result-panel">
              <div className="result-title">Round Over</div>
              <div style={{marginBottom:"1rem",lineHeight:1.8,fontSize:"0.85rem"}}>
                {["02","13"].map(t => (
                  <div key={t}>
                    <span style={{color:t==="02"?"#7ec8e3":"#f4a261"}}>{t==="02"?"Team A":"Team B"}</span>: {showResult.secured[t]||0} tricks · {showResult.pieces[t]||0} pieces {showResult.sold[t]>0?`· SOLD ${showResult.sold[t]}x`:""}
                  </div>
                ))}
              </div>
              <div style={{fontSize:"0.75rem",color:"var(--cream-d)",marginBottom:"1.5rem"}}>
                Bid was {showResult.bidVal} by {showResult.bidTeam==="02"?"Team A":"Team B"}
                {(showResult.secured[showResult.bidTeam]||0) >= showResult.bidVal
                  ? " — ✓ Made!" : " — ✗ Failed!"}
              </div>
              <button className="btn btn-gold w-full" onClick={nextRound}>Next Round</button>
            </div>
          </div>
        )}

        {/* SOLD flash */}
        {showSold && <div className="sold-flash">SOLD!</div>}
      </div>
    </>
  );
}
