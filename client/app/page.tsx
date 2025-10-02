"use client";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1.0);
  const [gameState, setGameState] = useState<"WAITING" | "ACTIVE" | "CRASHED">(
    "WAITING"
  );
  const [history, setHistory] = useState<number[]>([]);

  const CANDLE_WIDTH = 30;
  const LEFT_PADDING = 60;
  const MAX_VISIBLE_CANDLES = 20;

  const animatedMultiplierRef = useRef<number>(1.0);
  const targetMultiplierRef = useRef<number>(1.0);
  const historyRef = useRef<number[]>([]);

  const connectWS = () => {
    const ws = new WebSocket("ws://localhost:8080");
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Connected to WS");
      setGameState("ACTIVE");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const val = data.multiplier;

      targetMultiplierRef.current = val;
      setCurrentMultiplier(val);

      setHistory((prev) => {
        const newHist = [...prev, val].slice(-500);
        historyRef.current = newHist;
        return newHist;
      });
    };

    ws.onclose = () => setGameState("CRASHED");
    ws.onerror = (err) => console.error(err);
  };

  useEffect(() => {
    connectWS();
    return () => wsRef.current?.close();
  }, []);

  const restartGame = () => {
    wsRef.current?.close();
    setHistory([]);
    historyRef.current = [];
    setCurrentMultiplier(1.0);
    animatedMultiplierRef.current = 1.0;
    targetMultiplierRef.current = 1.0;
    setGameState("WAITING");
    setTimeout(connectWS, 500);
  };

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Smooth animation of current multiplier
    animatedMultiplierRef.current +=
      (targetMultiplierRef.current - animatedMultiplierRef.current) * 0.08;
    const current = animatedMultiplierRef.current;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#1a1d29";
    ctx.fillRect(0, 0, width, height);

    const data = historyRef.current;
    if (!data.length) return;

    // Dynamic Y-axis
    const rawMax = Math.max(...data, current);
    const rawMin = Math.min(...data, current);
    const padding = (rawMax - rawMin) * 0.1 || 0.1;
    const maxMultiplier = rawMax + padding;
    const minMultiplier = rawMin - padding;

    const chartWidth = width - LEFT_PADDING;
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

    // Draw candles based on delta
    const visibleData = data.slice(-MAX_VISIBLE_CANDLES);
    let lastValue = visibleData[0]; // starting point for first candle

    visibleData.forEach((val, idx) => {
      const open = lastValue;
      const close = val;
      const high = Math.max(open, close);
      const low = Math.min(open, close);
      const x = LEFT_PADDING + idx * CANDLE_WIDTH;

      const yOpen = scaleY(open);
      const yClose = scaleY(close);
      const yHigh = scaleY(high);
      const yLow = scaleY(low);
      const color = close >= open ? "#22c55e" : "#ef4444";

      // Wick
      ctx.beginPath();
      ctx.moveTo(x + CANDLE_WIDTH / 2, yHigh);
      ctx.lineTo(x + CANDLE_WIDTH / 2, yLow);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Body
      ctx.fillStyle = color;
      ctx.fillRect(
        x,
        Math.min(yOpen, yClose),
        CANDLE_WIDTH - 2,
        Math.max(Math.abs(yClose - yOpen), 2)
      );

      lastValue = val;
    });

    // Forming candle (smooth from last point)
    const formingOpen = lastValue;
    const formingClose = current;
    const formingHigh = Math.max(formingOpen, formingClose);
    const formingLow = Math.min(formingOpen, formingClose);
    const x = LEFT_PADDING + visibleData.length * CANDLE_WIDTH; // next candle

    const yOpen = scaleY(formingOpen);
    const yClose = scaleY(formingClose);
    const yHigh = scaleY(formingHigh);
    const yLow = scaleY(formingLow);
    const color = formingClose >= formingOpen ? "#22c55e" : "#ef4444";

    ctx.beginPath();
    ctx.moveTo(x + CANDLE_WIDTH / 2, yHigh);
    ctx.lineTo(x + CANDLE_WIDTH / 2, yLow);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.fillRect(
      x,
      Math.min(yOpen, yClose),
      CANDLE_WIDTH - 2,
      Math.max(Math.abs(yClose - yOpen), 2)
    );

    // Dotted line for current multiplier
    const yCurrent = scaleY(current);
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(LEFT_PADDING, yCurrent);
    ctx.lineTo(width, yCurrent);
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 14px Inter";
    ctx.textAlign = "left";
    ctx.fillText(`${current.toFixed(3)}x`, LEFT_PADDING + 6, yCurrent - 8);
  };

  useEffect(() => {
    let animId: number;
    const loop = () => {
      drawChart();
      animId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="min-h-screen bg-[#1a1d29] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <div className="mb-4 flex justify-between items-center">
          <h1 className="text-white text-2xl font-bold">Rug.fun</h1>
          <div className="text-white">
            Balance: <span className="text-yellow-400">98.138</span>
          </div>
        </div>

        <div className="bg-[#0f1118] rounded-lg p-4 relative">
          <canvas
            ref={canvasRef}
            width={1200}
            height={600}
            className="w-full h-auto rounded-lg border"
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
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-8 py-4 rounded-lg font-bold text-xl"
          >
            Restart Game
          </button>
          <button className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg font-bold text-xl">
            BUY
          </button>
          <button className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-lg font-bold text-xl">
            SELL
          </button>
        </div>
      </div>
    </div>
  );
}
