import { cardRank, cardSuit } from "../lib/gameLogic";

export default function CardView({ card, small, playable, selected, onClick, faceDown, style }) {
  if (!card && !faceDown) return null;

  const baseClasses = "flex flex-col items-center justify-center font-bold relative shrink-0 transition-all duration-150 rounded bg-white border border-gray-300";
  const sizeClasses = small ? "w-[34px] h-[48px] text-[0.7rem]" : "w-[44px] h-[62px] text-[0.9rem]";
  
  if (faceDown) {
    return (
      <div 
        className={`${baseClasses} ${sizeClasses} bg-gradient-to-br from-surry-green to-[#0d2b18] border-[#3a8f54] text-transparent shadow-sm`}
        style={style}
      />
    );
  }

  const rank = cardRank(card);
  const suit = cardSuit(card);
  const red = ["♥", "♦"].includes(suit);
  
  const colorClasses = red ? "text-surry-red-l" : "text-[#111]";
  
  let interactiveClasses = "cursor-default shadow-sm";
  if (playable) {
    interactiveClasses = "cursor-pointer ring-2 ring-surry-gold hover:-translate-y-2 hover:shadow-[0_4px_12px_rgba(201,168,76,0.5)]";
  }
  if (selected) {
    interactiveClasses = "cursor-pointer ring-2 ring-surry-gold-l -translate-y-3 shadow-[0_6px_16px_rgba(201,168,76,0.4)]";
  }

  return (
    <div
      className={`${baseClasses} ${sizeClasses} ${colorClasses} ${interactiveClasses}`}
      onClick={playable ? onClick : undefined}
      style={style}
    >
      <span className="absolute top-[3px] left-[4px] text-[0.75em] leading-none">{rank}</span>
      <span className="text-[1.1em]">{suit}</span>
    </div>
  );
}
