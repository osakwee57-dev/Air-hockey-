
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  BOARD_WIDTH, 
  BOARD_HEIGHT, 
  COLORS, 
  PUCK_RADIUS, 
  MALLET_RADIUS, 
  GOAL_WIDTH,
  MAX_TRAIL_LENGTH,
  FRICTION,
  BASE_MAX_PUCK_SPEED,
  BASE_AI_SPEED,
  SPEED_INCREMENT_PER_ROUND,
  AI_DIFFICULTY_INCREMENT,
  MAX_ROUNDS,
  POINTS_PER_ROUND
} from '../constants';
import { Puck, Mallet, Point, GameState, GameMode } from '../types';

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game State
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [gameMode, setGameMode] = useState<GameMode>('1P');
  const [round, setRound] = useState(1);
  const [scores, setScores] = useState({ p1: 0, p2: 0 }); // Rounds won
  const [points, setPoints] = useState({ p1: 0, p2: 0 }); // Total Score (Round Wins * 100)
  const [roundMessage, setRoundMessage] = useState<string | null>(null);
  
  // Physics Refs
  const puckRef = useRef<Puck>({
    x: BOARD_WIDTH / 2,
    y: BOARD_HEIGHT / 2,
    radius: PUCK_RADIUS,
    color: COLORS.PUCK,
    dx: 0,
    dy: 0
  });
  
  const player1Ref = useRef<Mallet>({ 
    x: BOARD_WIDTH / 2, y: BOARD_HEIGHT - 120, radius: MALLET_RADIUS, color: COLORS.PLAYER,
    prevX: BOARD_WIDTH / 2, prevY: BOARD_HEIGHT - 120, dx: 0, dy: 0
  });
  
  const player2Ref = useRef<Mallet>({ 
    x: BOARD_WIDTH / 2, y: 120, radius: MALLET_RADIUS, color: COLORS.AI,
    prevX: BOARD_WIDTH / 2, prevY: 120, dx: 0, dy: 0
  });
  
  const puckHistoryRef = useRef<Point[]>([]);

  // Round multiplier logic
  const speedMultiplier = 1 + (round - 1) * SPEED_INCREMENT_PER_ROUND;
  const currentMaxPuckSpeed = BASE_MAX_PUCK_SPEED * speedMultiplier;
  const currentAiSpeed = BASE_AI_SPEED * (1 + (round - 1) * AI_DIFFICULTY_INCREMENT);

  const checkGoal = useCallback(() => {
    const p = puckRef.current;
    const goalLeft = (BOARD_WIDTH - GOAL_WIDTH) / 2;
    const goalRight = (BOARD_WIDTH + GOAL_WIDTH) / 2;

    if (p.x > goalLeft && p.x < goalRight) {
      if (p.y - p.radius <= 0) return 'p1';
      if (p.y + p.radius >= BOARD_HEIGHT) return 'p2';
    }
    return null;
  }, []);

  const triggerRoundMessage = (msg: string) => {
    setRoundMessage(msg);
    setTimeout(() => setRoundMessage(null), 2000);
  };

  const resetRound = (scoredBy: 'p1' | 'p2') => {
    setGameState(GameState.GOAL);
    setScores(prev => {
      const newScores = { ...prev, [scoredBy]: prev[scoredBy] + 1 };
      setPoints({ 
        p1: newScores.p1 * POINTS_PER_ROUND, 
        p2: newScores.p2 * POINTS_PER_ROUND 
      });
      return newScores;
    });
    
    setTimeout(() => {
      if (round < MAX_ROUNDS) {
        const nextRound = round + 1;
        setRound(nextRound);
        puckRef.current.x = BOARD_WIDTH / 2;
        puckRef.current.y = BOARD_HEIGHT / 2;
        puckRef.current.dx = 0;
        puckRef.current.dy = 0;
        puckHistoryRef.current = [];
        
        // Reset mallets
        player1Ref.current.x = BOARD_WIDTH / 2;
        player1Ref.current.y = BOARD_HEIGHT - 120;
        player2Ref.current.x = BOARD_WIDTH / 2;
        player2Ref.current.y = 120;

        setGameState(GameState.PLAYING);
        triggerRoundMessage(`Round ${nextRound} - Speed Increased!`);
      } else {
        setGameState(GameState.GAMEOVER);
      }
    }, 1200);
  };

  const resolveCollision = (p: Puck, m: Mallet) => {
    const dx = p.x - m.x;
    const dy = p.y - m.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < p.radius + m.radius) {
      const angle = Math.atan2(dy, dx);
      const overlap = (p.radius + m.radius) - distance;
      
      p.x += Math.cos(angle) * overlap;
      p.y += Math.sin(angle) * overlap;

      // Transfer mallet momentum + base impact force scaled by speed multiplier
      const impactFactor = 0.5 * speedMultiplier;
      p.dx = (p.dx * 0.4) + (m.dx * impactFactor) + (Math.cos(angle) * 3 * speedMultiplier);
      p.dy = (p.dy * 0.4) + (m.dy * impactFactor) + (Math.sin(angle) * 3 * speedMultiplier);

      // Clamp speed
      const speed = Math.sqrt(p.dx * p.dx + p.dy * p.dy);
      if (speed > currentMaxPuckSpeed) {
        const ratio = currentMaxPuckSpeed / speed;
        p.dx *= ratio;
        p.dy *= ratio;
      }
    }
  };

  const drawBoard = (ctx: CanvasRenderingContext2D) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, BOARD_HEIGHT);
    gradient.addColorStop(0, COLORS.BACKGROUND_TOP);
    gradient.addColorStop(0.5, COLORS.BACKGROUND_BOTTOM);
    gradient.addColorStop(1, COLORS.BACKGROUND_TOP);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i < BOARD_WIDTH; i += 40) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, BOARD_HEIGHT); ctx.stroke();
    }
    for (let i = 0; i < BOARD_HEIGHT; i += 40) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(BOARD_WIDTH, i); ctx.stroke();
    }

    ctx.shadowBlur = 15;
    ctx.shadowColor = COLORS.LINE;
    ctx.strokeStyle = COLORS.LINE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, BOARD_HEIGHT / 2);
    ctx.lineTo(BOARD_WIDTH, BOARD_HEIGHT / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(BOARD_WIDTH / 2, BOARD_HEIGHT / 2, 70, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    const drawGoal = (y: number, color: string) => {
      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 6;
      ctx.beginPath();
      const startX = (BOARD_WIDTH - GOAL_WIDTH) / 2;
      ctx.moveTo(startX, y);
      ctx.lineTo(startX + GOAL_WIDTH, y);
      ctx.stroke();
      ctx.restore();
    };

    drawGoal(4, COLORS.AI);
    drawGoal(BOARD_HEIGHT - 4, COLORS.PLAYER);

    ctx.strokeStyle = COLORS.TABLE_BORDER;
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
  };

  const drawPuck = (ctx: CanvasRenderingContext2D, p: Puck, history: Point[]) => {
    history.forEach((pos, index) => {
      const alpha = (index + 1) / (history.length + 1) * 0.3;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, p.radius * (0.6 + alpha), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(244, 63, 94, ${alpha})`;
      ctx.fill();
    });

    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = COLORS.PUCK_GLOW;
    const pGrad = ctx.createRadialGradient(p.x - 5, p.y - 5, 0, p.x, p.y, p.radius);
    pGrad.addColorStop(0, '#ff8096');
    pGrad.addColorStop(1, COLORS.PUCK);
    ctx.fillStyle = pGrad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const drawMallet = (ctx: CanvasRenderingContext2D, m: Mallet) => {
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = m.color;
    const baseGrad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.radius);
    baseGrad.addColorStop(0, '#ffffff');
    baseGrad.addColorStop(0.2, m.color);
    baseGrad.addColorStop(1, '#000000');
    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
    ctx.fill();

    const handleRadius = m.radius * 0.5;
    const handleGrad = ctx.createRadialGradient(m.x - 3, m.y - 3, 0, m.x, m.y, handleRadius);
    handleGrad.addColorStop(0, '#ffffff');
    handleGrad.addColorStop(1, '#334155');
    ctx.shadowBlur = 5;
    ctx.fillStyle = handleGrad;
    ctx.beginPath();
    ctx.arc(m.x, m.y, handleRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const loop = () => {
      if (gameState === GameState.PLAYING) {
        const p = puckRef.current;
        
        // Track Mallet Velocities
        [player1Ref, player2Ref].forEach(ref => {
          ref.current.dx = ref.current.x - ref.current.prevX;
          ref.current.dy = ref.current.y - ref.current.prevY;
          ref.current.prevX = ref.current.x;
          ref.current.prevY = ref.current.y;
        });

        // Update History for trail
        puckHistoryRef.current.push({ x: p.x, y: p.y });
        if (puckHistoryRef.current.length > MAX_TRAIL_LENGTH) puckHistoryRef.current.shift();

        // 1. Safety Emergency Reset (Teleport check)
        // If the puck gets stuck or clips entirely out of the valid area
        if (p.x < -p.radius || p.x > BOARD_WIDTH + p.radius || p.y < -p.radius || p.y > BOARD_HEIGHT + p.radius) {
          p.x = BOARD_WIDTH / 2;
          p.y = BOARD_HEIGHT / 2;
          p.dx = 0;
          p.dy = 0;
          puckHistoryRef.current = [];
        }

        // 2. Move Puck
        p.x += p.dx;
        p.y += p.dy;
        p.dx *= FRICTION;
        p.dy *= FRICTION;

        // 3. Wall Bounces & Robust Clamping
        // Check X-axis
        if (p.x - p.radius <= 0) {
          p.dx = Math.abs(p.dx) * 0.8;
          p.x = p.radius;
        } else if (p.x + p.radius >= BOARD_WIDTH) {
          p.dx = -Math.abs(p.dx) * 0.8;
          p.x = BOARD_WIDTH - p.radius;
        }
        
        const isGoal = checkGoal();
        if (isGoal) {
          resetRound(isGoal);
        } else {
          // Check Y-axis (only if not a goal)
          if (p.y - p.radius <= 0) {
            p.dy = Math.abs(p.dy) * 0.8;
            p.y = p.radius;
          } else if (p.y + p.radius >= BOARD_HEIGHT) {
            p.dy = -Math.abs(p.dy) * 0.8;
            p.y = BOARD_HEIGHT - p.radius;
          }
        }

        // --- ENHANCED AI LOGIC ---
        if (gameMode === '1P') {
          const m = player2Ref.current;
          
          if (p.y < BOARD_HEIGHT / 2) {
            const dx = p.x - m.x;
            const dy = (p.y - 20) - m.y;
            m.x += Math.sign(dx) * Math.min(Math.abs(dx), currentAiSpeed);
            m.y += Math.sign(dy) * Math.min(Math.abs(dy), currentAiSpeed * 0.8);
          } else {
            const targetX = BOARD_WIDTH / 2;
            const targetY = 120;
            const dx = targetX - m.x;
            const dy = targetY - m.y;
            m.x += Math.sign(dx) * Math.min(Math.abs(dx), currentAiSpeed * 0.6);
            m.y += Math.sign(dy) * Math.min(Math.abs(dy), currentAiSpeed * 0.6);
          }
          
          m.x = Math.max(m.radius, Math.min(BOARD_WIDTH - m.radius, m.x));
          m.y = Math.max(m.radius, Math.min(BOARD_HEIGHT / 2 - m.radius - 10, m.y));
        }

        // 4. Resolve Collisions with mallets
        resolveCollision(p, player1Ref.current);
        resolveCollision(p, player2Ref.current);

        // 5. Final Position Safety Clamp
        // Prevents overlap resolution from pushing puck through walls
        p.x = Math.max(p.radius, Math.min(BOARD_WIDTH - p.radius, p.x));
        if (!isGoal) {
          p.y = Math.max(p.radius, Math.min(BOARD_HEIGHT - p.radius, p.y));
        }
      }

      // Draw Everything
      drawBoard(ctx);
      drawPuck(ctx, puckRef.current, puckHistoryRef.current);
      drawMallet(ctx, player1Ref.current);
      drawMallet(ctx, player2Ref.current);

      animationFrameId = window.requestAnimationFrame(loop);
    };

    loop();
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [gameState, gameMode, round, currentAiSpeed, speedMultiplier, currentMaxPuckSpeed, checkGoal]);

  const handleInteraction = (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
    if (gameState !== GameState.PLAYING) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = BOARD_WIDTH / rect.width;
    const scaleY = BOARD_HEIGHT / rect.height;

    const touches = 'touches' in e ? Array.from(e.touches) : [e];

    touches.forEach((t: any) => {
      const clientX = 'clientX' in t ? t.clientX : t.pageX;
      const clientY = 'clientY' in t ? t.clientY : t.pageY;
      
      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      if (y > BOARD_HEIGHT / 2) {
        player1Ref.current.x = Math.max(MALLET_RADIUS, Math.min(BOARD_WIDTH - MALLET_RADIUS, x));
        player1Ref.current.y = Math.max(BOARD_HEIGHT / 2 + MALLET_RADIUS, Math.min(BOARD_HEIGHT - MALLET_RADIUS, y));
      } 
      else if (gameMode === '2P' && y < BOARD_HEIGHT / 2) {
        player2Ref.current.x = Math.max(MALLET_RADIUS, Math.min(BOARD_WIDTH - MALLET_RADIUS, x));
        player2Ref.current.y = Math.max(MALLET_RADIUS, Math.min(BOARD_HEIGHT / 2 - MALLET_RADIUS, y));
      }
    });
  };

  const startNewGame = (mode: GameMode) => {
    setGameMode(mode);
    setScores({ p1: 0, p2: 0 });
    setPoints({ p1: 0, p2: 0 });
    setRound(1);
    setGameState(GameState.PLAYING);
    puckRef.current.x = BOARD_WIDTH / 2;
    puckRef.current.y = BOARD_HEIGHT / 2;
    puckRef.current.dx = 0;
    puckRef.current.dy = 0;
    puckHistoryRef.current = [];
    triggerRoundMessage("Round 1 - Start!");
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen w-full bg-[#020617] overflow-hidden">
      {/* HUD */}
      <div className="z-10 mb-4 w-full max-w-[400px] flex justify-between items-end px-4">
        <div className="flex flex-col items-start">
          <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">Player 1</div>
          <div className="text-3xl font-mono font-black text-white">{String(points.p1).padStart(3, '0')}</div>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em]">Tournament</div>
          <div className="text-xl font-black text-white italic">Round {round}</div>
          <div className="h-0.5 w-16 bg-gradient-to-r from-cyan-500 to-rose-500"></div>
          <div className="text-[8px] text-slate-500 uppercase mt-1">Speed x{speedMultiplier.toFixed(2)}</div>
        </div>

        <div className="flex flex-col items-end">
          <div className="text-[10px] text-yellow-400 font-bold uppercase tracking-widest">{gameMode === '1P' ? 'CPU' : 'Player 2'}</div>
          <div className="text-3xl font-mono font-black text-white">{String(points.p2).padStart(3, '0')}</div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative z-10">
        <div className="absolute -inset-1 bg-gradient-to-b from-cyan-500 to-rose-500 rounded-xl blur opacity-20"></div>
        <div className="relative border-2 border-slate-800 shadow-2xl rounded-lg overflow-hidden bg-black">
          <canvas
            ref={canvasRef}
            width={BOARD_WIDTH}
            height={BOARD_HEIGHT}
            onPointerMove={handleInteraction}
            onPointerDown={handleInteraction}
            className="max-h-[75vh] w-auto aspect-[1/2] block cursor-none"
            style={{ touchAction: 'none' }}
          />
          
          {/* Overlays */}
          {gameState === GameState.MENU && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
              <h2 className="text-5xl font-black text-white uppercase italic tracking-tighter mb-8 text-center leading-none">
                NEON<br/><span className="text-cyan-400">PRO ARCADE</span>
              </h2>
              <div className="flex flex-col gap-4 w-64">
                <button onClick={() => startNewGame('1P')} className="group relative py-4 bg-slate-900 border-2 border-cyan-500 text-cyan-400 font-bold tracking-widest rounded-xl hover:bg-cyan-500 hover:text-white transition-all overflow-hidden">
                  <span className="relative z-10">1P VS CPU</span>
                </button>
                <button onClick={() => startNewGame('2P')} className="group relative py-4 bg-slate-900 border-2 border-rose-500 text-rose-500 font-bold tracking-widest rounded-xl hover:bg-rose-500 hover:text-white transition-all overflow-hidden">
                  <span className="relative z-10">2P LOCAL</span>
                </button>
              </div>
            </div>
          )}

          {/* New Round / Speed Up Message */}
          {roundMessage && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/20 pointer-events-none">
              <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20 transform rotate-[-2deg] animate-bounce">
                 <h4 className="text-2xl font-black text-white uppercase tracking-tighter italic">
                    {roundMessage}
                 </h4>
              </div>
            </div>
          )}

          {gameState === GameState.GOAL && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/5 backdrop-blur-sm animate-pulse">
              <h3 className="text-6xl font-black text-white uppercase italic tracking-tighter drop-shadow-2xl">GOAL!</h3>
            </div>
          )}

          {gameState === GameState.GAMEOVER && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl">
              <div className="text-cyan-400 text-xs font-bold tracking-[0.5em] mb-2 uppercase">Championship Final</div>
              <h2 className="text-3xl font-black text-white uppercase italic mb-8 text-center">
                {points.p1 > points.p2 ? 'PLAYER 1 CHAMPION' : points.p2 > points.p1 ? (gameMode === '1P' ? 'CPU CHAMPION' : 'PLAYER 2 CHAMPION') : 'GRAND TIE!'}
              </h2>
              <div className="flex flex-col gap-3 w-64">
                <div className="flex justify-between text-slate-400 border-b border-slate-800 pb-2 mb-4">
                  <span>FINAL SCORE</span>
                  <span className="text-white font-mono">{points.p1} - {points.p2}</span>
                </div>
                <button onClick={() => setGameState(GameState.MENU)} className="py-4 bg-cyan-500 text-white font-black uppercase tracking-widest rounded-lg hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]">Play Again</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="z-10 mt-6 flex gap-4">
        <button onClick={() => setGameState(GameState.MENU)} className="text-[10px] text-slate-500 border border-slate-800 px-4 py-2 rounded-full uppercase tracking-tighter font-bold hover:text-white transition-colors">Main Menu</button>
      </div>
    </div>
  );
};

export default GameCanvas;
