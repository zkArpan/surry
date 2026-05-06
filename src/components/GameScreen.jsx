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
    const relSeat = ((seat - mySeat) + 4) % 4; // 0=bottom, 1=right, 2=top, 3=left
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

  const Avatar = ({ name, active }) => (
    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-serif font-bold ${active ? 'ring-2 ring-surry-gold shadow-[0_0_15px_rgba(201,168,76,0.5)]' : 'ring-1 ring-white/10'} bg-surry-bg text-surry-cream z-20`}>
      {name ? name.charAt(0).toUpperCase() : '?'}
    </div>
  );

  const OpponentFan = ({ size, position }) => {
    if (size === 0) return null;
    return (
      <div className="relative flex justify-center items-center pointer-events-none z-10" style={{ width: '80px', height: '60px' }}>
        {Array.from({ length: size }).map((_, i) => {
          const rotation = (i - (size - 1) / 2) * 8;
          const xOffset = (i - (size - 1) / 2) * 12;
          const yOffset = Math.abs(i - (size - 1) / 2) * 2;
          // Apply overall rotation based on position
          let globalTransform = '';
          if (position === 'left') globalTransform = 'rotate(90deg) translate(20px, 0)';
          if (position === 'right') globalTransform = 'rotate(-90deg) translate(20px, 0)';

          return (
            <div key={i} className="absolute" style={{ transform: `${globalTransform} translate(${xOffset}px, ${yOffset}px) rotate(${rotation}deg)` }}>
              <CardView faceDown small />
            </div>
          );
        })}
      </div>
    );
  };

  const MyFan = () => {
    return (
      <div className="relative flex justify-center items-end h-[100px] mb-8">
        {myHand.map((card, i) => {
          const isPlayable = gs.phase === "playing" ? playable.includes(card) : false;
          const isSelected = selectedCard === card;
          const size = myHand.length;
          // Fan math
          const rotation = (i - (size - 1) / 2) * 4;
          const xOffset = (i - (size - 1) / 2) * 25;
          const yOffset = Math.abs(i - (size - 1) / 2) * 3;
          const activeOffset = isSelected ? -20 : 0;

          return (
            <div
              key={card}
              className="absolute transform-gpu transition-transform duration-200"
              style={{
                transform: `translate(${xOffset}px, ${yOffset + activeOffset}px) rotate(${rotation}deg)`,
                zIndex: isSelected ? 50 : i
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

  return (
    <div className="h-screen w-full flex flex-col bg-surry-bg text-surry-cream font-sans overflow-hidden">

      {/* HEADER */}
      <header className="h-16 shrink-0 border-b border-surry-border px-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-surry-gold font-serif text-2xl tracking-[2px] font-bold">
          <span className="text-[1.2em] leading-none">♠</span> SURRY
        </div>

        <div className="flex items-center gap-4 text-[0.75rem]">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-surry-border bg-surry-bg2">
            <span className="text-surry-cream-d">Round</span>
            <span className="font-medium">{gs.round_number || 1}</span>
          </div>
          {gs.trump_suit && (
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-surry-border bg-surry-bg2">
              <span className="text-surry-cream-d">Trump</span>
              <span className={["♥", "♦"].includes(trumpSymbol) ? "text-surry-red" : "text-surry-cream"}>
                {trumpSymbol} {gs.trump_suit}
              </span>
            </div>
          )}
          {gs.winning_bid && (
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-surry-border bg-surry-bg2">
              <span className="text-surry-cream-d">Bid</span>
              <span className="text-surry-gold font-medium">{gs.winning_bid}</span>
              <span className="text-surry-cream-d">by {getPlayerAt(gs.bid_winner_seat)?.player_name || "?"}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-surry-border bg-surry-bg2 text-[0.75rem]">
            <span>👥 {roomPlayers.length} / 4</span>
            <span className={`w-2 h-2 rounded-full ${roomPlayers.length === 4 ? 'bg-green-500' : 'bg-surry-gold animate-pulse'}`}></span>
          </div>
          <button className="text-surry-cream-d hover:text-white" onClick={() => setShowStats(true)}>📊</button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT: TABLE AREA */}
        <div className="flex-1 flex items-center justify-center p-8 relative">

          {/* Action Buttons top left */}
          <button className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 rounded-lg bg-surry-bg2 border border-surry-border text-[0.8rem] text-surry-cream-d hover:text-white transition-colors">
            <span>ℹ️</span> Rules
          </button>

          {/* TABLE */}
          <div className="w-full max-w-[1200px] aspect-[16/9] max-h-[80vh] relative rounded-[140px] border-[16px] border-surry-table-border bg-surry-green-dark shadow-[inset_0_0_120px_rgba(0,0,0,0.8),0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-center">

            {/* Center Area */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center">
              <TrickDisplay trick={trick} mySeat={mySeat} roomPlayers={roomPlayers} />

              <div className="mt-[110px] flex flex-col items-center gap-2">
                <PileStack pile={pile} />
                {gs.consecutive_wins > 0 && gs.pile_owner_seat !== null && (
                  <div className="px-6 py-1 rounded-full border border-surry-gold/60 bg-black/60 backdrop-blur-sm text-[0.7rem] flex flex-col items-center gap-0.5 mt-1">
                    <span className="text-[0.55rem] text-surry-gold tracking-[2px]">CURRENT STREAK</span>
                    <span className="text-surry-cream">🔥 {getPlayerAt(gs.pile_owner_seat)?.player_name} {gs.consecutive_wins} / 2</span>
                  </div>
                )}
              </div>
            </div>

            {/* Top Opponent */}
            {topOpp.p && (
              <div className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                <div className="flex flex-col items-center gap-1">
                  <Avatar name={topOpp.p.player_name} active={topOpp.isActive} />
                  <div className="text-[0.8rem] font-medium">{topOpp.p.player_name}</div>
                </div>
                <div className="mt-1">
                  <OpponentFan size={topOpp.size} position="top" />
                </div>
              </div>
            )}

            {/* Left Opponent */}
            {leftOpp.p && (
              <div className="absolute left-8 top-1/2 -translate-y-1/2 flex items-center gap-6">
                <div className="flex flex-col items-center gap-1">
                  <Avatar name={leftOpp.p.player_name} active={leftOpp.isActive} />
                  <div className="text-[0.8rem] font-medium">{leftOpp.p.player_name}</div>
                </div>
                <div>
                  <OpponentFan size={leftOpp.size} position="left" />
                </div>
              </div>
            )}

            {/* Right Opponent */}
            {rightOpp.p && (
              <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-6 flex-row-reverse">
                <div className="flex flex-col items-center gap-1">
                  <Avatar name={rightOpp.p.player_name} active={rightOpp.isActive} />
                  <div className="text-[0.8rem] font-medium">{rightOpp.p.player_name}</div>
                </div>
                <div>
                  <OpponentFan size={rightOpp.size} position="right" />
                </div>
              </div>
            )}

            {/* Bottom (Me) */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
              {isMyTurn && (
                <div className="mb-1 text-surry-gold text-[0.7rem] tracking-[2px] animate-pulse relative z-10">
                  ▼ YOUR TURN
                </div>
              )}

              <MyFan />
            </div>

            {/* Play/Bid actions inside table bottom right */}
            {gs.phase === "bidding" && isMyTurn && (
              <div className="absolute bottom-8 right-12 bg-black/60 p-4 rounded-xl border border-surry-border backdrop-blur-md z-30">
                <div className="text-[0.65rem] text-surry-gold mb-2 text-center tracking-widest">PLACE BID</div>
                <div className="grid grid-cols-3 gap-2">
                  {validBids.map(b => (
                    <button
                      key={b}
                      className={`h-8 rounded border border-white/10 bg-white/5 hover:border-surry-gold hover:text-surry-gold text-[0.8rem] transition-colors ${b === "pass" ? "col-span-3" : ""}`}
                      onClick={() => placeBid(b)}
                    >
                      {b === "pass" ? "Pass" : b}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {gs.phase === "trump_select" && isMyTurn && gs.bid_winner_seat === mySeat && (
              <div className="absolute bottom-8 right-12 bg-black/60 p-4 rounded-xl border border-surry-border backdrop-blur-md z-30 flex gap-2">
                {SUITS.map(s => (
                  <button
                    key={s}
                    className={`w-12 h-12 rounded border border-white/10 bg-white/5 hover:border-surry-gold hover:scale-110 transition-all ${["♥", "♦"].includes(s) ? "text-surry-red" : "text-surry-cream"} text-2xl flex items-center justify-center`}
                    onClick={() => selectTrump(SUIT_NAMES[s])}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {gs.phase === "playing" && isMyTurn && selectedCard && (
              <div className="absolute bottom-12 right-12 z-30">
                <button
                  className="px-8 py-4 bg-surry-gold text-surry-bg font-medium rounded-lg shadow-[0_4px_20px_rgba(201,168,76,0.4)] hover:bg-surry-gold-l hover:-translate-y-1 transition-all"
                  onClick={() => playCard(selectedCard)}
                >
                  Play Card
                </button>
              </div>
            )}

          </div>
        </div>

        {/* RIGHT: SIDEBAR */}
        <div className="w-[320px] shrink-0 border-l border-surry-border bg-surry-bg2 flex flex-col">
          <div className="h-16 px-6 flex items-center justify-between border-b border-surry-border text-[0.9rem]">
            <span>Live Feed</span>
            <button className="text-surry-cream-d">^</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-[0.75rem]" ref={el => el && (el.scrollTop = el.scrollHeight)}>
            {log.map((l, i) => {
              // Basic parsing to add icons matching screenshot
              let icon = "💬";
              let color = "text-surry-cream-d";
              if (l.includes("wins trick")) { icon = "🏆"; color = "text-surry-green-ll"; }
              else if (l.includes("bids")) icon = "📢";
              else if (l.includes("selects")) icon = "🎯";
              else if (l.includes("plays")) icon = "🃏";
              else if (l.includes("started")) icon = "🏁";

              return (
                <div key={i} className="flex gap-3 items-start">
                  <div className="mt-0.5">{icon}</div>
                  <div className={`flex-1 ${color}`}>{l}</div>
                  <div className="text-[0.6rem] text-surry-cream-d/50 shrink-0 mt-1">
                    {/* Fake timestamp for demo since log doesn't have it */}
                    10:23 AM
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* FOOTER */}
      <footer className="h-14 shrink-0 border-t border-surry-border px-6 flex items-center justify-between bg-surry-bg text-[0.8rem]">
        <div className="flex items-center gap-4 text-surry-green-ll">
          <span>🔊</span>
          <span>🎤</span>
          <span>Voice Connected</span>
          <span className="text-[0.6rem]">|||</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            className="flex items-center gap-2 px-4 py-2 text-surry-red hover:bg-surry-red/10 rounded-lg transition-colors border border-transparent hover:border-surry-red/30"
            onClick={() => setShowExitConfirm(true)}
          >
            <span>🚪</span> Leave Table
          </button>
          <button className="text-surry-cream-d hover:text-white text-xl">
            ⚙️
          </button>
        </div>
      </footer>

      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-surry-red text-white px-6 py-3 rounded-lg shadow-xl z-50 animate-bounce">
          {error}
        </div>
      )}
    </div>
  );
}
