"use client";
import { useEffect, useRef, useState } from "react";

interface Trade {
  id: number;
  buy: number;
  sell?: number;
  pnl?: number;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1.0);
  const [gameState, setGameState] = useState<"WAITING" | "ACTIVE" | "CRASHED">(
    "WAITING"
  );
  const [trades, setTrades] = useState<Trade[]>([]);
  const historyRef = useRef<number[]>([]);

  // constants
  const CANDLE_WIDTH = 30;
  const GAP = 6;
  const LEFT_PADDING = 60;
  const MAX_VISIBLE_CANDLES = 20;

  // animation refs
  const animatedMultiplierRef = useRef<number>(1.0);
  const targetMultiplierRef = useRef<number>(1.0);
  const animatedMinRef = useRef<number>(0.2);
  const animatedMaxRef = useRef<number>(2.0);

  // WebSocket connect
  const connectWS = () => {
    const ws = new WebSocket("ws://localhost:8080");
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Connected to WS");
      setGameState("ACTIVE");
      // Keep history from previous round cleared by restart logic if desired
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const val = Number(data.multiplier);
        const state = data.state;

        // update raw state (for display or external logic)
        setCurrentMultiplier(val);

        // update target for smooth animation
        targetMultiplierRef.current = val;

        // append to history (server sends one tick at a time)
        historyRef.current = [...historyRef.current, val].slice(-1000);
        if (state === "CRASHED") {
          setGameState("CRASHED");
          // optionally close ws (server may already close)
          try {
            ws.close();
          } catch {}
        } else {
          setGameState("ACTIVE");
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

  // start WS once
  useEffect(() => {
    connectWS();
    return () => {
      wsRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // BUY: record the visible animated multiplier (what user sees)
  const handleBuy = () => {
    const visiblePrice = parseFloat(animatedMultiplierRef.current.toFixed(4));
    setTrades((prev) => [
      ...prev,
      { id: Date.now() + Math.floor(Math.random() * 1000), buy: visiblePrice },
    ]);
  };

  // SELL: only close the most recent open trade
  const handleSell = () => {
    const visiblePrice = parseFloat(animatedMultiplierRef.current.toFixed(4));
    setTrades((prev) => {
      const copy = [...prev];
      for (let i = copy.length - 1; i >= 0; i--) {
        if (copy[i].sell === undefined) {
          const pnl = ((visiblePrice - copy[i].buy) / copy[i].buy) * 100;
          copy[i] = { ...copy[i], sell: visiblePrice, pnl };
          break; // only close one trade
        }
      }
      return copy;
    });
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
  const drawChart = () => {
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
  };

  // animation loop
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      drawChart();
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <div className="w-72 bg-[#0f1118] rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white text-lg font-bold">Trade History</h2>
            <button
              onClick={() => {
                setTrades([]);
              }}
              className="text-xs text-gray-400 hover:text-white"
            >
              Clear
            </button>
          </div>

          <table className="w-full text-sm text-white">
            <thead>
              <tr className="text-gray-400">
                <th className="text-left">Buy</th>
                <th className="text-left">Sell</th>
                <th className="text-right">P/L%</th>
              </tr>
            </thead>
            <tbody>
              {trades.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center text-gray-500 py-3">
                    No trades yet
                  </td>
                </tr>
              )}
              {trades
                .slice()
                .reverse()
                .map((t) => (
                  <tr
                    key={t.id}
                    className={`border-t border-gray-700 ${
                      t.sell === undefined ? "bg-[#081018]" : ""
                    }`}
                  >
                    <td className="py-2">{t.buy.toFixed(3)}x</td>
                    <td className="py-2">
                      {t.sell ? (
                        `${t.sell.toFixed(3)}x`
                      ) : (
                        <span className="text-gray-400">OPEN</span>
                      )}
                    </td>
                    <td
                      className={`py-2 text-right ${
                        t.pnl !== undefined
                          ? t.pnl > 0
                            ? "text-green-400"
                            : t.pnl < 0
                            ? "text-red-400"
                            : "text-gray-400"
                          : "text-gray-400"
                      }`}
                    >
                      {t.pnl !== undefined ? `${t.pnl.toFixed(2)}%` : "-"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
