import CardView from "./CardView";

export default function TrickDisplay({ trick, mySeat, roomPlayers }) {
  if (!trick || trick.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center items-center gap-1.5">
      {trick.map((play, idx) => {
        const playerName =
          roomPlayers?.find(p => p.seat === play.seat)?.player_name ||
          `Seat ${play.seat + 1}`;
        const isMe = play.seat === mySeat;

        return (
          <div
            key={`${play.seat}-${play.card}`}
            className="flex flex-col items-center gap-0.5"
            style={{ zIndex: idx }}
          >
            <div className={`text-[0.45rem] truncate max-w-[40px] text-center ${isMe ? "text-surry-gold" : "text-white/50"}`}>
              {isMe ? "You" : playerName}
            </div>
            <CardView card={play.card} small />
          </div>
        );
      })}
    </div>
  );
}
