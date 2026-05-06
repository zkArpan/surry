import CardView from "./CardView";
import TrickDisplay from "./TrickDisplay";
import PileStack from "./PileStack";
import { seatTeam } from "../lib/gameLogic";

const SUITS = ["♠", "♥", "♦", "♣"];
const SUIT_NAMES = { "♠": "spades", "♥": "hearts", "♦": "diamonds", "♣": "clubs" };

export default function GameScreen({
  gs, mySeat, roomPlayers, getPlayerAt, trick, pile, log,
  isMyTurn, trumpSymbol, validBids, bids, myHand, playable,
  selectedCard, setSelectedCard, playCard, placeBid, selectTrump,
  setShowStats, setShowExitConfirm, error
}) {
  const getHandSize = (seat) => {
    const h = typeof gs.hands === "string" ? JSON.parse(gs.hands) : (gs.hands || {});
    return (h[seat] || h[String(seat)] || []).length;
  };

  const getRelativeSeatInfo = (seat) => {
    const relSeat = ((seat - mySeat) + 4) % 4;
    const p = getPlayerAt(seat);
    const isActive = gs.current_turn_seat === seat;
    const bid = bids[seat] && bids[seat] !== "pass" ? bids[seat] : null;
    const size = getHandSize(seat);
    return { seat, relSeat, p, isActive, bid, size };
  };

  const opponents = [1, 2, 3].map(offset => getRelativeSeatInfo((mySeat + offset) % 4));
  const rightOpp = opponents.find(o => o.relSeat === 1);
  const topOpp = opponents.find(o => o.relSeat === 2);
  const leftOpp = opponents.find(o => o.relSeat === 3);

  // Avatar bubble for a player
  const Avatar = ({ name, active }) => (
    <div className="flex flex-col items-center gap-[3px]">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-serif font-bold bg-[#1a1a1a] text-surry-cream
          ${active
            ? "ring-2 ring-surry-gold shadow-[0_0_10px_rgba(201,168,76,0.7)]"
            : "ring-1 ring-[#3a3a3a]"
          }`}
      >
        {name ? name.charAt(0).toUpperCase() : "?"}
      </div>
      <span className="text-[0.55rem] text-white/70 font-sans max-w-[52px] truncate text-center">{name || "?"}</span>
    </div>
  );

  // Compact face-down card fan for opponents
  const OpponentFan = ({ size, position }) => {
    if (!size) return null;
    const count = Math.min(size, 13);
    // Spread params per position
    const isVertical = position === "left" || position === "right";
    const fanW = isVertical ? 40 : Math.min(count * 10 + 24, 110);
    const fanH = isVertical ? Math.min(count * 10 + 24, 110) : 40;

    return (
      <div
        className="relative shrink-0"
        style={{ width: fanW, height: fanH }}
      >
        {Array.from({ length: count }).map((_, i) => {
          const mid = (count - 1) / 2;
          const t = count > 1 ? (i - mid) / mid : 0;
          let x = 0, y = 0, rot = 0;

          if (position === "top") {
            x = t * (count > 1 ? Math.min(count * 4, 40) : 0);
            y = Math.abs(t) * 5;
            rot = t * Math.min(count * 2, 18);
          } else if (position === "left") {
            y = t * (count > 1 ? Math.min(count * 4, 40) : 0);
            x = Math.abs(t) * 4;
            rot = 90 + t * Math.min(count * 2, 14);
          } else if (position === "right") {
            y = t * (count > 1 ? Math.min(count * 4, 40) : 0);
            x = -Math.abs(t) * 4;
            rot = -90 + t * Math.min(count * 2, 14);
          }

          return (
            <div
              key={i}
              className="absolute"
              style={{
                left: "50%",
                top: "50%",
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${rot}deg)`,
                zIndex: i,
              }}
            >
              <CardView faceDown small />
            </div>
          );
        })}
      </div>
    );
  };

  // My hand fan along the bottom
  const MyFan = () => {
    const count = myHand.length;
    if (!count) return null;
    // Dynamic spread: more cards → tighter
    const maxSpread = Math.min(count * 22, 320);
    return (
      <div
        className="relative flex justify-center items-end pointer-events-auto"
        style={{ width: "100%", height: 100 }}
      >
        {myHand.map((card, i) => {
          const mid = (count - 1) / 2;
          const t = count > 1 ? (i - mid) / mid : 0;
          const xOffset = t * (maxSpread / 2);
          const yOffset = Math.abs(t) * Math.abs(t) * 14;
          const rot = t * Math.min(count * 1.5, 20);
          const isPlayable = gs.phase === "playing" ? playable.includes(card) : false;
          const isSelected = selectedCard === card;
          const liftY = isSelected ? -22 : 0;

          return (
            <div
              key={card}
              className="absolute bottom-0 transition-all duration-150"
              style={{
                transform: `translateX(${xOffset}px) translateY(${yOffset + liftY}px) rotate(${rot}deg)`,
                zIndex: isSelected ? 50 : i + 1,
                transformOrigin: "bottom center",
              }}
            >
              <CardView
                card={card}
                playable={isPlayable}
                selected={isSelected}
                onClick={() => {
                  if (gs.phase !== "playing") return;
                  if (isSelected) { playCard(card); setSelectedCard(null); }
                  else setSelectedCard(card);
                }}
              />
            </div>
          );
        })}
      </div>
    );
  };

  const trumpColor = ["♥", "♦"].includes(trumpSymbol) ? "text-surry-red" : "text-surry-cream";

  return (
    <div className="fixed inset-0 bg-[#0d2f1a] text-surry-cream font-sans overflow-hidden flex flex-col">

      {/* ── TOP HEADER BAR ── */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/50 backdrop-blur-sm border-b border-white/10 shrink-0 z-30">
        <div className="flex items-center gap-2 text-[0.6rem] text-white/80">
          <span className="bg-white/10 px-2 py-0.5 rounded-full">R{gs.round_number || 1}</span>
          <span>
            Trump <span className={`font-bold ${trumpColor}`}>{trumpSymbol || "—"}</span>
          </span>
          <span>
            Bid <span className="text-surry-gold font-bold">{gs.winning_bid || "?"}</span>
          </span>
        </div>
        <button
          className="text-[0.6rem] text-surry-red/80 border border-surry-red/30 px-3 py-1 rounded-full hover:bg-surry-red/10 transition-colors"
          onClick={() => setShowExitConfirm(true)}
        >
          Leave
        </button>
      </div>

      {/* ── MAIN TABLE AREA ── */}
      <div className="flex-1 relative flex flex-col min-h-0">

        {/* TOP OPPONENT */}
        <div className="flex justify-center pt-2 shrink-0 z-10">
          {topOpp?.p ? (
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-2">
                <Avatar name={topOpp.p.player_name} active={topOpp.isActive} />
                {topOpp.bid && (
                  <span className="text-[0.55rem] bg-surry-gold/20 text-surry-gold border border-surry-gold/30 px-2 py-0.5 rounded-full">
                    {topOpp.bid}
                  </span>
                )}
              </div>
              <OpponentFan size={topOpp.size} position="top" />
            </div>
          ) : (
            <div className="h-16 flex items-center justify-center text-white/20 text-xs">Waiting…</div>
          )}
        </div>

        {/* MIDDLE ROW: left opp | center play area | right opp */}
        <div className="flex-1 flex items-center justify-between px-2 min-h-0 gap-1">

          {/* LEFT OPPONENT */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            {leftOpp?.p && (
              <>
                <Avatar name={leftOpp.p.player_name} active={leftOpp.isActive} />
                {leftOpp.bid && (
                  <span className="text-[0.5rem] bg-surry-gold/20 text-surry-gold border border-surry-gold/30 px-1.5 py-0.5 rounded-full">
                    {leftOpp.bid}
                  </span>
                )}
                <OpponentFan size={leftOpp.size} position="left" />
              </>
            )}
          </div>

          {/* CENTER: trick + pile */}
          <div className="flex-1 flex flex-col items-center justify-center gap-2 min-w-0">
            {/* Trick */}
            <div className="relative w-full flex items-center justify-center" style={{ minHeight: 72 }}>
              <TrickDisplay trick={trick} mySeat={mySeat} roomPlayers={roomPlayers} />
            </div>

            {/* Pile + streak */}
            {(pile?.length > 0 || gs.consecutive_wins > 0) && (
              <div className="flex flex-col items-center gap-1">
                <PileStack pile={pile} />
                {gs.consecutive_wins > 0 && gs.pile_owner_seat !== null && (
                  <div className="text-[0.55rem] bg-black/60 border border-surry-gold/30 px-3 py-1 rounded-full text-center">
                    <span className="text-surry-gold">🔥 {getPlayerAt(gs.pile_owner_seat)?.player_name}</span>
                    <span className="text-white/60 ml-1">{gs.consecutive_wins}/2</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT OPPONENT */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            {rightOpp?.p && (
              <>
                <Avatar name={rightOpp.p.player_name} active={rightOpp.isActive} />
                {rightOpp.bid && (
                  <span className="text-[0.5rem] bg-surry-gold/20 text-surry-gold border border-surry-gold/30 px-1.5 py-0.5 rounded-full">
                    {rightOpp.bid}
                  </span>
                )}
                <OpponentFan size={rightOpp.size} position="right" />
              </>
            )}
          </div>
        </div>

        {/* BOTTOM: my turn indicator + my hand */}
        <div className="shrink-0 flex flex-col items-center pb-2 px-1">
          {isMyTurn && gs.phase === "playing" && (
            <div className="mb-1 text-[0.6rem] tracking-widest text-surry-gold animate-pulse font-bold">
              YOUR TURN
            </div>
          )}
          <MyFan />

          {/* Play card button — floats bottom-right when a card is selected */}
          {gs.phase === "playing" && isMyTurn && selectedCard && (
            <button
              className="mt-2 px-6 py-2 bg-gradient-to-b from-surry-gold to-[#b89130] text-surry-bg font-bold text-sm rounded-full shadow-lg active:scale-95 transition-transform"
              onClick={() => { playCard(selectedCard); setSelectedCard(null); }}
            >
              Play {selectedCard}
            </button>
          )}
        </div>
      </div>

      {/* ── BIDDING MODAL ── */}
      {gs.phase === "bidding" && isMyTurn && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm p-4">
          <div className="bg-[#15171c] border border-surry-gold/40 rounded-2xl p-6 w-full max-w-[320px] shadow-2xl">
            <div className="font-serif text-xl text-surry-gold mb-1 text-center tracking-wide">Your Bid</div>
            <div className="text-[0.7rem] text-white/50 mb-5 text-center">Match or raise the current bid, or pass.</div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {validBids.filter(b => b !== "pass").map(b => (
                <button
                  key={b}
                  className="py-3 rounded-xl border border-surry-border bg-black/40 hover:border-surry-gold hover:text-surry-gold text-lg font-bold transition-all"
                  onClick={() => placeBid(b)}
                >
                  {b}
                </button>
              ))}
            </div>
            {validBids.includes("pass") && (
              <button
                className="w-full py-2.5 rounded-xl border border-white/10 bg-black/30 hover:border-red-400/50 hover:text-red-400 text-sm transition-all"
                onClick={() => placeBid("pass")}
              >
                Pass
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── TRUMP SELECT MODAL ── */}
      {gs.phase === "trump_select" && isMyTurn && gs.bid_winner_seat === mySeat && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm p-4">
          <div className="bg-[#15171c] border border-surry-gold/40 rounded-2xl p-6 w-full max-w-[280px] shadow-2xl">
            <div className="font-serif text-xl text-surry-gold mb-1 text-center tracking-wide">Select Trump</div>
            <div className="text-[0.7rem] text-white/50 mb-5 text-center">Choose the trump suit for this round.</div>
            <div className="flex gap-3 justify-center">
              {SUITS.map(s => (
                <button
                  key={s}
                  className={`w-14 h-14 rounded-xl border border-surry-border bg-black/40 hover:border-surry-gold hover:scale-110 transition-all text-2xl flex items-center justify-center
                    ${["♥", "♦"].includes(s) ? "text-surry-red" : "text-surry-cream"}`}
                  onClick={() => selectTrump(SUIT_NAMES[s])}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ERROR TOAST ── */}
      {error && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 bg-surry-red text-white text-xs px-4 py-2 rounded-lg shadow-lg z-50 max-w-[80vw] text-center">
          {error}
        </div>
      )}
    </div>
  );
}
