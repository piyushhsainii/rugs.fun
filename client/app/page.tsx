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
  const animatedMinRef = useRef<number>(1.0);
  const animatedMaxRef = useRef<number>(1.0);

  const targetMultiplierRef = useRef<number>(1.0);
  const historyRef = useRef<number[]>([]);

  const connectWS = () => {
    const ws = new WebSocket("ws://localhost:8080");
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Connected to WS");
      setGameState("ACTIVE");
      setHistory([]); // reset history for new round
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const val = data.multiplier;
      const state = data.state;

      // Update target multiplier for smooth animation
      targetMultiplierRef.current = val;

      setHistory((prev) => {
        const newHist = [...prev, val].slice(-500);
        historyRef.current = newHist;
        return newHist;
      });

      if (state === "CRASHED") {
        setGameState("CRASHED");
        ws.close(); // gracefully end the round
      } else {
        setGameState("ACTIVE");
      }
    };

    ws.onclose = () => {
      console.log("WS closed");
    };

    ws.onerror = (err) => console.error("WS error:", err);
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

    // --- Dynamic Y-axis with smooth scaling ---
    const DEFAULT_MIN = 0.2;
    const DEFAULT_MAX = 2.0;

    const rawMax = Math.max(...data, current);
    const rawMin = Math.min(...data, current);
    const padding = (rawMax - rawMin) * 0.1 || 0.1;

    const targetMin = Math.min(DEFAULT_MIN, rawMin - padding);
    const targetMax = Math.max(DEFAULT_MAX, rawMax + padding);

    animatedMinRef.current += (targetMin - animatedMinRef.current) * 0.05;
    animatedMaxRef.current += (targetMax - animatedMaxRef.current) * 0.05;

    const minMultiplier = animatedMinRef.current;
    const maxMultiplier = animatedMaxRef.current;

    const scaleY = (val: number) =>
      height -
      ((val - minMultiplier) / (maxMultiplier - minMultiplier)) * height;

    // --- Grid + Y labels ---
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

    // --- Draw candles ---
    const visibleData = data.slice(-MAX_VISIBLE_CANDLES);
    let lastValue = visibleData[0];

    const drawCandle = (
      x: number,
      open: number,
      close: number,
      high: number,
      low: number,
      color: string,
      isForming: boolean = false
    ) => {
      const yOpen = scaleY(open);
      const yClose = scaleY(close);
      const yHigh = scaleY(high);
      const yLow = scaleY(low);

      // Wick
      ctx.beginPath();
      ctx.moveTo(x + CANDLE_WIDTH / 2, yHigh);
      ctx.lineTo(x + CANDLE_WIDTH / 2, yLow);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Body
      let bodyTop = Math.min(yOpen, yClose);
      let bodyHeight = Math.max(Math.abs(yClose - yOpen), 2);

      // Animate forming candle
      if (isForming) {
        const prevClose = lastValue || open;
        const targetHeight = Math.max(Math.abs(scaleY(prevClose) - yClose), 2);
        const targetTop = Math.min(scaleY(prevClose), yClose);
        bodyTop += (targetTop - bodyTop) * 0.2;
        bodyHeight += (targetHeight - bodyHeight) * 0.2;
      }

      const radius = 4; // rounded edges
      ctx.fillStyle = color;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(x, bodyTop, CANDLE_WIDTH - 2, bodyHeight, radius);
        ctx.fill();
      } else {
        ctx.fillRect(x, bodyTop, CANDLE_WIDTH - 2, bodyHeight);
      }
    };

    visibleData.forEach((val, idx) => {
      const open = lastValue;
      const close = val;
      const high = Math.max(open, close);
      const low = Math.min(open, close);
      const x = LEFT_PADDING + idx * CANDLE_WIDTH;
      const color = close >= open ? "#22c55e" : "#ef4444";

      drawCandle(x, open, close, high, low, color);

      lastValue = val;
    });

    // --- Forming candle ---
    drawCandle(
      LEFT_PADDING + visibleData.length * CANDLE_WIDTH,
      lastValue,
      current,
      Math.max(lastValue, current),
      Math.min(lastValue, current),
      current >= lastValue ? "#22c55e" : "#ef4444",
      true
    );

    // --- Dotted line ---
    const yCurrent = scaleY(current);
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(LEFT_PADDING, yCurrent);
    ctx.lineTo(width, yCurrent);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    // --- Multiplier label ---
    const label = `${current.toFixed(3)}x`;
    ctx.font = "bold 25px Inter";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";

    const gap = 4;
    const visibleCount = Math.max(0, visibleData.length);

    let estX = LEFT_PADDING + visibleCount * (CANDLE_WIDTH + gap) + 8;
    const textWidth = ctx.measureText(label).width;
    const rightMargin = 12;
    if (estX + textWidth + rightMargin > width) {
      estX = width - textWidth - rightMargin;
      if (estX < LEFT_PADDING + 8) estX = LEFT_PADDING + 8;
    }

    const boxPadX = 8;
    const boxPadY = 6;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(
      estX - boxPadX,
      yCurrent - 12 - boxPadY / 2,
      textWidth + boxPadX * 2,
      24 + boxPadY
    );

    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, estX, yCurrent);
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
            className="w-full h-auto rounded-lg "
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
