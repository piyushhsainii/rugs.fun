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

  // Connect WS
  const connectWebSocket = () => {
    const ws = new WebSocket("ws://localhost:8080");
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Connected to WebSocket server");
      setGameState("ACTIVE");
      setHistory([]);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setCurrentMultiplier(data.multiplier);
      setGameState("ACTIVE");

      setHistory((prev) => {
        const newHistory = [...prev, data.multiplier].slice(-200);
        drawChart(newHistory);
        return newHistory;
      });
    };

    ws.onclose = () => {
      console.log("WebSocket closed");
      setGameState("CRASHED");
    };
  };

  // Restart game handler
  const restartGame = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setGameState("WAITING");
    setHistory([]);
    setCurrentMultiplier(1.0);

    // reconnect after short delay
    setTimeout(() => {
      connectWebSocket();
    }, 500);
  };

  // Initial connect
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // Draw candlestick chart
  const drawChart = (data: number[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = "#1a1d29";
    ctx.fillRect(0, 0, width, height);

    // Determine scale
    const maxMultiplier = Math.max(...data, 2);
    const minMultiplier = Math.min(...data, 0);
    const paddingLeft = 60;
    const chartWidth = width - paddingLeft;

    // Y axis
    ctx.strokeStyle = "#2a2d3a";
    ctx.fillStyle = "#9ca3af";
    ctx.font = "14px Inter";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = (height / gridLines) * i;
      const value =
        maxMultiplier - (i / gridLines) * (maxMultiplier - minMultiplier);

      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      ctx.fillText(value.toFixed(2) + "x", paddingLeft - 10, y);
    }

    if (data.length < 2) return;

    // Candlestick params
    const candleWidth = chartWidth / Math.min(data.length, 50); // max 50 candles visible
    const chunkSize = 3; // 3 multipliers = 1 candle

    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      if (chunk.length < 2) continue;

      const open = chunk[0];
      const close = chunk[chunk.length - 1];
      const high = Math.max(...chunk);
      const low = Math.min(...chunk);

      const x = paddingLeft + (i / chunkSize) * candleWidth;

      const scaleY = (val: number) =>
        height -
        ((val - minMultiplier) / (maxMultiplier - minMultiplier)) * height;

      const yOpen = scaleY(open);
      const yClose = scaleY(close);
      const yHigh = scaleY(high);
      const yLow = scaleY(low);

      const candleColor = close >= open ? "#22c55e" : "#ef4444";

      // Wick
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, yHigh);
      ctx.lineTo(x + candleWidth / 2, yLow);
      ctx.strokeStyle = candleColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Body
      ctx.fillStyle = candleColor;
      ctx.fillRect(
        x,
        Math.min(yOpen, yClose),
        candleWidth - 2,
        Math.abs(yClose - yOpen) || 2 // avoid zero-height body
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1d29] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="mb-4 flex justify-between items-center">
          <h1 className="text-white text-2xl font-bold">Rug.fun</h1>
          <div className="text-white">
            Balance: <span className="text-yellow-400">98.138</span>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-[#0f1118] rounded-lg p-4 relative">
          <canvas
            ref={canvasRef}
            width={1200}
            height={600}
            className="w-full h-auto rounded-lg border"
          />

          {/* Overlay */}
          <div className="absolute top-4 left-4 pointer-events-none">
            <div
              className={`text-4xl font-bold ${
                currentMultiplier >= 1 ? "text-green-500" : "text-red-500"
              }`}
            >
              {currentMultiplier.toFixed(3)}x
            </div>
            <div className="text-white text-sm mt-1">
              {gameState === "ACTIVE" && "Round in Progress..."}
              {gameState === "CRASHED" && "Crashed!"}
              {gameState === "WAITING" && "Starting soon..."}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-4 flex gap-4 justify-center">
          <button className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg font-bold text-xl">
            BUY
          </button>
          <button className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-lg font-bold text-xl">
            SELL
          </button>
          <button
            onClick={restartGame}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-bold text-xl"
          >
            RESTART GAME
          </button>
        </div>
      </div>
    </div>
  );
}
