// ── Card utils ────────────────────────────────────────────────────────────────
export const SUITS = ["♠", "♥", "♦", "♣"];
export const SUIT_NAMES = { "♠": "spades", "♥": "hearts", "♦": "diamonds", "♣": "clubs" };
export const SUIT_FROM_NAME = { spades: "♠", hearts: "♥", diamonds: "♦", clubs: "♣" };
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const RANK_VAL = Object.fromEntries(RANKS.map((r, i) => ([r, i])));
const RED = { "♥": 1, "♦": 1 };

export function makeDeck() {
  const d = [];
  for (const s of SUITS) for (const r of RANKS) d.push(r + s);
  return d;
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function cardRank(c) { return c.slice(0, -1); }
export function cardSuit(c) { return c.slice(-1); }
export function cardVal(c) { return RANK_VAL[cardRank(c)]; }
export function isRed(c) { return RED[cardSuit(c)]; }

// ── Team logic ────────────────────────────────────────────────────────────────
// Seats 0,2 = team "02"; seats 1,3 = team "13"
export function seatTeam(seat) { return [0, 2].includes(seat) ? "02" : "13"; }
export function teamName(t) { return t === "02" ? "Team A (seats 1,3)" : "Team B (seats 2,4)"; }
export function teammate(seat) { return (seat + 2) % 4; }

// ── Room ID gen ───────────────────────────────────────────────────────────────
export function genRoomId() { return Math.random().toString(36).slice(2, 7).toUpperCase(); }
export function genPlayerId() { return "p_" + Math.random().toString(36).slice(2, 10); }

// ── Deal helper ───────────────────────────────────────────────────────────────
export function dealCards() {
  const deck = shuffle(makeDeck());
  // First deal: 5 each; final deal: 4+4 each = 13 each
  const hands = {};
  let idx = 0;
  for (let s = 0; s < 4; s++) { hands[s] = deck.slice(idx, idx + 5); idx += 5; }
  // Store remaining 32 for final deal
  return { hands, remaining: deck.slice(20) };
}

export function finalDeal(hands, remaining) {
  let idx = 0;
  const h = { ...hands };
  for (let s = 0; s < 4; s++) {
    h[s] = [...(h[s] || []), ...remaining.slice(idx, idx + 4)];
    idx += 4;
  }
  for (let s = 0; s < 4; s++) {
    h[s] = [...(h[s] || []), ...remaining.slice(idx, idx + 4)];
    idx += 4;
  }
  return h;
}

// ── Game Logic ────────────────────────────────────────────────────────────────
export function whoWinsTrick(trick, trump) {
  if (!trick || trick.length === 0) return null;
  const lead = cardSuit(trick[0].card);
  const trumpSuit = SUIT_FROM_NAME[trump] || trump;
  let best = trick[0];
  for (const play of trick) {
    const s = cardSuit(play.card), bs = cardSuit(best.card);
    if (s === trumpSuit && bs !== trumpSuit) { best = play; }
    else if (s === bs && cardVal(play.card) > cardVal(best.card)) { best = play; }
  }
  return best.seat;
}
