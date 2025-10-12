"use client";
import { Label } from "@/components/ui/label";
import { useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Leaderboard from "./components/leaderboard";
import useGameWebSocket from "./hooks/socket";
import { Button } from "@/components/ui/button";
import SummaryPrevGames from "./components/summary-data";
import {
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { MINT_ADDRESS } from "@/constants/constants";
import { supabase } from "@/supabase/client";
import { useUserInformation } from "./hooks/userInfo";
import BetStopLossControl from "./components/control-panel";
import { Wifi } from "lucide-react";

interface Trade {
  id: number;
  buy: number;
  sell?: number;
  pnl?: number;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [internalAmount, setInternalAmount] = useState<number>(0);
  // constants
  const CANDLE_WIDTH = 30;
  const GAP = 6;
  const LEFT_PADDING = 60;
  const MAX_VISIBLE_CANDLES = 20;
  const wallet = useWallet();
  // animation refs
  const animatedMultiplierRef = useRef<number>(1.0);
  const animatedMinRef = useRef<number>(0.2);
  const animatedMaxRef = useRef<number>(2.0);

  const {
    allUserTrades,
    gameState,
    previousGames,
    timer,
    historyRef,
    setGameState,
    targetMultiplierRef,
    userId,
    clientsConnected,
    wsRef,
    latency,
  } = useGameWebSocket();

  const { balance, setBalance, error, loading, refetch } = useUserInformation();

  // store gameState in a ref that updates each render
  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);
  const timerRef = useRef(timer);
  useEffect(() => {
    timerRef.current = timer;
  }, [timer]);
  const prevGameRef = useRef(previousGames);
  useEffect(() => {
    prevGameRef.current = previousGames;
  }, [previousGames]);

  console.log(`amount`, internalAmount);

  const handleBuy = () => {
    console.log(`Coming in buy`);
    const userId = wallet.publicKey;
    // if(balance)
    const buyPrice = parseFloat(animatedMultiplierRef.current.toFixed(4));
    wsRef.current?.send(
      JSON.stringify({
        type: "buy",
        userId: userId,
        buy: buyPrice,
        buyAmount: internalAmount * LAMPORTS_PER_SOL,
      })
    );
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
    // console.log("draw");
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
    const currentGameState = gameStateRef.current;

    if (currentGameState === "CRASHED") {
      ctx.save();

      // 1️⃣ Draw red gradient overlay first
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "rgba(255, 0, 0, 0.06)");
      gradient.addColorStop(0.5, "rgba(255, 0, 0, 0.1)");
      gradient.addColorStop(1, "rgba(255, 0, 0, 0.18)");
      ctx.fillStyle = gradient;
      ctx.fillRect(LEFT_PADDING, 0, width - LEFT_PADDING, height);

      // 2️⃣ Then draw bright, glowing "RUGGED!"
      const pulse = 0.05 * Math.sin(Date.now() / 120) + 1; // subtle pulse
      ctx.globalAlpha = 1;
      ctx.font = `900 ${Math.floor(height * 0.14)}px Inter`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Outer glow shadow
      ctx.shadowColor = "rgba(255, 30, 30, 0.8)";
      ctx.shadowBlur = 25 * pulse;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Core text color — bright red
      ctx.fillStyle = "rgb(255, 30, 30)";
      ctx.fillText("RUGGED!", width / 2, height / 2);

      ctx.restore();
    }

    // If waiting (post-crash), render the big centered countdown and return early
    if (currentGameState === "WAITING") {
      // draw faint grid behind timer for context
      ctx.strokeStyle = "#2a2d3a";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const y = (height / 5) * i;
        ctx.beginPath();
        ctx.moveTo(LEFT_PADDING, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // center big countdown like multiplier
      const label = timerRef.current != null ? `${timerRef.current}s` : "";
      ctx.save();

      // subtle pulsing using time
      const pulse = 0.08 * Math.sin(Date.now() / 200) + 0.92;

      ctx.globalAlpha = 1;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // big number
      ctx.font = `bold ${Math.floor(height * 0.12)}px Inter`;
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 12;
      ctx.translate(width / 2, height / 2);
      ctx.scale(pulse, pulse);
      ctx.fillText(String(label), 0, 0);

      // subtitle below
      ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
      ctx.font = "600 18px Inter";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.textAlign = "center";
      ctx.fillText(
        "Starting soon",
        width / 2,
        height / 2 + Math.floor(height * 0.12) / 1.6
      );
      ctx.restore();

      return;
    }
    // continue drawing chart when not WAITING
    const data = historyRef.current;
    // if no data, draw grid and return (no candles)
    if (!data.length) {
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
    const denom = maxMultiplier - minMultiplier || 1e-6;

    const scaleY = (val: number) =>
      height - ((val - minMultiplier) / denom) * height;

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

    if (allUserTrades && allUserTrades.length > 0) {
      // Filter trades for current user
      const myTrades = allUserTrades.filter(
        (trade: any) => trade.userId === wallet.publicKey?.toBase58()
      );

      myTrades.forEach((trade: any) => {
        if (trade.buy && !trade.sell) {
          // Only show active positions (bought but not sold)
          const buyPrice = trade.buy;

          // Find the candle index where buy price matches or is closest to historical data
          // We need to find which candle in visibleData corresponds to this buy
          let buyIndex = -1;

          // Search through visible candles to find the one that matches the buy price
          // This assumes the buy happened on one of the visible candles
          for (let i = 0; i < visibleData.length; i++) {
            const candlePrice = visibleData[i];
            // Check if buy price is close to this candle's price (within tolerance)
            if (Math.abs(candlePrice - buyPrice) < 0.01) {
              buyIndex = i;
              break;
            }
          }

          // If exact match not found, find the candle where price was closest
          if (buyIndex === -1) {
            let minDiff = Infinity;
            for (let i = 0; i < visibleData.length; i++) {
              const diff = Math.abs(visibleData[i] - buyPrice);
              if (diff < minDiff) {
                minDiff = diff;
                buyIndex = i;
              }
            }
          }

          // Only draw if we found a valid candle index
          if (buyIndex >= 0 && buyIndex < visibleData.length) {
            const markerX =
              LEFT_PADDING + buyIndex * (CANDLE_WIDTH + GAP) + CANDLE_WIDTH / 2;
            const markerY = scaleY(buyPrice);

            // Draw a circle marker
            ctx.beginPath();
            ctx.arc(markerX, markerY, 8, 0, Math.PI * 2);
            ctx.fillStyle = "#3b82f6"; // Blue color
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw "BUY" label above the marker
            ctx.font = "bold 12px Inter";
            ctx.textAlign = "center";
            ctx.textBaseline = "bottom";
            ctx.fillStyle = "#ffffff";
            ctx.fillText("BUY", markerX, markerY - 12);

            // Optional: Draw a horizontal line from buy point
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(LEFT_PADDING, markerY);
            ctx.lineTo(width, markerY);
            ctx.strokeStyle = "rgba(59, 130, 246, 0.4)"; // Semi-transparent blue
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.setLineDash([]);

            // Optional: Show price label
            const buyLabel = `${buyPrice.toFixed(3)}x`;
            ctx.font = "bold 14px Inter";
            ctx.textAlign = "right";
            ctx.textBaseline = "middle";
            const labelWidth = ctx.measureText(buyLabel).width;
            ctx.fillStyle = "rgba(59, 130, 246, 0.9)";
            ctx.fillRect(
              LEFT_PADDING - labelWidth - 18,
              markerY - 12,
              labelWidth + 12,
              24
            );
            ctx.fillStyle = "#ffffff";
            ctx.fillText(buyLabel, LEFT_PADDING - 10, markerY);
          }
        }
      });
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
    const animY = prevCloseY + (targetCloseY - prevCloseY) * 0.22;
    const bodyTopForm = Math.min(prevCloseY, animY);
    const bodyHForm = Math.max(Math.abs(animY - prevCloseY), 2);

    ctx.fillStyle = formingClose >= formingOpen ? "#22c55e" : "#ef4444";
    drawRoundedRect(ctx, formingX, bodyTopForm, CANDLE_WIDTH - 2, bodyHForm, 4);

    // --- Fluid curve over points (Bezier) ---
    const centersX: number[] = [];
    const centersY: number[] = [];
    for (let i = 0; i < visibleData.length; i++) {
      const cx = LEFT_PADDING + i * (CANDLE_WIDTH + GAP) + CANDLE_WIDTH / 2;
      centersX.push(cx);
      centersY.push(scaleY(visibleData[i]));
    }
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

    const estX = Math.min(
      LEFT_PADDING +
        visibleData.length * (CANDLE_WIDTH + GAP) +
        CANDLE_WIDTH +
        8,
      width - 12 - ctx.measureText(label).width
    );

    const textWidth = ctx.measureText(label).width;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(estX - 8, yCurrent - 16, textWidth + 16, 32);

    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, estX, yCurrent);
  }, [gameState]);

  const animationStarted = useRef(false);

  useEffect(() => {
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

  if (wallet && wallet.publicKey) {
    localStorage.setItem("userId", wallet.publicKey.toBase58());
  } else {
    localStorage.setItem("userId", "guest");
  }

  return (
    <div className="min-h-screen bg-[#1a1d29] flex flex-col items-start  p-2 w-full">
      <div className="w-full max-w-[1500px] flex flex-col justify-end mx-auto lg:flex-row gap-2">
        {/* Left: Chart */}
        <div className="flex-1">
          <div className="mb-4 flex justify-between items-center">
            <h1 className="text-white text-2xl font-bold">
              Rug.fun (clone)
              <div>
                {latency !== null && (
                  <div className="flex items-center gap-2">
                    <div
                      className={`text-sm font-semibold flex items-center gap-1 ${
                        latency < 50
                          ? "text-green-500"
                          : latency < 100
                          ? "text-yellow-500"
                          : "text-red-500"
                      }`}
                    >
                      {latency}ms <Wifi size={15} />
                    </div>
                  </div>
                )}
              </div>
            </h1>
            <div className=" bg-yellow-400 px-3 py-1 rounded-lg text-black font-bold font-mono">
              Balance:
              <span className="text-black font-bold font-mono">
                {balance && (balance / 1000000000).toFixed(4)}
              </span>
            </div>
          </div>
          <div className="text-white flex items-center my-1 w-full">
            {" "}
            <span className="inline-block w-2 h-2 bg-green-600 rounded-full m-1"></span>
            <Label htmlFor="">{clientsConnected} users online</Label>
          </div>
          <div className="bg-[#0f1118] rounded-lg p-4 relative">
            <canvas
              ref={canvasRef}
              width={1300}
              height={600}
              className="w-full"
            />
          </div>
        </div>

        {/* Right: Leaderboard */}
        <main className="p-6 md:p-10 flex flex-col">
          <div className=" mx-auto">
            <header className="mb-6">
              <h1 className="text-2xl font-semibold text-yellow-500 text-pretty font-mono">
                Leaderboard
              </h1>
              <p className="text-sm  font-mono text-yellow-600">
                Recent trades across top participants
              </p>
            </header>
            <Leaderboard data={allUserTrades} />
          </div>
          {prevGameRef && previousGames.length > 0 && (
            <div className=" flex flex-col overflow-hidden">
              {/* @ts-ignore */}
              <SummaryPrevGames gameData={previousGames} />
            </div>
          )}
        </main>
      </div>
      <section className="flex flex-col items-start justify-start max-w-[2400px] mx-auto pr-64 gap-4">
        <BetStopLossControl
          amount={internalAmount}
          setAmount={setInternalAmount}
        />
        {/* Pay Button */}
        <div className="mt-4 flex gap-4 justify-center w-full max-w-[300px] mx-auto">
          <Button
            onClick={handleBuy}
            disabled={
              userId == "guest" ||
              gameStateRef.current == "CRASHED" ||
              gameStateRef.current == "WAITING"
                ? true
                : false || internalAmount == 0
            }
            className={`bg-green-600 hover:bg-green-700 h-10 w-full shadow-black text-white px-6 py-3 rounded-lg font-bold cursor-pointer shadow-lg`}
            style={{
              textShadow: "2px 2px 5px rgba(0,0,0,0.7)",
              boxShadow: "0 5px 15px rgba(0,0,0,0.5)",
            }}
          >
            BUY
          </Button>
          <Button
            onClick={handleSell}
            disabled={
              userId == "guest" ||
              gameStateRef.current == "CRASHED" ||
              gameStateRef.current == "WAITING"
                ? true
                : false || internalAmount == 0
            }
            className={`bg-red-600 hover:bg-red-700 h-10 w-full shadow-black text-white px-6 py-3 rounded-lg font-bold cursor-pointer shadow-lg`}
            style={{
              textShadow: "2px 2px 5px rgba(0,0,0,0.7)",
              boxShadow: "0 5px 15px rgba(0,0,0,0.5)",
            }}
          >
            SELL
          </Button>
        </div>
      </section>
    </div>
  );
}
