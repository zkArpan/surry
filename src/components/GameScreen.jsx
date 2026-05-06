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

  const Avatar = ({ name, active, score = 0, isLocal = false }) => (
    <div className="flex flex-col items-center gap-1">
       {!isLocal && <div className="text-[0.8rem] font-medium text-white shadow-black drop-shadow-md">{name}</div>}
       <div className="relative">
         <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-serif font-bold ${active ? 'ring-2 ring-surry-gold shadow-[0_0_15px_rgba(201,168,76,0.8)]' : 'ring-2 ring-[#a38036] shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]'} bg-[#1a1a1a] text-surry-cream z-20`}>
           {name ? name.charAt(0).toUpperCase() : '?'}
         </div>
       </div>
       {isLocal && <div className="text-[0.8rem] font-medium text-white/80 mt-1">You</div>}
    </div>
  );

  const OpponentFan = ({ size, position }) => {
    if (size === 0) return null;
    return (
      <div className="relative flex justify-center items-center pointer-events-none z-10" style={{ width: '80px', height: '60px' }}>
        {Array.from({ length: size }).map((_, i) => {
          const rotation = (i - (size - 1) / 2) * 6;
          const xOffset = (i - (size - 1) / 2) * 12;
          const yOffset = Math.abs(i - (size - 1) / 2) * 3;
          
          let globalTransform = '';
          if (position === 'left') globalTransform = 'rotate(90deg) translate(40px, 0)';
          if (position === 'right') globalTransform = 'rotate(-90deg) translate(40px, 0)';
          if (position === 'top') globalTransform = 'translate(0, 30px) rotate(180deg)';

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
      <div className="relative flex justify-center items-end h-[140px] mb-8 z-30 pointer-events-auto w-full max-w-[800px]">
        {myHand.map((card, i) => {
          const isPlayable = gs.phase === "playing" ? playable.includes(card) : false;
          const isSelected = selectedCard === card;
          const size = myHand.length;
          
          // Fan math for a wider, flatter arc matching the inspiration
          const rotation = (i - (size - 1) / 2) * 3;
          const xOffset = (i - (size - 1) / 2) * 45; 
          const yOffset = Math.abs(i - (size - 1) / 2) * Math.abs(i - (size - 1) / 2) * 1.2; 
          const activeOffset = isSelected ? -30 : 0;

          return (
            <div
              key={card}
              className="absolute bottom-0 transform-gpu transition-all duration-200 hover:-translate-y-4 cursor-pointer"
              style={{
                transform: `translateX(${xOffset}px) translateY(${yOffset + activeOffset}px) rotate(${rotation}deg)`,
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
    <div className="h-screen w-full relative bg-black text-surry-cream font-sans overflow-hidden mobile-landscape-force p-2 lg:p-4">
       
       {/* Background Table Element */}
       <div className="absolute inset-2 lg:inset-4 rounded-[60px] lg:rounded-[140px] border-[12px] lg:border-[20px] border-[#3e1e04] bg-[#0d2f1a] shadow-[inset_0_0_100px_rgba(0,0,0,0.9),0_20px_50px_rgba(0,0,0,0.8)] pointer-events-none">
       </div>

       {/* Floating Header */}
       <div className="absolute top-6 left-8 right-8 flex items-center justify-between z-50 pointer-events-auto">
          <div className="flex items-center gap-4">
             <button className="text-3xl text-white/70 hover:text-white transition-colors">≡</button>
             <div className="hidden md:flex items-center gap-2 text-surry-gold font-serif text-2xl tracking-[2px] font-bold">
               <span className="text-[1.2em] leading-none drop-shadow-md">♠</span> <span className="drop-shadow-md">SURRY</span>
             </div>
          </div>
          
          <div className="flex items-center gap-4 text-[0.75rem] px-6 py-2.5 rounded-full border border-white/10 bg-black/40 backdrop-blur-md shadow-lg font-medium">
            <span className="text-white">Round {gs.round_number || 1}</span>
            <span className="text-white/20">|</span>
            <span className="text-white flex items-center gap-1">Trump <span className={["♥", "♦"].includes(trumpSymbol) ? "text-red-500" : "text-white"}>{trumpSymbol} {gs.trump_suit || "None"}</span></span>
            <span className="text-white/20">|</span>
            <span className="text-white">Bid <span className="text-surry-gold text-sm">{gs.winning_bid || "?"}</span> <span className="text-white/60 font-normal">by {getPlayerAt(gs.bid_winner_seat)?.player_name || "?"}</span></span>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-black/40 backdrop-blur-md text-[0.8rem] shadow-lg hidden md:flex">
               <span>👥 {roomPlayers.length} / 4</span>
               <span className={`w-2 h-2 rounded-full ${roomPlayers.length === 4 ? 'bg-green-500' : 'bg-surry-gold animate-pulse'}`}></span>
             </div>
             <button className="text-surry-red hover:text-red-400 font-medium px-4 py-1.5 rounded-full border border-surry-red/30 bg-black/40 backdrop-blur-md text-sm transition-colors" onClick={() => setShowExitConfirm(true)}>Leave</button>
             <button className="text-2xl text-white/70 hover:text-white transition-colors">⚙️</button>
          </div>
       </div>

       {/* Inner Table Game Area */}
       <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
          
          {/* Top Opponent */}
          {topOpp.p && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
              <Avatar name={topOpp.p.player_name} active={topOpp.isActive} score={0} />
              {topOpp.bid && <div className="text-[0.7rem] bg-black/60 px-3 py-1 rounded-full text-surry-gold border border-surry-gold/30 mt-[-4px]">Bid {topOpp.bid}</div>}
              <OpponentFan size={topOpp.size} position="top" />
            </div>
          )}

          {/* Left Opponent */}
          {leftOpp.p && (
            <div className="absolute left-12 top-1/2 -translate-y-1/2 flex items-center gap-8">
              <div className="flex flex-col items-center gap-2">
                 <Avatar name={leftOpp.p.player_name} active={leftOpp.isActive} score={0} />
                 {leftOpp.bid && <div className="text-[0.7rem] bg-black/60 px-3 py-1 rounded-full text-surry-gold border border-surry-gold/30">Bid {leftOpp.bid}</div>}
              </div>
              <OpponentFan size={leftOpp.size} position="left" />
            </div>
          )}

          {/* Right Opponent */}
          {rightOpp.p && (
            <div className="absolute right-12 top-1/2 -translate-y-1/2 flex items-center gap-8 flex-row-reverse">
              <div className="flex flex-col items-center gap-2">
                 <Avatar name={rightOpp.p.player_name} active={rightOpp.isActive} score={0} />
                 {rightOpp.bid && <div className="text-[0.7rem] bg-black/60 px-3 py-1 rounded-full text-surry-gold border border-surry-gold/30">Bid {rightOpp.bid}</div>}
              </div>
              <OpponentFan size={rightOpp.size} position="right" />
            </div>
          )}

          {/* Center Area */}
          <div className="flex flex-col items-center justify-center -mt-8">
            <TrickDisplay trick={trick} mySeat={mySeat} roomPlayers={roomPlayers} />

            <div className="mt-32 flex flex-col items-center gap-2">
              <PileStack pile={pile} />
              {gs.consecutive_wins > 0 && gs.pile_owner_seat !== null && (
                <div className="px-6 py-1.5 rounded-full border border-[#d4af37]/40 bg-black/60 backdrop-blur-md text-[0.7rem] flex flex-col items-center gap-1 mt-2 shadow-lg">
                  <span className="text-[0.55rem] text-[#d4af37] tracking-[2px]">CURRENT STREAK</span>
                  <span className="text-white flex items-center gap-1 font-medium">🔥 {getPlayerAt(gs.pile_owner_seat)?.player_name} <span className="text-[#d4af37] ml-1">{gs.consecutive_wins}</span> / 2</span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom (Me) */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center w-full max-w-[1000px]">
             {isMyTurn && (
                <div className="mb-4 text-surry-gold text-[0.75rem] tracking-[3px] animate-pulse relative z-10 font-bold bg-black/40 px-4 py-1 rounded-full border border-surry-gold/30 backdrop-blur-sm">
                  YOUR TURN
                </div>
              )}
             <MyFan />
          </div>

       </div>

       {/* Floating Bottom Left (Chat) and Bottom Right (Sort) */}
       <button className="absolute bottom-8 left-8 flex items-center gap-2 px-6 py-2.5 rounded-full bg-black/60 border border-white/10 hover:border-white/30 hover:bg-black/80 backdrop-blur-md text-[0.9rem] z-50 pointer-events-auto transition-all shadow-lg font-medium text-white/90">
          💬 Chat
       </button>
       <button className="absolute bottom-8 right-8 flex items-center gap-2 px-6 py-2.5 rounded-full bg-black/60 border border-white/10 hover:border-white/30 hover:bg-black/80 backdrop-blur-md text-[0.9rem] z-50 pointer-events-auto transition-all shadow-lg font-medium text-white/90">
          Sort ↕
       </button>

       {/* Play Card Button */}
       {gs.phase === "playing" && isMyTurn && selectedCard && (
         <div className="absolute bottom-32 right-12 z-50 pointer-events-auto">
           <button
             className="px-8 py-4 bg-gradient-to-b from-[#e3c46b] to-[#b89130] text-black font-bold rounded-full shadow-[0_4px_20px_rgba(201,168,76,0.5)] hover:scale-105 active:scale-95 transition-all border border-[#fff5cc]"
             onClick={() => playCard(selectedCard)}
           >
             Play Card
           </button>
         </div>
       )}

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
    </div>
  );
}
