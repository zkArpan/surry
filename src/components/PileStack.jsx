import CardView from "./CardView";

export default function PileStack({ pile }) {
  const lastFour = (pile || []).slice(-4);
  if (!lastFour.length) return null;
  return (
    <div className="pointer-events-none opacity-95 drop-shadow-[0_10px_24px_rgba(0,0,0,0.45)]">
      <div className="relative w-[88px] h-[118px]">
        {lastFour.map((play, i) => (
          <div 
            key={i} 
            className="absolute"
            style={{ left: i * 10, top: i * 7, transform: `rotate(${(i - 1.5) * 5}deg)` }}
          >
            <CardView card={play.card} small />
          </div>
        ))}
      </div>
      <div className="mt-[6px] text-center text-[0.62rem] text-surry-cream-d tracking-wider">
        Pile ({Math.floor((pile || []).length / 4)} trick{Math.floor((pile || []).length / 4) !== 1 ? "s" : ""})
      </div>
    </div>
  );
}
