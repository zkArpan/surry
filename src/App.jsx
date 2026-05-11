import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./lib/supabase";
import { 
  dealCards, finalDeal, whoWinsTrick, genRoomId, genPlayerId, 
  seatTeam, cardSuit, cardVal, SUITS, SUIT_FROM_NAME 
} from "./lib/gameLogic";

import LobbyScreen from "./components/LobbyScreen";
import RoomScreen from "./components/RoomScreen";
import GameScreen from "./components/GameScreen";

export default function App() {
  const [screen, setScreen] = useState("home"); // home, create, join, room, game
  const [playerName, setPlayerName] = useState(() => localStorage.getItem("surry_name") || "");
  const [playerId] = useState(() => {
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
  const [gs, setGs] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showResult, setShowResult] = useState(null);
  const [showSold, setShowSold] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const channelRef = useRef(null);

  const saveName = (n) => { setPlayerName(n); localStorage.setItem("surry_name", n); };

  // ── Subscribe to room ──────────────────────────────────────────────────────
  const subscribeRoom = useCallback((rid) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const ch = supabase.channel(`room:${rid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${rid}` },
        () => loadRoomPlayers(rid))
      .on("postgres_changes", { event: "*", schema: "public", table: "game_state", filter: `room_id=eq.${rid}` },
        (payload) => {
          const newGs = payload?.new;
          if (!newGs || !newGs.phase) {
            loadGs(rid);
            return;
          }
          setGs(prev => {
            if (prev && newGs.sold_count) {
              const prevSold = typeof prev.sold_count === "string" ? JSON.parse(prev.sold_count) : prev.sold_count;
              const newSold = typeof newGs.sold_count === "string" ? JSON.parse(newGs.sold_count) : newGs.sold_count;
              // Check if any player got SOLD (increased sold count)
              for (let seat = 0; seat < 4; seat++) {
                const seatStr = String(seat);
                if ((newSold[seatStr] || 0) > (prevSold[seatStr] || 0)) {
                  const player = roomPlayers?.find(p => p.seat === seat);
                  setShowSold(`${player?.player_name || "Seat " + seat} SOLD!`);
                  break;
                }
              }
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
      if (roomErr) throw roomErr;
      const { error: gsErr } = await supabase.from("game_state").insert({ room_id: rid });
      if (gsErr) throw gsErr;
      const { error: playerErr } = await supabase.from("room_players").insert({ room_id: rid, player_id: playerId, player_name: playerName.trim(), seat: 0 });
      if (playerErr) throw playerErr;
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
      const { data: existing, error: existErr } = await supabase.from("room_players").select("*").eq("room_id", rid);
      if (existErr) throw existErr;
      const taken = (existing || []).map(p => p.seat);
      const me = (existing || []).find(p => p.player_id === playerId);
      if (me) {
        setRoomId(rid); setMySeat(me.seat);
        await loadRoomPlayers(rid); await loadGs(rid);
        subscribeRoom(rid); setScreen("room"); setLoading(false); return;
      }
      const free = [0, 1, 2, 3].find(s => !taken.includes(s));
      if (free === undefined) { setError("Room is full"); setLoading(false); return; }
      const { error: insertErr } = await supabase.from("room_players").insert({ room_id: rid, player_id: playerId, player_name: playerName.trim(), seat: free });
      if (insertErr) throw insertErr;
      setRoomId(rid); setMySeat(free);
      await loadRoomPlayers(rid); await loadGs(rid);
      subscribeRoom(rid); setScreen("room");
    } catch (err) {
      setError("Error: " + (err.message || "Unknown error"));
    }
    setLoading(false);
  };

  // ── Take a seat ────────────────────────────────────────────────────────────
  const takeSeat = async (seat) => {
    setError("");
    const { error: e } = await supabase.from("room_players").update({ seat }).eq("room_id", roomId).eq("player_id", playerId);
    if (e) { setError("Failed to take seat: " + (e.message || "Unknown error")); return; }
    setMySeat(seat);
    await loadRoomPlayers(roomId);
  };

  // ── Start game ─────────────────────────────────────────────────────────────
  const startGame = async () => {
    if (roomPlayers.length < 4) { setError("Need 4 players"); return; }
    const { hands, remaining } = dealCards();
    const dealerSeat = gs?.dealer_seat || 0;
    const firstBidder = (dealerSeat + 1) % 4;
    const { error: upErr } = await supabase.from("game_state").update({
      phase: "bidding",
      dealer_seat: dealerSeat,
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
      pieces: { "0": 0, "1": 0, "2": 0, "3": 0 },
      sold_count: { "0": 0, "1": 0, "2": 0, "3": 0 },
      distributor_seat: 0,
      log: ["Game started! Bidding begins."],
      updated_at: new Date().toISOString()
    }).eq("room_id", roomId);
    if (upErr) { setError("Failed to start game: " + upErr.message); return; }
    await supabase.from("rooms").update({ status: "playing" }).eq("id", roomId);
    await loadGs(roomId);
    setScreen("game");
  };

  // ── Bid ────────────────────────────────────────────────────────────────────
  const placeBid = async (bid) => {
    if (!gs) return;
    const bids = typeof gs.bids === "string" ? JSON.parse(gs.bids) : (gs.bids || {});
    const bidOrder = typeof gs.bid_order === "string" ? JSON.parse(gs.bid_order) : (gs.bid_order || []);
    const newBids = { ...bids, [mySeat]: bid };
    const newOrder = [...bidOrder, { seat: mySeat, bid }];
    const firstBidder = (gs.dealer_seat + 1) % 4;
    let nextSeat = (mySeat + 1) % 4;
    const allBid = Object.keys(newBids).length === 4;
    const has12 = bid === 12;
    let phase = "bidding";
    let bidWinner = gs.bid_winner_seat;
    let winBid = gs.winning_bid;
    if (has12 || allBid) {
      let maxBid = 7, maxSeat = firstBidder;
      for (const [s, b] of Object.entries(newBids)) {
        if (b !== "pass" && b > maxBid) { maxBid = b; maxSeat = parseInt(s); }
      }
      const allPass = Object.values(newBids).every(b => b === "pass");
      bidWinner = allPass ? firstBidder : maxSeat;
      winBid = allPass ? 8 : maxBid;
      phase = "trump_select";
      nextSeat = bidWinner;
    }
    const log = [...(typeof gs.log === "string" ? JSON.parse(gs.log) : (gs.log || []))];
    const pName = roomPlayers.find(p => p.seat === mySeat)?.player_name || `Seat ${mySeat + 1}`;
    log.push(`${pName} bids ${bid === "pass" ? "Pass" : bid}`);
    await supabase.from("game_state").update({
      bids: newBids, bid_order: newOrder, current_turn_seat: nextSeat,
      bid_winner_seat: bidWinner, winning_bid: winBid, phase,
      log: log.slice(-20), updated_at: new Date().toISOString()
    }).eq("room_id", roomId);
  };

  // ── Select trump ───────────────────────────────────────────────────────────
  const selectTrump = async (suit) => {
    if (!gs) return;
    const hands = typeof gs.hands === "string" ? JSON.parse(gs.hands) : gs.hands;
    const remaining = typeof gs.remaining_cards === "string" ? JSON.parse(gs.remaining_cards) : (gs.remaining_cards || []);
    const finalHands = finalDeal(hands, remaining);
    const log = [...(typeof gs.log === "string" ? JSON.parse(gs.log) : (gs.log || []))];
    const pName = roomPlayers.find(p => p.seat === mySeat)?.player_name || `Seat ${mySeat + 1}`;
    log.push(`${pName} selects ${suit} as trump`);
    await supabase.from("game_state").update({
      trump_suit: suit, hands: finalHands, remaining_cards: null, phase: "playing",
      current_turn_seat: gs.bid_winner_seat, log: log.slice(-20), updated_at: new Date().toISOString()
    }).eq("room_id", roomId);
  };

  // ── Play card ──────────────────────────────────────────────────────────────
  const playCard = async (card) => {
    if (!gs || gs.current_turn_seat !== mySeat) return;
    const hands = typeof gs.hands === "string" ? JSON.parse(gs.hands) : gs.hands;
    const myHand = [...(hands[mySeat] || [])];
    const trick = typeof gs.current_trick === "string" ? JSON.parse(gs.current_trick) : (gs.current_trick || []);
    const trumpSuit = SUIT_FROM_NAME[gs.trump_suit];
    if (trick.length > 0) {
      const lead = cardSuit(trick[0].card);
      const hasLead = myHand.some(c => cardSuit(c) === lead);
      if (hasLead && cardSuit(card) !== lead) { setError("Must follow suit!"); return; }
    }
    setError(""); setSelectedCard(null);
    const newHand = myHand.filter(c => c !== card);
    const newTrick = [...trick, { seat: mySeat, card }];
    const newHands = { ...hands, [mySeat]: newHand };
    const log = [...(typeof gs.log === "string" ? JSON.parse(gs.log) : (gs.log || []))];
    const pName = roomPlayers.find(p => p.seat === mySeat)?.player_name || `Seat ${mySeat + 1}`;
    log.push(`${pName} plays ${card}`);

    let updates = { hands: newHands, current_trick: newTrick, log: log.slice(-20), updated_at: new Date().toISOString() };

    if (newTrick.length === 4) {
      updates.phase = "resolving_trick";
      await supabase.from("game_state").update(updates).eq("room_id", roomId);

      setTimeout(async () => {
        const winner = whoWinsTrick(newTrick, gs.trump_suit);
        const winTeam = seatTeam(winner);
        const winPName = roomPlayers.find(p => p.seat === winner)?.player_name || `Seat ${winner + 1}`;
        const pile = typeof gs.trick_pile === "string" ? JSON.parse(gs.trick_pile) : (gs.trick_pile || []);
        const newPile = [...pile, ...newTrick];
        const prevOwner = gs.pile_owner_seat;
        let secured = typeof gs.secured_tricks === "string" ? JSON.parse(gs.secured_tricks) : (gs.secured_tricks || { "02": 0, "13": 0 });
        
        let finalUpdates = { current_trick: [], last_trick_winner: winner };
        
        if (prevOwner === winner) {
          const tricksInPile = Math.floor(newPile.length / 4);
          secured = { ...secured, [winTeam]: (secured[winTeam] || 0) + tricksInPile };
          log.push(`★ ${winPName} secures ${tricksInPile} trick(s)!`);
          finalUpdates.trick_pile = []; finalUpdates.pile_owner_seat = null; finalUpdates.consecutive_wins = 0;
        } else {
          finalUpdates.trick_pile = newPile; finalUpdates.pile_owner_seat = winner; finalUpdates.consecutive_wins = 1;
          log.push(`${winPName} wins trick (pile grows)`);
        }
        finalUpdates.secured_tricks = secured; finalUpdates.log = log.slice(-20);

        const totalSecured = (secured["02"] || 0) + (secured["13"] || 0);
        const pileLeft = finalUpdates.trick_pile ? Math.floor(finalUpdates.trick_pile.length / 4) : 0;
        if (totalSecured + pileLeft >= 13 || Object.values(newHands).every(h => h.length === 0)) {
          finalUpdates = await resolveRoundEnd(finalUpdates, secured, newPile.length > 0 && (!finalUpdates.trick_pile || finalUpdates.trick_pile.length === 0) ? newPile : [], log);
        } else {
          finalUpdates.current_turn_seat = winner; finalUpdates.phase = "playing";
        }
        await supabase.from("game_state").update(finalUpdates).eq("room_id", roomId);
      }, 1500);
    } else {
      updates.current_turn_seat = (mySeat + 1) % 4;
      await supabase.from("game_state").update(updates).eq("room_id", roomId);
    }
  };

  const resolveRoundEnd = async (updates, secured, remainingPile, log) => {
    // Per-player piece tracking
    const pieces = typeof gs.pieces === "string" ? JSON.parse(gs.pieces) : (gs.pieces || { "0": 0, "1": 0, "2": 0, "3": 0 });
    const soldCount = typeof gs.sold_count === "string" ? JSON.parse(gs.sold_count) : (gs.sold_count || { "0": 0, "1": 0, "2": 0, "3": 0 });
    const bidTeam = seatTeam(gs.bid_winner_seat);
    const bidVal = gs.winning_bid || 8;
    const teamTricks = secured[bidTeam] || 0;
    const newPieces = { ...pieces };
    const newSold = { ...soldCount };
    let distributorSeat = typeof gs.distributor_seat === "number" ? gs.distributor_seat : (gs.distributor_team === "13" ? 1 : 0);
    const distributorTeam = seatTeam(distributorSeat);
    
    if (teamTricks === 13) log.push(`★★★ SURRY! ${bidTeam === "02" ? "Team A" : "Team B"} wins ALL 13 tricks!`);
    
    // Piece toll logic:
    // - If DISTRIBUTOR'S TEAM bid: pieces decrease by bid if they succeeded, increase by 2x bid if they failed
    // - If OPPOSITE team bid: pieces increase by bid if they succeeded, decrease by 2x bid if they failed
    const dist = String(distributorSeat);
    
    if (bidTeam === distributorTeam) {
      // Distributor's team is bidding
      if (teamTricks >= bidVal) {
        // Success: reduce pieces by bid amount
        newPieces[dist] = Math.max(0, (newPieces[dist] || 0) - bidVal);
        log.push(`Distributor's team made their bid! Seat ${distributorSeat} reduces pieces by ${bidVal}.`);
      } else {
        // Failed: increase pieces by 2x bid amount
        const penalty = bidVal * 2;
        newPieces[dist] = (newPieces[dist] || 0) + penalty;
        log.push(`Distributor's team failed bid! Seat ${distributorSeat} increases pieces by ${penalty}.`);
      }
    } else {
      // Opposite team is bidding
      if (teamTricks >= bidVal) {
        // Opposition succeeded: they collect, pieces increase
        newPieces[dist] = (newPieces[dist] || 0) + bidVal;
        log.push(`Opposite team made their bid! Seat ${distributorSeat} pieces increase by ${bidVal}.`);
      } else {
        // Opposition failed: debt reduces
        const penalty = bidVal * 2;
        newPieces[dist] = Math.max(0, (newPieces[dist] || 0) - penalty);
        log.push(`Opposite team failed bid! Seat ${distributorSeat} pieces reduce by ${penalty}.`);
      }
    }

    // Check for SOLD (individual player reaches 52)
    for (let seat = 0; seat < 4; seat++) {
      const seatStr = String(seat);
      if (newPieces[seatStr] >= 52) {
        newSold[seatStr] = (newSold[seatStr] || 0) + 1;
        newPieces[seatStr] = 0;
        // Transfer distributor to teammate
        const teammateSeat = (seat + 2) % 4;
        distributorSeat = teammateSeat;
        log.push(`SOLD! Seat ${seat} reaches 52 pieces and resets to 0. Distributor shifts to Seat ${teammateSeat}.`);
      }
    }

    // If distributor's pieces are 0 and there are pieces elsewhere in their team, transfer to teammate
    const currentDistTeam = seatTeam(distributorSeat);
    const currentDistTeammate = (distributorSeat + 2) % 4;
    if ((newPieces[String(distributorSeat)] || 0) === 0 && (newPieces[String(currentDistTeammate)] || 0) > 0) {
      distributorSeat = currentDistTeammate;
      log.push(`Distributor's debt paid off. Role transfers to teammate at Seat ${distributorSeat}.`);
    }

    updates.phase = "round_end"; 
    updates.pieces = newPieces; 
    updates.sold_count = newSold;
    updates.distributor_seat = distributorSeat; 
    updates.round_number = (gs.round_number || 1) + 1;
    updates.log = log.slice(-20);
    setShowResult({ secured, bidTeam, bidVal, pieces: newPieces, sold: newSold });
    return updates;
  };

  const nextRound = async () => {
    setShowResult(null);
    const newDealer = ((gs.dealer_seat || 0) + 1) % 4;
    const { hands, remaining } = dealCards();
    const firstBidder = (newDealer + 1) % 4;
    await supabase.from("game_state").update({
      phase: "bidding", dealer_seat: newDealer, current_turn_seat: firstBidder,
      hands, remaining_cards: remaining, current_trick: [], trick_pile: [],
      pile_owner_seat: null, consecutive_wins: 0, secured_tricks: { "02": 0, "13": 0 },
      bid_winner_seat: null, winning_bid: null, bids: {}, bid_order: [], trump_suit: null,
      last_trick_winner: null, log: [...(typeof gs.log === "string" ? JSON.parse(gs.log) : (gs.log || [])), "New round begins!"].slice(-20),
      updated_at: new Date().toISOString()
    }).eq("room_id", roomId);
  };

  const exitGame = async () => {
    setShowExitConfirm(false); setLoading(true);
    try {
      if (!roomId || mySeat === null) { setScreen("home"); setLoading(false); return; }
      await supabase.from("room_players").delete().eq("room_id", roomId).eq("player_id", playerId);
      if (gs && gs.phase && gs.phase !== "waiting") await supabase.from("game_state").delete().eq("room_id", roomId);
      const { data: remainingPlayers } = await supabase.from("room_players").select("*").eq("room_id", roomId);
      if (!remainingPlayers || remainingPlayers.length === 0) await supabase.from("rooms").delete().eq("id", roomId);
      localStorage.removeItem("surry_room"); localStorage.removeItem("surry_seat");
      setRoomId(""); setMySeat(null); setRoomPlayers([]); setGs(null); setScreen("home");
    } catch (err) { setError("Error leaving game: " + (err.message || "Unknown error")); }
    setLoading(false);
  };

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen === "game" && gs?.phase === "round_end" && !showResult) {
      const secured = typeof gs.secured_tricks === "string" ? JSON.parse(gs.secured_tricks) : (gs.secured_tricks || {});
      const pieces = typeof gs.pieces === "string" ? JSON.parse(gs.pieces) : (gs.pieces || {});
      const sold = typeof gs.sold_count === "string" ? JSON.parse(gs.sold_count) : (gs.sold_count || {});
      setShowResult({ secured, bidTeam: seatTeam(gs.bid_winner_seat || 0), bidVal: gs.winning_bid || 8, pieces, sold });
    }
    if (gs?.phase !== "round_end") setShowResult(null);
  }, [gs?.phase, screen, showResult]);

  useEffect(() => { if (showSold) setTimeout(() => setShowSold(null), 2500); }, [showSold]);

  useEffect(() => {
    const savedRoom = localStorage.getItem("surry_room");
    const savedSeat = localStorage.getItem("surry_seat");
    if (savedRoom && savedSeat !== null) {
      setRoomId(savedRoom); setMySeat(parseInt(savedSeat));
      loadRoomPlayers(savedRoom); loadGs(savedRoom); subscribeRoom(savedRoom);
      setTimeout(() => setScreen("room"), 100);
    }
  }, []);

  useEffect(() => {
    if (roomId && mySeat !== null) { localStorage.setItem("surry_room", roomId); localStorage.setItem("surry_seat", mySeat); }
  }, [roomId, mySeat]);

  useEffect(() => {
    if (!roomId || mySeat !== null || !roomPlayers || roomPlayers.length === 0) return;
    const me = roomPlayers.find(p => p.player_id === playerId);
    if (me && typeof me.seat === "number") setMySeat(me.seat);
  }, [roomId, mySeat, roomPlayers, playerId]);

  useEffect(() => {
    if (!roomId || (screen !== "room" && screen !== "game")) return;
    const t = setInterval(() => { loadRoomPlayers(roomId); loadGs(roomId); }, 1500);
    return () => clearInterval(t);
  }, [roomId, screen]);

  useEffect(() => {
    if (gs && gs.phase && gs.phase !== "waiting" && screen === "room") setScreen("game");
  }, [gs?.phase, screen]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const hands = gs ? (typeof gs.hands === "string" ? JSON.parse(gs.hands) : (gs.hands || {})) : {};
  const myHandRaw = mySeat === null ? [] : (hands?.[mySeat] || hands?.[String(mySeat)] || []);
  const myHand = (myHandRaw || []).sort((a, b) => {
    const as = cardSuit(a), bs2 = cardSuit(b);
    if (as !== bs2) return SUITS.indexOf(as) - SUITS.indexOf(bs2);
    return cardVal(b) - cardVal(a);
  });
  const trick = gs ? (typeof gs.current_trick === "string" ? JSON.parse(gs.current_trick) : (gs.current_trick || [])) : [];
  const pile = gs ? (typeof gs.trick_pile === "string" ? JSON.parse(gs.trick_pile) : (gs.trick_pile || [])) : [];
  const secured = gs ? (typeof gs.secured_tricks === "string" ? JSON.parse(gs.secured_tricks) : (gs.secured_tricks || { "02": 0, "13": 0 })) : { "02": 0, "13": 0 };
  const pieces = gs ? (typeof gs.pieces === "string" ? JSON.parse(gs.pieces) : (gs.pieces || { "0": 0, "1": 0, "2": 0, "3": 0 })) : { "0": 0, "1": 0, "2": 0, "3": 0 };
  const soldCount = gs ? (typeof gs.sold_count === "string" ? JSON.parse(gs.sold_count) : (gs.sold_count || { "0": 0, "1": 0, "2": 0, "3": 0 })) : { "0": 0, "1": 0, "2": 0, "3": 0 };
  const bids = gs ? (typeof gs.bids === "string" ? JSON.parse(gs.bids) : (gs.bids || {})) : {};
  const log = gs ? (typeof gs.log === "string" ? JSON.parse(gs.log) : (gs.log || [])) : [];
  const isMyTurn = gs?.current_turn_seat === mySeat;
  const myTeam = mySeat !== null ? seatTeam(mySeat) : null;
  const trumpSymbol = gs?.trump_suit ? SUIT_FROM_NAME[gs.trump_suit] : null;

  const maxBid = Math.max(...Object.values(bids).filter(b => b !== "pass").map(Number), 8);
  const validBids = ["pass", 9, 10, 11, 12].filter(b => b === "pass" || b > maxBid);

  const getPlayable = () => {
    if (!isMyTurn || gs?.phase !== "playing") return [];
    if (trick.length === 0) return myHand;
    const lead = cardSuit(trick[0].card);
    const hasLead = myHand.some(c => cardSuit(c) === lead);
    if (hasLead) return myHand.filter(c => cardSuit(c) === lead);
    return myHand;
  };
  const playable = getPlayable();
  const getPlayerAt = (seat) => roomPlayers.find(p => p.seat === seat);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,_#1a472a_0%,_#0d2b18_100%)]">
      {(screen === "home" || screen === "create" || screen === "join") && (
        <LobbyScreen 
          screen={screen} 
          playerName={playerName} 
          saveName={saveName} 
          setScreen={setScreen} 
          joinInput={joinInput} 
          setJoinInput={setJoinInput} 
          joinRoom={joinRoom} 
          loading={loading} 
          error={error} 
          createRoom={createRoom} 
        />
      )}

      {screen === "room" && (
        <RoomScreen 
          roomId={roomId} 
          roomPlayers={roomPlayers} 
          getPlayerAt={getPlayerAt} 
          playerId={playerId} 
          takeSeat={takeSeat} 
          startGame={startGame} 
          setShowExitConfirm={setShowExitConfirm} 
          error={error} 
        />
      )}

      {screen === "game" && gs && (
        <GameScreen 
          gs={gs}
          mySeat={mySeat}
          roomPlayers={roomPlayers}
          getPlayerAt={getPlayerAt}
          trick={trick}
          pile={pile}
          log={log}
          isMyTurn={isMyTurn}
          trumpSymbol={trumpSymbol}
          validBids={validBids}
          bids={bids}
          myHand={myHand}
          playable={playable}
          selectedCard={selectedCard}
          setSelectedCard={setSelectedCard}
          playCard={playCard}
          placeBid={placeBid}
          selectTrump={selectTrump}
          setShowStats={setShowStats}
          setShowExitConfirm={setShowExitConfirm}
          error={error}
        />
      )}

      {/* Overlays */}
      {showResult && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]">
          <div className="bg-surry-bg2 border border-surry-gold rounded-2xl p-8 text-center max-w-[360px] w-[90%]">
            <div className="font-serif text-[2rem] text-surry-gold mb-4">Round Over</div>
            <div className="mb-4 leading-[1.8] text-[0.85rem]">
              {["02", "13"].map(t => (
                <div key={t}>
                  <span className={t === "02" ? "text-[#7ec8e3]" : "text-[#f4a261]"}>{t === "02" ? "Team A" : "Team B"}</span>
                  : {showResult.secured[t] || 0} tricks · {showResult.pieces[t] || 0} pieces {showResult.sold[t] > 0 ? `· SOLD ${showResult.sold[t]}x` : ""}
                </div>
              ))}
            </div>
            <div className="text-[0.75rem] text-surry-cream-d mb-6">
              Bid was {showResult.bidVal} by {showResult.bidTeam === "02" ? "Team A" : "Team B"}
              {(showResult.secured[showResult.bidTeam] || 0) >= showResult.bidVal ? " — ✓ Made!" : " — ✗ Failed!"}
            </div>
            <button className="btn btn-gold w-full" onClick={nextRound}>Next Round</button>
          </div>
        </div>
      )}

      {showSold && <div className="sold-flash fixed inset-0 bg-surry-red/70 flex items-center justify-center z-[200] font-serif text-[5rem] text-white pointer-events-none">SOLD!</div>}

      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]">
          <div className="bg-surry-bg2 border border-surry-gold rounded-2xl p-8 text-center max-w-[360px] w-[90%]">
            <div className="font-serif text-[2rem] text-surry-gold mb-4">Exit Game?</div>
            <div className="mb-6 text-[0.85rem] text-surry-cream-d leading-[1.8]">
              {screen === "game" ? "Leaving will end the game for all players since 4 players are required." : "Are you sure you want to leave the room?"}
            </div>
            <div className="flex gap-4 justify-center">
              <button className="btn btn-outline" onClick={() => setShowExitConfirm(false)} disabled={loading}>Cancel</button>
              <button className="btn btn-gold bg-[#c0392b] hover:bg-surry-red-l text-white border-none" onClick={exitGame} disabled={loading}>
                {loading ? "Exiting..." : "Exit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showStats && gs && (() => {
        const logArray = typeof gs.log === "string" ? JSON.parse(gs.log) : (gs.log || []);
        const teamASold = (parseInt(soldCount["0"]) || 0) + (parseInt(soldCount["2"]) || 0);
        const teamBSold = (parseInt(soldCount["1"]) || 0) + (parseInt(soldCount["3"]) || 0);
        const surryMatches = logArray.filter(l => l.includes("SURRY"));
        let teamASurry = 0, teamBSurry = 0;
        for (const log of surryMatches) {
          if (log.includes("Team A")) teamASurry++;
          else if (log.includes("Team B")) teamBSurry++;
        }
        
        return (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]">
            <div className="bg-surry-bg2 border border-surry-gold rounded-2xl p-8 max-w-[420px] w-[90%]">
              <div className="font-serif text-[2rem] text-surry-gold mb-2 text-center">Game Stats</div>
              <div className="text-center text-surry-cream-d text-[0.9rem] mb-6">
                Total Rounds: <span className="text-surry-gold font-bold">{gs.round_number || 1}</span>
              </div>
              
              {/* Team Comparison */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Team A */}
                <div className="bg-black/40 border border-[#7ec8e3]/40 rounded-lg p-5">
                  <div className="text-[#7ec8e3] font-medium mb-4 text-center text-sm">Team A</div>
                  <div className="space-y-3 text-[0.85rem]">
                    <div className="flex justify-between items-center text-surry-cream-d">
                      <span>Times Sold</span>
                      <span className="text-surry-red-l font-bold">{teamASold}</span>
                    </div>
                    <div className="flex justify-between items-center text-surry-cream-d">
                      <span>Surry's</span>
                      <span className="text-[#4ade80] font-bold">{teamASurry}</span>
                    </div>
                  </div>
                </div>
                
                {/* Team B */}
                <div className="bg-black/40 border border-[#f4a261]/40 rounded-lg p-5">
                  <div className="text-[#f4a261] font-medium mb-4 text-center text-sm">Team B</div>
                  <div className="space-y-3 text-[0.85rem]">
                    <div className="flex justify-between items-center text-surry-cream-d">
                      <span>Times Sold</span>
                      <span className="text-surry-red-l font-bold">{teamBSold}</span>
                    </div>
                    <div className="flex justify-between items-center text-surry-cream-d">
                      <span>Surry's</span>
                      <span className="text-[#4ade80] font-bold">{teamBSurry}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <button className="btn btn-gold w-full" onClick={() => setShowStats(false)}>Close</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
