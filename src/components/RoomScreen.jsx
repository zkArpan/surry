export default function RoomScreen({
  roomId,
  roomPlayers,
  getPlayerAt,
  playerId,
  takeSeat,
  startGame,
  setShowExitConfirm,
  error
}) {
  const isFull = roomPlayers.length === 4 && [0, 1, 2, 3].every(s => roomPlayers.some(p => p.seat === s));

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-8">
      <div className="font-serif text-[1.8rem] text-surry-gold">Room Lobby</div>
      
      <div className="flex gap-3 items-center">
        <div className="bg-surry-gold/15 border border-surry-gold/30 rounded-md px-4 py-[0.4rem] text-[1.1rem] tracking-[4px] text-surry-gold-l">
          {roomId}
        </div>
        <button 
          className="btn btn-outline btn-sm" 
          onClick={() => navigator.clipboard.writeText(roomId)}
        >
          Copy
        </button>
      </div>

      <div className="bg-black/40 border border-surry-border rounded-xl p-8 w-full max-w-[480px] backdrop-blur-[10px]">
        <div className="text-[0.65rem] tracking-[4px] text-surry-cream-d mb-6 uppercase">
          Seats — Teams: ♦ A (0,2) vs ♣ B (1,3)
        </div>
        
        <div className="grid grid-cols-2 gap-3 my-4">
          {[0, 1, 2, 3].map(seat => {
            const p = getPlayerAt(seat);
            const isMe = p?.player_id === playerId;
            const isTeamA = [0, 2].includes(seat);
            const teamColor = isTeamA ? "text-[#7ec8e3]" : "text-[#f4a261]";
            
            return (
              <div 
                key={seat} 
                className={`bg-black/30 border rounded-lg p-3 flex items-center gap-3 transition-colors duration-200 
                  ${p ? "border-surry-green-l" : "border-surry-border"} 
                  ${isMe ? "border-surry-gold bg-surry-gold/10" : ""}`}
              >
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 
                    ${p ? "bg-surry-green border border-surry-green-l text-[#90ee90]" : "bg-white/5 border border-dashed border-surry-border text-surry-cream-d"}`}
                >
                  {p ? p.player_name.slice(0, 2).toUpperCase() : seat + 1}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className={`${teamColor} text-[0.7rem] tracking-[1px]`}>
                    {isTeamA ? "Team A" : "Team B"} · Seat {seat + 1}
                  </div>
                  <div className="text-[0.8rem] text-surry-cream truncate">
                    {p ? p.player_name : <span className="text-surry-cream-d">Empty</span>}
                    {isMe && <span className="text-surry-gold ml-1">(you)</span>}
                  </div>
                </div>
                {!p && (
                  <button 
                    className="btn btn-outline btn-sm ml-auto" 
                    onClick={() => takeSeat(seat)}
                  >
                    Sit
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-[0.7rem] text-surry-cream-d mb-4">
          Players: {roomPlayers.length}/4
          {roomPlayers.length < 4 && <span className="waiting-pulse"> · Waiting for players...</span>}
        </div>

        {isFull && (
          <button className="btn btn-gold w-full mb-2" onClick={startGame}>Start Game</button>
        )}
        
        <button className="btn btn-outline w-full" onClick={() => setShowExitConfirm(true)}>Exit</button>
        
        {error && <div className="text-surry-red-l text-xs mt-2">{error}</div>}
      </div>
    </div>
  );
}
