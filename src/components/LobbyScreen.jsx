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
        <div className="bg-black/40 border border-surry-border rounded-xl p-8 w-full max-w-[420px] backdrop-blur-[10px]">
          <div className="text-[0.65rem] tracking-[4px] text-surry-cream-d mb-6 uppercase">Your Name</div>
          <input 
            className="inp" 
            placeholder="Enter your name..." 
            value={playerName} 
            onChange={e => saveName(e.target.value)} 
            maxLength={20}
          />
          <div className="h-6" />
          <div className="flex flex-col gap-2">
            <button className="btn btn-gold w-full" onClick={() => setScreen("create")}>Create Room</button>
            <div className="flex items-center gap-4 text-surry-cream-d text-[0.7rem] my-2 before:content-[''] before:flex-1 before:h-[1px] before:bg-surry-border after:content-[''] after:flex-1 after:h-[1px] after:bg-surry-border">
              or
            </div>
            <div className="flex gap-2">
              <input 
                className="inp flex-1" 
                placeholder="Room code..." 
                value={joinInput} 
                onChange={e => setJoinInput(e.target.value.toUpperCase())} 
                maxLength={5} 
              />
              <button className="btn btn-outline" onClick={joinRoom} disabled={loading}>Join</button>
            </div>
          </div>
          {error && <div className="text-surry-red-l text-xs mt-2">{error}</div>}
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
            value={playerName} 
            onChange={e => saveName(e.target.value)} 
            maxLength={20}
          />
          <div className="h-6" />
          <button className="btn btn-gold w-full" onClick={createRoom} disabled={loading}>
            {loading ? "Creating..." : "Create & Join"}
          </button>
          <button className="btn btn-outline w-full mt-2" onClick={() => setScreen("home")}>Back</button>
          {error && <div className="text-surry-red-l text-xs mt-2">{error}</div>}
        </div>
      </div>
    );
  }

  return null;
}
