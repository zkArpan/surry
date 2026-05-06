export default function LobbyScreen({ 
  screen, 
  playerName, 
  saveName, 
  setScreen, 
  joinInput, 
  setJoinInput, 
  joinRoom, 
  loading, 
  error, 
  createRoom 
}) {
  if (screen === "home") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-8">
        <div className="text-center">
          <div className="font-serif text-[3.5rem] font-bold text-surry-gold tracking-[4px] drop-shadow-[0_0_30px_rgba(201,168,76,0.4)]">
            SURRY
          </div>
          <div className="text-surry-cream-d text-[0.75rem] tracking-[6px] -mt-2">
            taash • trick-taking • 4 players
          </div>
        </div>
        <div className="bg-black/40 border border-surry-border rounded-xl p-8 w-full max-w-[420px] backdrop-blur-[10px] flex flex-col gap-4">
          <button className="btn btn-gold w-full py-3 text-[1.1rem]" onClick={() => setScreen("create")}>Create Room</button>
          <button className="btn btn-outline w-full py-3 text-[1.1rem]" onClick={() => setScreen("join")}>Join Room</button>
        </div>
        <div className="text-surry-cream-d text-[0.68rem] text-center max-w-[320px] leading-relaxed">
          Win 2 consecutive tricks to secure the pile.<br/>
          Teams: Seats 1&3 vs 2&4. Be the one to bid and dominate.
        </div>
      </div>
    );
  }

  if (screen === "create") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-8">
        <div className="font-serif text-surry-gold text-3xl font-bold tracking-[4px] drop-shadow-[0_0_30px_rgba(201,168,76,0.4)]">
          New Room
        </div>
        <div className="bg-black/40 border border-surry-border rounded-xl p-8 w-full max-w-[420px] backdrop-blur-[10px]">
          <div className="text-[0.65rem] tracking-[4px] text-surry-cream-d mb-6 uppercase">Playing as</div>
          <input 
            className="inp" 
            placeholder="Enter your name..."
            value={playerName} 
            onChange={e => saveName(e.target.value)} 
            maxLength={20}
          />
          <div className="h-6" />
          <button className="btn btn-gold w-full" onClick={createRoom} disabled={loading}>
            {loading ? "Creating..." : "Create & Join"}
          </button>
          <button className="btn btn-outline w-full mt-3" onClick={() => setScreen("home")}>Back</button>
          {error && <div className="text-surry-red-l text-xs mt-2">{error}</div>}
        </div>
      </div>
    );
  }

  if (screen === "join") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-8">
        <div className="font-serif text-surry-gold text-3xl font-bold tracking-[4px] drop-shadow-[0_0_30px_rgba(201,168,76,0.4)]">
          Join Room
        </div>
        <div className="bg-black/40 border border-surry-border rounded-xl p-8 w-full max-w-[420px] backdrop-blur-[10px]">
          <div className="text-[0.65rem] tracking-[4px] text-surry-cream-d mb-3 uppercase">Playing as</div>
          <input 
            className="inp mb-6" 
            placeholder="Enter your name..."
            value={playerName} 
            onChange={e => saveName(e.target.value)} 
            maxLength={20}
          />
          
          <div className="text-[0.65rem] tracking-[4px] text-surry-cream-d mb-3 uppercase">Room Number</div>
          <input 
            className="inp" 
            placeholder="Room code..." 
            value={joinInput} 
            onChange={e => setJoinInput(e.target.value.toUpperCase())} 
            maxLength={5} 
          />
          
          <div className="h-6" />
          <button className="btn btn-gold w-full" onClick={joinRoom} disabled={loading}>
            {loading ? "Joining..." : "Join Game"}
          </button>
          <button className="btn btn-outline w-full mt-3" onClick={() => setScreen("home")}>Back</button>
          {error && <div className="text-surry-red-l text-xs mt-2">{error}</div>}
        </div>
      </div>
    );
  }

  return null;
}
