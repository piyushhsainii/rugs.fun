"use client";
import { Label } from "@/components/ui/label";
import { useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Leaderboard from "./components/leaderboard";

interface Trade {
  id: number;
  buy: number;
  sell?: number;
  pnl?: number;
}

interface UserTrades {
  userId: string;
  trades: Trade[];
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [clientsConnected, setclientsConnected] = useState(0);
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1.0);
  const [gameState, setGameState] = useState<"WAITING" | "ACTIVE" | "CRASHED">(
    "WAITING"
  );
  const [Countdown, setCountdown] = useState(0);
  const [trades, setTrades] = useState<Trade[]>([]);
  const historyRef = useRef<number[]>([]);
  const [history, setHistory] = useState<number[]>([]);
  const [allUserTrades, setAllUserTrades] = useState<UserTrades[]>([]);
  // constants
  const CANDLE_WIDTH = 30;
  const GAP = 6;
  const LEFT_PADDING = 60;
  const MAX_VISIBLE_CANDLES = 20;
  const wallet = useWallet();
  // animation refs
  const animatedMultiplierRef = useRef<number>(1.0);
  const targetMultiplierRef = useRef<number>(1.0);
  const animatedMinRef = useRef<number>(0.2);
  const animatedMaxRef = useRef<number>(2.0);
  const userId = localStorage.getItem("userId");
  // --- WebSocket Connect ---
  const connectWS = () => {
    const ws = new WebSocket("ws://localhost:8080");
    wsRef.current = ws;
    ws.onopen = () => {
      console.log("Connected to WS");
      setGameState("ACTIVE");
      ws.send(JSON.stringify({ type: "identify", userId }));
      console.log("Sent identification", userId);
    };
    // client-count
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "client-count") {
          console.log("Connected clients:", data.count);
          setclientsConnected(data.count);
        }
        // Restoring user trades
        if (data.type === "trade-restore" && data.userId === userId) {
          console.log("trade-restored", data.trades);

          setAllUserTrades((prev) => {
            // If allUserTrades is shaped like [{ userId, trades }]
            const existing = prev.find((u) => u.userId === data.userId);

            if (existing) {
              // Replace that user's trades entirely
              return prev.map((u) =>
                u.userId === data.userId ? { ...u, trades: data.trades } : u
              );
            } else {
              // Add new user entry
              return [...prev, data];
            }
          });
        }
        if (data.type === "tick-restore") {
          historyRef.current = [...data.ticks.map((t: any) => t.value)];
          setHistory([...historyRef.current]);
        }
        // Handle tick updates
        if (data.type === "tick") {
          const state = data.state;

          targetMultiplierRef.current = Number(data.multiplier);
          historyRef.current = [
            ...historyRef.current,
            targetMultiplierRef.current,
          ].slice(-1000);
          setHistory([...historyRef.current]);

          if (state === "CRASHED") {
            setGameState("CRASHED");
          } else if (state === "WAITING") {
            setGameState("WAITING");
          } else {
            setGameState("ACTIVE");
          }
        }

        // Handle trade updates from server
        if (data.type === "trade-update") {
          const { userId, trades } = data;

          setAllUserTrades((prev) => {
            const exists = prev.find((u) => u.userId === userId);
            if (exists) {
              return prev.map((u) =>
                u.userId === userId ? { userId, trades } : u
              );
            } else {
              return [...prev, { userId, trades }];
            }
          });
        }
      } catch (e) {
        console.error("Invalid WS message", e);
      }
    };

    ws.onerror = (err) => {
      console.error("WS error:", err);
      setGameState("CRASHED");
    };

    ws.onclose = () => {
      console.log("WS closed");
      setGameState((s) => (s === "ACTIVE" ? "CRASHED" : s));
    };
  };

  const restartGame = () => {
    wsRef.current?.close();
    historyRef.current = [];
    setTrades([]);
    setCurrentMultiplier(1.0);
    animatedMultiplierRef.current = 1.0;
    targetMultiplierRef.current = 1.0;
    animatedMinRef.current = 0.2;
    animatedMaxRef.current = 2.0;
    setGameState("WAITING");
    // reconnect shortly
    setTimeout(() => connectWS(), 500);
  };

  const handleBuy = () => {
    const userId = wallet.publicKey;

    const buyPrice = parseFloat(animatedMultiplierRef.current.toFixed(4));
    wsRef.current?.send(JSON.stringify({ type: "buy", userId, buy: buyPrice }));
  };

  const handleSell = () => {
    const userId = wallet.publicKey;

    const sellPrice = parseFloat(animatedMultiplierRef.current.toFixed(4));
    wsRef.current?.send(
      JSON.stringify({ type: "sell", userId, sell: sellPrice })
    );
  };

  // helper: rounded rect (cross-browser)
  const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  };

  // Main draw function — contains candles + fluid curve + dotted label
  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Advance animated multiplier toward target (smooth)
    animatedMultiplierRef.current +=
      (targetMultiplierRef.current - animatedMultiplierRef.current) * 0.08;
    const current = animatedMultiplierRef.current;

    // background
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#1a1d29";
    ctx.fillRect(0, 0, width, height);

    const data = historyRef.current;
    if (!data.length) {
      // still draw grid when empty
      ctx.strokeStyle = "#2a2d3a";
      ctx.fillStyle = "#9ca3af";
      ctx.font = "14px Inter";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      for (let i = 0; i <= 5; i++) {
        const y = (height / 5) * i;
        ctx.beginPath();
        ctx.moveTo(LEFT_PADDING, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      return;
    }

    // Dynamic Y-axis (default 0.2 - 2.0), smooth expand/contract
    const DEFAULT_MIN = 0.2;
    const DEFAULT_MAX = 2.0;
    const rawMax = Math.max(...data, current);
    const rawMin = Math.min(...data, current);
    const padding = (rawMax - rawMin) * 0.1 || 0.1;
    const targetMin = Math.min(DEFAULT_MIN, rawMin - padding);
    const targetMax = Math.max(DEFAULT_MAX, rawMax + padding);

    animatedMinRef.current += (targetMin - animatedMinRef.current) * 0.06;
    animatedMaxRef.current += (targetMax - animatedMaxRef.current) * 0.06;

    const minMultiplier = animatedMinRef.current;
    const maxMultiplier = animatedMaxRef.current;

    const scaleY = (val: number) =>
      height -
      ((val - minMultiplier) / (maxMultiplier - minMultiplier)) * height;

    // Grid + Y labels
    ctx.strokeStyle = "#2a2d3a";
    ctx.fillStyle = "#9ca3af";
    ctx.font = "14px Inter";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= 5; i++) {
      const y = (height / 5) * i;
      const value = maxMultiplier - (i / 5) * (maxMultiplier - minMultiplier);
      ctx.beginPath();
      ctx.moveTo(LEFT_PADDING, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      ctx.fillText(value.toFixed(2) + "x", LEFT_PADDING - 10, y);
    }

    // Prepare visible candles. Determine an appropriate start value for "open" of first visible candle.
    const visibleData = data.slice(-MAX_VISIBLE_CANDLES);
    const startIndex = Math.max(0, data.length - visibleData.length);
    // previous point (the value just before the first visible data point) if available
    const prevBeforeVisible =
      startIndex - 1 >= 0 ? data[startIndex - 1] : visibleData[0];
    let lastValue = prevBeforeVisible;

    // Draw candles (rounded)
    for (let i = 0; i < visibleData.length; i++) {
      const val = visibleData[i];
      const open = lastValue;
      const close = val;
      const high = Math.max(open, close);
      const low = Math.min(open, close);

      const x = LEFT_PADDING + i * (CANDLE_WIDTH + GAP);

      const yOpen = scaleY(open);
      const yClose = scaleY(close);
      const yHigh = scaleY(high);
      const yLow = scaleY(low);

      const color = close >= open ? "#22c55e" : "#ef4444";

      // draw wick
      ctx.beginPath();
      ctx.moveTo(x + CANDLE_WIDTH / 2, yHigh);
      ctx.lineTo(x + CANDLE_WIDTH / 2, yLow);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // body (rounded)
      const bodyTop = Math.min(yOpen, yClose);
      const bodyHeight = Math.max(Math.abs(yClose - yOpen), 2);
      ctx.fillStyle = color;
      drawRoundedRect(ctx, x, bodyTop, CANDLE_WIDTH - 2, bodyHeight, 4);

      lastValue = val;
    }

    // Forming candle (animated growth from lastValue -> current)
    const formingX = LEFT_PADDING + visibleData.length * (CANDLE_WIDTH + GAP);
    const formingOpen = lastValue;
    const formingClose = current;
    const formingHigh = Math.max(formingOpen, formingClose);
    const formingLow = Math.min(formingOpen, formingClose);

    // wick
    ctx.beginPath();
    ctx.moveTo(formingX + CANDLE_WIDTH / 2, scaleY(formingHigh));
    ctx.lineTo(formingX + CANDLE_WIDTH / 2, scaleY(formingLow));
    ctx.strokeStyle = formingClose >= formingOpen ? "#22c55e" : "#ef4444";
    ctx.lineWidth = 2;
    ctx.stroke();

    // animate body growth for forming candle: interpolate between prev close and current
    const prevCloseY = scaleY(formingOpen);
    const targetCloseY = scaleY(formingClose);
    // animate a bit based on difference
    const animY = prevCloseY + (targetCloseY - prevCloseY) * 0.22;
    const bodyTopForm = Math.min(prevCloseY, animY);
    const bodyHForm = Math.max(Math.abs(animY - prevCloseY), 2);

    ctx.fillStyle = formingClose >= formingOpen ? "#22c55e" : "#ef4444";
    drawRoundedRect(ctx, formingX, bodyTopForm, CANDLE_WIDTH - 2, bodyHForm, 4);

    // --- Fluid curve over points (Bezier) ---
    // Build list of points (centers) including forming current
    const centersX: number[] = [];
    const centersY: number[] = [];
    for (let i = 0; i < visibleData.length; i++) {
      const cx = LEFT_PADDING + i * (CANDLE_WIDTH + GAP) + CANDLE_WIDTH / 2;
      centersX.push(cx);
      centersY.push(scaleY(visibleData[i]));
    }
    // add forming point
    const formingCenterX =
      LEFT_PADDING +
      visibleData.length * (CANDLE_WIDTH + GAP) +
      CANDLE_WIDTH / 2;
    centersX.push(formingCenterX);
    centersY.push(scaleY(current));

    if (centersX.length > 1) {
      ctx.beginPath();
      ctx.moveTo(centersX[0], centersY[0]);
      for (let i = 1; i < centersX.length; i++) {
        const prevX = centersX[i - 1];
        const prevY = centersY[i - 1];
        const currX = centersX[i];
        const currY = centersY[i];
        const cpX = (prevX + currX) / 2;
        // Smooth cubic-like using two control points that's symmetrical
        ctx.bezierCurveTo(cpX, prevY, cpX, currY, currX, currY);
      }
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // --- Dotted line and label (label sits to right of last candle) ---
    const yCurrent = scaleY(current);
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(LEFT_PADDING, yCurrent);
    ctx.lineTo(width, yCurrent);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.setLineDash([]);

    // label next to the active forming candle (clamped)
    const label = `${current.toFixed(3)}x`;
    ctx.font = "bold 20px Inter";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";

    // compute estX next to forming candle
    const estX = Math.min(
      LEFT_PADDING +
        visibleData.length * (CANDLE_WIDTH + GAP) +
        CANDLE_WIDTH +
        8,
      width - 12 - ctx.measureText(label).width
    );

    // background box
    const textWidth = ctx.measureText(label).width;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(estX - 8, yCurrent - 16, textWidth + 16, 32);

    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, estX, yCurrent);
  }, []);
  const animationStarted = useRef(false);

  useEffect(() => {
    if (animationStarted.current) return; // Guard: only start once
    animationStarted.current = true;

    let raf: number;

    const loop = () => {
      drawChart();
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      animationStarted.current = false; // allow restart on real unmount
    };
  }, []);
  const initialized = useRef(false);

  if (wallet && wallet.publicKey) {
    localStorage.setItem("userId", wallet.publicKey.toBase58());
  }

  useEffect(() => {
    console.log("OH");
    if (initialized.current) return;
    initialized.current = true;

    connectWS();

    return () => {
      wsRef.current?.close();
      initialized.current = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#1a1d29] flex items-start justify-center p-6">
      <div className="w-full max-w-7xl flex gap-6">
        {/* Left: Chart */}
        <div className="flex-1">
          <div className="mb-4 flex justify-between items-center">
            <h1 className="text-white text-2xl font-bold">Rug.fun (clone)</h1>
            <div className="text-white">
              Balance: <span className="text-yellow-400">98.138</span>
            </div>
          </div>
          <div className="text-white flex items-center my-1">
            {" "}
            <span className="inline-block w-2 h-2 bg-green-600 rounded-full m-1"></span>
            <Label htmlFor="">{clientsConnected} users online</Label>
          </div>
          <div className="bg-[#0f1118] rounded-lg p-4 relative">
            <canvas
              ref={canvasRef}
              width={1000}
              height={600}
              className="w-full h-auto rounded-lg"
            />
          </div>

          <div className="text-center mt-4">
            <div
              className={`text-6xl font-bold ${
                currentMultiplier >= 1 ? "text-green-500" : "text-red-500"
              }`}
            >
              {currentMultiplier.toFixed(3)}x
            </div>
            <div className="text-white mt-2">
              {gameState === "ACTIVE" && "Round in Progress..."}
              {gameState === "CRASHED" && "Crashed!"}
              {gameState === "WAITING" && "Starting soon..."}
            </div>
          </div>

          <div className="mt-4 flex gap-4 justify-center">
            <button
              onClick={restartGame}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-bold"
            >
              Restart
            </button>
            <button
              onClick={handleBuy}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold"
            >
              BUY
            </button>
            <button
              onClick={handleSell}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold"
            >
              SELL
            </button>
          </div>
        </div>

        {/* Right: Leaderboard */}
        <main className="p-6 md:p-10">
          <div className="max-w-5xl mx-auto">
            <header className="mb-6">
              <h1 className="text-2xl font-semibold text-foreground text-pretty">
                Leaderboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Recent trades across top participants
              </p>
            </header>
            <Leaderboard data={allUserTrades} />
          </div>
        </main>
      </div>
    </div>
  );
}
