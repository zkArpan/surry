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

  const secured = typeof gs.secured_tricks === "string" ? JSON.parse(gs.secured_tricks) : (gs.secured_tricks || { "02": 0, "13": 0 });

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
      <div className="relative flex justify-center items-end h-[80px] md:h-[100px] mb-8 w-full max-w-[100vw] overflow-visible">
        {myHand.map((card, i) => {
          const isPlayable = gs.phase === "playing" ? playable.includes(card) : false;
          const isSelected = selectedCard === card;
          const size = myHand.length;
          // Fan math wide
          const rotation = (i - (size - 1) / 2) * 3;
          const xOffset = (i - (size - 1) / 2) * 35;
          const yOffset = Math.pow(Math.abs(i - (size - 1) / 2), 1.5) * 2;
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
      <header className="hidden md:flex h-16 shrink-0 border-b border-surry-border px-6 items-center justify-between text-[0.8rem]">
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
            <span>👥 {roomPlayers.length}/4</span>
            <span className={`w-2 h-2 rounded-full ${roomPlayers.length === 4 ? 'bg-green-500' : 'bg-surry-gold animate-pulse'}`}></span>
          </div>
          <button className="text-surry-cream-d hover:text-white" onClick={() => setShowStats(true)}>📊</button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* LEFT: TABLE AREA */}
        <div className="flex-1 flex items-center justify-center p-0 md:p-8 relative">

          {/* Action Buttons top left */}
          <button className="hidden md:flex absolute top-6 left-6 items-center gap-2 px-4 py-2 rounded-lg bg-surry-bg2 border border-surry-border text-[0.8rem] text-surry-cream-d hover:text-white transition-colors">
            <span>ℹ️</span> Rules
          </button>

          {/* TABLE */}
          <div className="w-full h-full md:h-auto md:max-w-[1200px] md:aspect-[16/9] md:max-h-[80vh] relative rounded-none md:rounded-[140px] border-none md:border-[16px] border-surry-table-border bg-gradient-to-br from-[#805020] to-[#5C3A21] md:bg-surry-green-dark shadow-[inset_0_0_120px_rgba(0,0,0,0.8),0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-center overflow-hidden md:overflow-visible">

            {/* Mobile Top Floating UI */}
            <button className="md:hidden absolute top-4 left-4 w-10 h-10 bg-black/60 rounded-full flex items-center justify-center text-white text-[1.2rem] z-50 shadow-lg border border-white/10" onClick={() => setShowStats(true)}>🏆</button>
            <button className="md:hidden absolute top-4 right-4 w-10 h-10 bg-black/60 rounded-full flex items-center justify-center text-white text-[1.2rem] z-50 shadow-lg border border-white/10" onClick={() => setShowStats(true)}>⚙️</button>
            
            <div className="md:hidden absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 rounded-full px-5 py-2 flex items-center gap-3 text-[0.65rem] whitespace-nowrap z-50 shadow-lg border border-white/10">
              <span className="text-white">Round {gs.round_number || 1}</span>
              <span className="opacity-50 text-white">|</span>
              {gs.trump_suit ? (
                <span className="text-white">Trump <span className={["♥", "♦"].includes(trumpSymbol) ? "text-surry-red font-bold" : "text-white font-bold"}>{trumpSymbol} {gs.trump_suit}</span></span>
              ) : (
                <span className="text-white opacity-50">No Trump</span>
              )}
              <span className="opacity-50 text-white">|</span>
              <span className="text-white">Bid <span className="text-surry-gold font-bold">{gs.winning_bid || "-"}</span> by {getPlayerAt(gs.bid_winner_seat)?.player_name?.split(" ")[0] || "?"}</span>
            </div>

            {/* Center Area */}
            <div className="absolute top-[45%] md:top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center">
              <TrickDisplay trick={trick} mySeat={mySeat} roomPlayers={roomPlayers} />

              <div className="mt-[80px] md:mt-[110px] flex flex-col items-center gap-2">
                <PileStack pile={pile} />
                <div className="md:hidden bg-black/80 rounded-full px-4 py-1 text-[0.7rem] text-surry-gold shadow-lg tracking-[1px] mt-2 border border-white/10">
                  Pile: {Math.floor(pile.length / 4)}
                </div>
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
              <div className="absolute top-20 md:top-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <div className="bg-black/80 rounded-full px-4 py-1 text-[0.65rem] md:text-[0.8rem] mb-[-10px] z-30 flex items-center gap-2 shadow-lg border border-white/10">
                  <span className="text-white font-medium">{topOpp.p.player_name}</span>
                  <span className="text-surry-green-l font-bold">{secured[seatTeam(topOpp.seat)] || 0}/13</span>
                </div>
                <div className="relative flex justify-center items-center mt-2">
                  <OpponentFan size={topOpp.size} position="top" />
                  <div className="absolute z-20">
                    <Avatar name={topOpp.p.player_name} active={topOpp.isActive} />
                  </div>
                </div>
              </div>
            )}

            {/* Left Opponent */}
            {leftOpp.p && (
              <div className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
                <div className="bg-black/80 rounded-full px-3 py-1 text-[0.65rem] md:text-[0.8rem] z-30 flex flex-col items-center shadow-lg border border-white/10 order-2 mt-[-10px]">
                  <span className="text-white font-medium">{leftOpp.p.player_name}</span>
                  <span className="text-surry-green-l font-bold">{secured[seatTeam(leftOpp.seat)] || 0}/13</span>
                </div>
                <div className="relative flex justify-center items-center order-1">
                  <OpponentFan size={leftOpp.size} position="left" />
                  <div className="absolute z-20">
                    <Avatar name={leftOpp.p.player_name} active={leftOpp.isActive} />
                  </div>
                </div>
              </div>
            )}

            {/* Right Opponent */}
            {rightOpp.p && (
              <div className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
                <div className="bg-black/80 rounded-full px-3 py-1 text-[0.65rem] md:text-[0.8rem] z-30 flex flex-col items-center shadow-lg border border-white/10 order-2 mt-[-10px]">
                  <span className="text-white font-medium">{rightOpp.p.player_name}</span>
                  <span className="text-surry-green-l font-bold">{secured[seatTeam(rightOpp.seat)] || 0}/13</span>
                </div>
                <div className="relative flex justify-center items-center order-1">
                  <OpponentFan size={rightOpp.size} position="right" />
                  <div className="absolute z-20">
                    <Avatar name={rightOpp.p.player_name} active={rightOpp.isActive} />
                  </div>
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

            {/* Leave Table Button (Mobile only) */}
            <button 
              className="md:hidden absolute bottom-4 right-4 flex items-center gap-1 px-3 py-1.5 bg-black/40 hover:bg-surry-red/80 text-surry-cream-d hover:text-white rounded-full border border-white/10 text-[0.65rem] transition-colors z-40 backdrop-blur-sm"
              onClick={() => setShowExitConfirm(true)}
            >
              <span>🚪</span> Leave Table
            </button>

          </div>
        </div>

        {/* RIGHT: SIDEBAR */}
        <div className="hidden lg:flex w-[320px] shrink-0 border-l border-surry-border bg-surry-bg2 flex-col">
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
      <footer className="hidden md:flex h-14 shrink-0 border-t border-surry-border px-6 items-center justify-between bg-surry-bg text-[0.8rem]">
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

      {/* Modals/Popups */}
      {gs.phase === "bidding" && isMyTurn && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm">
          <div className="bg-surry-bg2 border border-surry-gold rounded-2xl p-8 text-center max-w-[360px] w-[90%] shadow-[0_0_50px_rgba(201,168,76,0.15)]">
            <div className="font-serif text-[2rem] text-surry-gold mb-2 tracking-[2px]">Your Bid</div>
            <div className="text-[0.8rem] text-surry-cream-d mb-6 leading-relaxed">
              Place a bid higher than the current highest, or pass if you cannot.
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              {validBids.filter(b => b !== "pass").map(b => (
                <button
                  key={b}
                  className="py-3 rounded-lg border border-surry-border bg-black/40 hover:border-surry-gold hover:bg-surry-gold/10 hover:text-surry-gold text-[1.1rem] font-medium transition-all"
                  onClick={() => placeBid(b)}
                >
                  {b}
                </button>
              ))}
            </div>
            
            {validBids.includes("pass") && (
              <button
                className="w-full py-3 rounded-lg border border-surry-border bg-black/40 hover:border-surry-red hover:bg-surry-red/10 hover:text-surry-red text-[1.1rem] transition-all mt-2"
                onClick={() => placeBid("pass")}
              >
                Pass
              </button>
            )}
          </div>
        </div>
      )}

      {gs.phase === "trump_select" && isMyTurn && gs.bid_winner_seat === mySeat && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm">
          <div className="bg-surry-bg2 border border-surry-gold rounded-2xl p-8 text-center max-w-[360px] w-[90%] shadow-[0_0_50px_rgba(201,168,76,0.15)]">
            <div className="font-serif text-[2rem] text-surry-gold mb-2 tracking-[2px]">Select Trump</div>
            <div className="text-[0.8rem] text-surry-cream-d mb-6 leading-relaxed">
              Choose the trump suit for this round.
            </div>
            
            <div className="flex gap-4 justify-center">
              {SUITS.map(s => (
                <button
                  key={s}
                  className={`w-16 h-16 rounded-xl border border-surry-border bg-black/40 hover:border-surry-gold hover:bg-surry-gold/10 hover:scale-110 transition-all ${["♥", "♦"].includes(s) ? "text-surry-red" : "text-surry-cream"} text-3xl flex items-center justify-center shadow-md`}
                  onClick={() => selectTrump(SUIT_NAMES[s])}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-surry-red text-white px-6 py-3 rounded-lg shadow-xl z-50 animate-bounce">
          {error}
        </div>
      )}

      {/* Portrait warning overlay */}
      <div className="hidden portrait:flex fixed inset-0 bg-surry-bg z-[500] flex-col items-center justify-center text-center p-8 md:portrait:hidden">
        <div className="text-4xl mb-4 text-surry-gold">📱🔄</div>
        <div className="font-serif text-2xl text-surry-gold mb-2">Rotate Device</div>
        <div className="text-surry-cream-d text-sm">Surry requires horizontal mode for the best experience. Please rotate your phone to landscape.</div>
      </div>
    </div>
  );
}
