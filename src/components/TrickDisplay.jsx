import CardView from "./CardView";

export default function TrickDisplay({ trick, mySeat, roomPlayers }) {
  if (!trick || trick.length === 0) return null;

  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-20">
      <div className="relative flex justify-center items-center h-[90px]">
        {trick.map((play, idx) => {
          const playerName = roomPlayers?.find(p => p.seat === play.seat)?.player_name || `Seat ${play.seat+1}`;
          
          // Fan out cards slightly based on order played
          // First card at -15deg, second at -5deg, third at 5deg, fourth at 15deg
          const rotation = (idx - (trick.length - 1) / 2) * 12;
          const xOffset = (idx - (trick.length - 1) / 2) * 15;
          const yOffset = Math.abs(idx - (trick.length - 1) / 2) * 5;

          return (
            <div
              key={`${play.seat}-${play.card}`}
              className="absolute transition-all duration-500 ease-out"
              style={{
                transform: `translate(${xOffset}px, ${yOffset}px) rotate(${rotation}deg)`,
                zIndex: idx
              }}
            >
              {/* Optional: Add name label below card if desired, but screenshot shows just cards in center */}
              <CardView card={play.card} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
