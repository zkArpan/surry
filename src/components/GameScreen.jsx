import { useState, useEffect } from "react";
import { seatTeam } from "../lib/gameLogic";
import { webrtc } from "../lib/webrtc";

const SUITS = ["♠", "♥", "♦", "♣"];
const SUIT_NAMES = { "♠": "spades", "♥": "hearts", "♦": "diamonds", "♣": "clubs" };

export default function GameScreen({
  gs, mySeat, roomPlayers, getPlayerAt, trick, pile, log,
  isMyTurn, trumpSymbol, validBids, bids, myHand, playable,
  selectedCard, setSelectedCard, playCard, placeBid, selectTrump,
  setShowStats, setShowExitConfirm, error
}) {
  const [isMicMuted, setIsMicMuted] = useState(true);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(true);

  const [displayTrick, setDisplayTrick] = useState(trick);
  const [displayPile, setDisplayPile] = useState(pile);
  const [slideOutWinner, setSlideOutWinner] = useState(null);

  useEffect(() => {
    if (pile.length === 0 && displayPile.length > 0 && trick.length === 0) {
      setSlideOutWinner(gs.last_trick_winner);
      const t = setTimeout(() => {
        setDisplayTrick([]);
        setDisplayPile([]);
        setSlideOutWinner(null);
      }, 500);
      return () => clearTimeout(t);
    } else {
      if (slideOutWinner === null) {
        setDisplayTrick(trick);
        setDisplayPile(pile);
      }
    }
  }, [trick, pile, gs.last_trick_winner]);

  useEffect(() => {
    const myPlayer = roomPlayers?.find(p => p.seat === mySeat);
    if (gs?.id && myPlayer?.user_id) {
      webrtc.joinVoice(gs.id, myPlayer.user_id).catch(err => console.error("Voice chat init failed", err));
    }
    return () => {
      webrtc.leaveVoice();
    };
  }, [gs?.id, roomPlayers, mySeat]);

  const toggleMic = async () => setIsMicMuted(await webrtc.toggleMic());
  const toggleSpeaker = () => setIsSpeakerMuted(webrtc.toggleSpeaker());

  const getHandSize = (seat) => {
    const h = typeof gs.hands === "string" ? JSON.parse(gs.hands) : (gs.hands || {});
    return (h[seat] || h[String(seat)] || []).length;
  };

  const secured = typeof gs.secured_tricks === "string"
    ? JSON.parse(gs.secured_tricks)
    : (gs.secured_tricks || { "02": 0, "13": 0 });

  const topSeat = (mySeat + 2) % 4;
  const leftSeat = (mySeat + 3) % 4;
  const rightSeat = (mySeat + 1) % 4;

  const topP = getPlayerAt(topSeat);
  const leftP = getPlayerAt(leftSeat);
  const rightP = getPlayerAt(rightSeat);

  const isActive = (seat) => gs.current_turn_seat === seat;
  const trickCount = (seat) => secured[seatTeam(seat)] || 0;
  const winBid = gs.winning_bid || "?";
  const trumpColor = ["♥", "♦"].includes(trumpSymbol) ? "#e74c3c" : "#f0e6cc";
  const pileCount = Math.floor((pile || []).length / 4);

  // ── face-down card fan ───────────────────────────────────────────────────
  const OpponentFan = ({ count, position, active }) => {
    if (!count) return null;
    const n = Math.min(count, 13);
    return (
      <div className="relative" style={{ width: 120, height: 100 }}>
        {Array.from({ length: n }).map((_, i) => {
          const mid = (n - 1) / 2;
          const t = n > 1 ? (i - mid) / (mid || 1) : 0;
          const spread = Math.min(n * 5.5, 52);
          let tx = 0, ty = 0, rot = 0;
          if (position === "top") {
            tx = t * spread; ty = -Math.abs(t) * 7;
            rot = 180 + t * Math.min(n * 3, 26);
          } else if (position === "left") {
            ty = t * spread; tx = Math.abs(t) * 5;
            rot = 90 + t * Math.min(n * 2.5, 20);
          } else {
            ty = t * spread; tx = -Math.abs(t) * 5;
            rot = -90 + t * Math.min(n * 2.5, 20);
          }
          return (
            <div key={i} className="absolute" style={{
              left: "50%", top: "50%",
              transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) rotate(${rot}deg)`,
              zIndex: i,
            }}>
              <div style={{
                width: 34, height: 50, borderRadius: 5,
                background: active
                  ? "linear-gradient(135deg,#c0392b,#7b1a12)"
                  : "linear-gradient(135deg,#8b2020,#4a1010)",
                border: "2px solid rgba(255,255,255,0.2)",
                boxShadow: "0 2px 6px rgba(0,0,0,0.55)",
              }} />
            </div>
          );
        })}
      </div>
    );
  };

  // ── player name + score pill (REMOVED - no longer used) ─────────────────

  // ── avatar circle only (no name) ────────────────────────────────────────
  const AvatarOnly = ({ p, seat, size = 56 }) => {
    if (!p) return null;
    const active = isActive(seat);
    const tricks = trickCount(seat);
    return (
      <div className="relative" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          width: size, height: size, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: size * 0.42, fontFamily: "serif", fontWeight: 700,
          color: "#f0e6cc",
          background: active
            ? "linear-gradient(135deg,#c9a84c,#8B6914)"
            : "linear-gradient(135deg,#2a1e0e,#191008)",
          border: active ? `${size * 0.08}px solid #c9a84c` : `${size * 0.08}px solid rgba(255,255,255,0.18)`,
          boxShadow: active ? "0 0 14px rgba(201,168,76,0.65)" : "0 2px 8px rgba(0,0,0,0.6)",
          flexShrink: 0,
        }}>
          {p.player_name.charAt(0).toUpperCase()}
        </div>
        {/* Trick count badge */}
        <div style={{
          position: "absolute",
          background: "rgba(74, 222, 128, 0.9)",
          color: "#111",
          borderRadius: "50%",
          width: 24,
          height: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          border: "2px solid #fff",
          bottom: -8,
          right: -8,
          fontFamily: "sans-serif",
        }}>
          {tricks}
        </div>
      </div>
    );
  };

  // ── pile cards display ──────────────────────────────────────────────────
  const PileDisplay = () => {
    if (!displayPile || displayPile.length === 0) return null;
    const lastTricks = (displayPile || []).slice(-4);
    return (
      <div className="relative" style={{ width: 220, height: 220 }}>
        {lastTricks.map((play, idx) => {
          const xOff = (idx - 1.5) * 18;
          const yOff = idx % 2 === 0 ? -2 : 2;
          const rot = (idx - 1.5) * 6;
          const rank = play.card.slice(0, -1);
          const suit = play.card.slice(-1);
          const red = ["♥", "♦"].includes(suit);

          let exitX = "0px", exitY = "0px";
          if (slideOutWinner === topSeat) exitY = "-40vh";
          else if (slideOutWinner === leftSeat) exitX = "-40vw";
          else if (slideOutWinner === rightSeat) exitX = "40vw";
          else if (slideOutWinner === mySeat) exitY = "40vh";
          const isSliding = slideOutWinner !== null;

          return (
            <div key={`pile-${play.seat}-${play.card}-${idx}`} className={`absolute ${isSliding ? "animate-slide-out" : ""}`} style={{
              left: "50%", top: "50%",
              "--start-x": `${xOff}px`,
              "--start-y": `${yOff}px`,
              "--start-rot": `${rot}deg`,
              "--exit-x": exitX,
              "--exit-y": exitY,
              transform: isSliding ? undefined : `translate(calc(-50% + ${xOff}px), calc(-50% + ${yOff}px)) rotate(${rot}deg)`,
              zIndex: idx,
              filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.4))",
            }}>
              <div style={{
                width: 40, height: 56, background: "#fff",
                borderRadius: 4, border: "1.5px solid #ccc",
                boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                position: "relative", fontFamily: "serif",
              }}>
                <span style={{
                  position: "absolute", top: 2, left: 3, fontSize: 11,
                  fontWeight: 700, color: red ? "#e74c3c" : "#333", lineHeight: 1,
                }}>{rank}</span>
                <span style={{ fontSize: 18, color: red ? "#e74c3c" : "#333" }}>{suit}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── center trick cards in + pattern by player position ──────────────────
  const CenterTrick = () => {
    if (!displayTrick || displayTrick.length === 0) return null;
    
    // Map each seat to its position in the + pattern
    const getPositionBySeat = (seat) => {
      if (seat === topSeat) return { x: 0, y: -37, rot: 0 };      // top
      if (seat === leftSeat) return { x: -37, y: 0, rot: 90 };    // left
      if (seat === rightSeat) return { x: 37, y: 0, rot: -90 };   // right
      if (seat === mySeat) return { x: 0, y: 37, rot: 0 };        // bottom
      return { x: 0, y: 0, rot: 0 };
    };
    
    return (
      <div className="relative" style={{ width: 220, height: 220 }}>
        {displayTrick.map((play, idx) => {
          const pos = getPositionBySeat(play.seat);
          const rank = play.card.slice(0, -1);
          const suit = play.card.slice(-1);
          const red = ["♥", "♦"].includes(suit);

          let startX = "0px";
          let startY = "0px";
          if (play.seat === topSeat) { startY = "-40vh"; }
          else if (play.seat === leftSeat) { startX = "-40vw"; }
          else if (play.seat === rightSeat) { startX = "40vw"; }
          else if (play.seat === mySeat) { startY = "40vh"; }

          let exitX = "0px", exitY = "0px";
          if (slideOutWinner === topSeat) exitY = "-40vh";
          else if (slideOutWinner === leftSeat) exitX = "-40vw";
          else if (slideOutWinner === rightSeat) exitX = "40vw";
          else if (slideOutWinner === mySeat) exitY = "40vh";
          const isSliding = slideOutWinner !== null;

          return (
            <div key={`${play.seat}-${play.card}`} className={`absolute ${isSliding ? "animate-slide-out" : "animate-card-play"}`} style={{
              left: "50%", top: "50%",
              "--start-x": isSliding ? `${pos.x}px` : startX,
              "--start-y": isSliding ? `${pos.y}px` : startY,
              "--start-rot": `${pos.rot}deg`,
              "--end-x": `${pos.x}px`,
              "--end-y": `${pos.y}px`,
              "--end-rot": `${pos.rot}deg`,
              "--exit-x": exitX,
              "--exit-y": exitY,
              transform: isSliding ? undefined : `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) rotate(${pos.rot}deg)`,
              zIndex: idx + 10,
              filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.55))",
            }}>
              <div style={{
                width: 52, height: 74, background: "#fff",
                borderRadius: 6, border: "1.5px solid #ccc",
                boxShadow: "0 3px 10px rgba(0,0,0,0.35)",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                position: "relative", fontFamily: "serif",
              }}>
                <span style={{
                  position: "absolute", top: 3, left: 5, fontSize: 13,
                  fontWeight: 700, color: red ? "#e74c3c" : "#111", lineHeight: 1,
                }}>{rank}</span>
                <span style={{ fontSize: 22, color: red ? "#e74c3c" : "#111" }}>{suit}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const MyHand = () => {
    const count = myHand.length;
    if (!count) return null;
    const CARD_W = 52;
    const CARD_H = 74;
    const overlap = count > 10 ? 30 : count > 7 ? 36 : count > 5 ? 42 : 48;
    const totalW = CARD_W + (count - 1) * overlap;
    const arcH = count > 1 ? 16 : 0;

    return (
      <div className="relative" style={{ width: totalW, height: CARD_H + arcH + 8 }}>
        {myHand.map((card, i) => {
          const mid = (count - 1) / 2;
          const t = count > 1 ? (i - mid) / (mid || 1) : 0;
          const x = i * overlap;
          const y = Math.abs(t) * arcH * 0.5;
          const rot = t * Math.min(count * 1.4, 18);
          const rank = card.slice(0, -1);
          const suit = card.slice(-1);
          const red = ["♥", "♦"].includes(suit);
          const isPlay = gs.phase === "playing" && playable.includes(card);
          const isSel = selectedCard === card;

          return (
            <div key={card} className="absolute transition-all duration-150" style={{
              left: x, top: isSel ? y - 22 : y,
              transform: `rotate(${rot}deg)`,
              transformOrigin: "bottom center",
              zIndex: isSel ? 100 : i + 1,
              cursor: isPlay ? "pointer" : "default",
              filter: isPlay
                ? "drop-shadow(0 4px 8px rgba(201,168,76,0.4))"
                : "drop-shadow(0 2px 4px rgba(0,0,0,0.45))",
            }}
              onClick={() => {
                if (gs.phase !== "playing") return;
                if (isSel) { playCard(card); setSelectedCard(null); }
                else setSelectedCard(card);
              }}
            >
              <div style={{
                width: CARD_W, height: CARD_H,
                background: "#fff", borderRadius: 6,
                border: isSel
                  ? "2.5px solid #c9a84c"
                  : isPlay
                    ? "2px solid rgba(201,168,76,0.55)"
                    : "1.5px solid #ccc",
                boxShadow: isSel
                  ? "0 8px 24px rgba(201,168,76,0.55)"
                  : "0 2px 6px rgba(0,0,0,0.3)",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                position: "relative", fontFamily: "serif",
              }}>
                <span style={{
                  position: "absolute", top: 3, left: 5, fontSize: 13,
                  fontWeight: 700, color: red ? "#e74c3c" : "#111", lineHeight: 1,
                }}>{rank}</span>
                <span style={{ fontSize: 20, color: red ? "#e74c3c" : "#111" }}>{suit}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 overflow-hidden select-none" style={{
      background: "radial-gradient(ellipse at center, #8B5E3C 0%, #6B4226 45%, #4a2c17 100%)",
    }}>
      {/* wood grain */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `repeating-linear-gradient(91deg,transparent,transparent 38px,rgba(0,0,0,0.035) 38px,rgba(0,0,0,0.035) 39px)`,
      }} />

      {/* ── TOP LEFT: CLOSE BUTTON WITH TRUMP, BID & ROUND ── */}
      <div className="absolute top-4 left-4 z-50 flex items-center gap-1.5">
        <button
          onClick={() => setShowExitConfirm(true)}
          style={{
            width: 35, height: 35, borderRadius: 6, fontSize: 20,
            background: "#c0392b",
            border: "2px solid #8b2c23",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 3px 8px rgba(192, 57, 43, 0.6)",
            fontWeight: 700,
            color: "#fff",
            flexShrink: 0,
          }}
        >✕</button>

        {/* Round number */}
        <div style={{
          padding: "4px 8px", borderRadius: 6,
          background: "rgba(15,8,2,0.85)", border: "1px solid rgba(255,255,255,0.14)",
          color: "#f0e6cc", fontSize: 10, fontFamily: "sans-serif", fontWeight: 600
        }}>
          Round {gs.round_number || 1}
        </div>

        {/* Bid */}
        <div style={{
          padding: "4px 8px", borderRadius: 6,
          background: "rgba(15,8,2,0.85)", border: "1px solid rgba(255,255,255,0.14)",
          color: "#f0e6cc", fontSize: 10, fontFamily: "sans-serif", fontWeight: 600
        }}>
          Bid <span style={{ color: "#c9a84c", fontWeight: 700 }}>{gs.winning_bid || "?"}</span>
          {" "}by <span style={{ color: "rgba(201,168,76,0.8)" }}>{getPlayerAt(gs.bid_winner_seat)?.player_name || "—"}</span>
        </div>

        {/* Trump */}
        <div style={{
          padding: "4px 8px", borderRadius: 6,
          background: "rgba(15,8,2,0.85)", border: "1px solid rgba(255,255,255,0.14)",
          color: "#f0e6cc", fontSize: 10, fontFamily: "sans-serif", fontWeight: 600
        }}>
          Trump <span style={{ color: trumpColor, fontWeight: 700 }}>
            {trumpSymbol} {gs.trump_suit ? gs.trump_suit.charAt(0).toUpperCase() + gs.trump_suit.slice(1) : "—"}
          </span>
        </div>
      </div>

      {/* ── TOP CENTER: TOP OPPONENT AVATAR & NAME ── */}
      <div className="absolute top-0 left-1/2 z-50" style={{ transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        {AvatarOnly({ p: topP, seat: topSeat, size: 48 })}
        <div style={{ fontSize: 10, color: "#f0e6cc", fontFamily: "sans-serif", fontWeight: 600, whiteSpace: "nowrap" }}>
          {topP?.player_name || "—"}
        </div>
      </div>

      {/* ── TOP RIGHT: AUDIO CONTROLS ── */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <button
          onClick={toggleMic}
          style={{
            width: 28, height: 28, borderRadius: 6, fontSize: 12,
            background: isMicMuted ? "rgba(150,30,30,0.8)" : "rgba(15,8,2,0.72)",
            border: "1px solid rgba(255,255,255,0.14)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >{isMicMuted ? "🔇" : "🎤"}</button>
        <button
          onClick={toggleSpeaker}
          style={{
            width: 28, height: 28, borderRadius: 6, fontSize: 12,
            background: isSpeakerMuted ? "rgba(150,30,30,0.8)" : "rgba(15,8,2,0.72)",
            border: "1px solid rgba(255,255,255,0.14)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >{isSpeakerMuted ? "🔈" : "🔊"}</button>
        <button
          onClick={() => setShowStats(true)}
          style={{
            width: 28, height: 28, borderRadius: 6, fontSize: 12,
            background: "rgba(15,8,2,0.72)", border: "1px solid rgba(255,255,255,0.14)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >📊</button>
      </div>

      {/* ── LEFT OPPONENT ── */}
      <div className="absolute" style={{
        top: "50%", left: 12, transform: "translateY(-50%)", zIndex: 30, display: "flex", alignItems: "center", gap: 6,
      }}>
        <div style={{ fontSize: 10, color: "#f0e6cc", fontFamily: "sans-serif", fontWeight: 600, whiteSpace: "nowrap" }}>
          {leftP?.player_name || "—"}
        </div>
        {AvatarOnly({ p: leftP, seat: leftSeat, size: 56 })}
      </div>

      {/* ── RIGHT OPPONENT ── */}
      <div className="absolute" style={{
        top: "50%", right: 12, transform: "translateY(-50%)", zIndex: 30, display: "flex", alignItems: "center", gap: 6,
      }}>
        {AvatarOnly({ p: rightP, seat: rightSeat, size: 56 })}
        <div style={{ fontSize: 10, color: "#f0e6cc", fontFamily: "sans-serif", fontWeight: 600, whiteSpace: "nowrap" }}>
          {rightP?.player_name || "—"}
        </div>
      </div>

      {/* ── CENTER: trick + pile in + pattern ── */}
      <div className="absolute" style={{
        top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 20,
      }}>
        {/* Pile cards (lower z-index, rendered behind) */}
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", zIndex: 5 }}>
          {PileDisplay()}
        </div>
        
        {/* Played cards (higher z-index, rendered on top) */}
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", zIndex: 15 }}>
          {CenterTrick()}
        </div>
      </div>

      {/* ── YOUR TURN indicator ── */}
      {isMyTurn && gs.phase === "playing" && (
        <div className="absolute animate-pulse" style={{
          bottom: 140, left: "50%", transform: "translateX(-50%)",
          color: "#c9a84c", fontSize: 11, fontWeight: 700,
          letterSpacing: "0.2em", fontFamily: "sans-serif",
          textShadow: "0 0 12px rgba(201,168,76,0.8)",
        }}>
          YOUR TURN
        </div>
      )}

      {/* ── MY HAND ── */}
      <div className="absolute" style={{
        bottom: -20, left: "50%", transform: "translateX(-50%)", zIndex: 30,
      }}>
        {MyHand()}
      </div>

      {/* ── PLAY BUTTON ── */}
      {gs.phase === "playing" && isMyTurn && selectedCard && (
        <div className="absolute z-50" style={{ bottom: 90, right: 14 }}>
          <button
            onClick={() => { playCard(selectedCard); setSelectedCard(null); }}
            style={{
              padding: "10px 20px", borderRadius: 999,
              background: "linear-gradient(135deg,#c9a84c,#8B6914)",
              color: "#1a0f04", fontWeight: 700, fontSize: 14,
              boxShadow: "0 4px 18px rgba(201,168,76,0.55)",
              border: "none", cursor: "pointer",
              fontFamily: "sans-serif",
            }}
          >
            Play ▶
          </button>
        </div>
      )}

      {/* ── BIDDING MODAL ── */}
      {gs.phase === "bidding" && isMyTurn && (
        <div className="fixed inset-0 flex items-center justify-center z-[100]"
          style={{ background: "rgba(0,0,0,0.72)" }}>
          <div style={{
            width: "min(500px, 92vw)", borderRadius: 16, padding: "20px",
            background: "rgba(22,13,5,0.98)", border: "1px solid rgba(201,168,76,0.42)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.7)", fontFamily: "sans-serif",
          }}>


            <div style={{ fontFamily: "serif", fontSize: 22, color: "#c9a84c", textAlign: "center", marginBottom: 2 }}>
              Your Bid
            </div>
            <div style={{ fontSize: 12, color: "rgba(240,230,204,0.45)", textAlign: "center", marginBottom: 16 }}>
              Raise the bid or pass
            </div>

            {/* Display 5 initial cards */}
            <div style={{
              display: "flex", justifyContent: "center", gap: 8, marginBottom: 20,
              padding: "12px", background: "rgba(0,0,0,0.3)", borderRadius: 12,
            }}>
              {myHand.slice(0, 5).map((card, i) => {
                const rank = card.slice(0, -1);
                const suit = card.slice(-1);
                const red = ["♥", "♦"].includes(suit);
                return (
                  <div key={card} style={{
                    width: 48, height: 68, background: "#fff",
                    borderRadius: 6, border: "1.5px solid #ccc",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    position: "relative", fontFamily: "serif",
                  }}>
                    <span style={{
                      position: "absolute", top: 2, left: 3, fontSize: 11,
                      fontWeight: 700, color: red ? "#e74c3c" : "#111", lineHeight: 1,
                    }}>{rank}</span>
                    <span style={{ fontSize: 20, color: red ? "#e74c3c" : "#111" }}>{suit}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              {validBids.filter(b => b !== "pass").map(b => (
                <button key={b} onClick={() => placeBid(b)} style={{
                  padding: "13px 0", borderRadius: 12, fontSize: 18, fontWeight: 700,
                  background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.32)",
                  color: "#f0e6cc", cursor: "pointer",
                }}>
                  {b}
                </button>
              ))}
            </div>
            {validBids.includes("pass") && (
              <button onClick={() => placeBid("pass")} style={{
                width: "100%", padding: "10px 0", borderRadius: 12, fontSize: 14,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(240,230,204,0.55)", cursor: "pointer",
              }}>
                Pass
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── TRUMP SELECT MODAL ── */}
      {gs.phase === "trump_select" && isMyTurn && gs.bid_winner_seat === mySeat && (
        <div className="fixed inset-0 flex items-center justify-center z-[100]"
          style={{ background: "rgba(0,0,0,0.72)" }}>
          <div style={{
            width: "min(280px, 86vw)", borderRadius: 20, padding: "24px 20px",
            background: "rgba(22,13,5,0.98)", border: "1px solid rgba(201,168,76,0.42)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.7)", fontFamily: "sans-serif",
          }}>
            <div style={{ fontFamily: "serif", fontSize: 22, color: "#c9a84c", textAlign: "center", marginBottom: 4 }}>
              Select Trump
            </div>
            <div style={{ fontSize: 12, color: "rgba(240,230,204,0.45)", textAlign: "center", marginBottom: 22 }}>
              Choose the trump suit for this round
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              {SUITS.map(s => (
                <button key={s} onClick={() => selectTrump(SUIT_NAMES[s])} style={{
                  width: 56, height: 56, borderRadius: 12, fontSize: 26,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)",
                  color: ["♥", "♦"].includes(s) ? "#e74c3c" : "#f0e6cc",
                  cursor: "pointer",
                }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ERROR ── */}
      {error && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 text-xs text-white px-4 py-2 rounded-lg max-w-[80vw] text-center"
          style={{ background: "#c0392b", boxShadow: "0 4px 16px rgba(0,0,0,0.5)" }}>
          {error}
        </div>
      )}
    </div>
  );
}
