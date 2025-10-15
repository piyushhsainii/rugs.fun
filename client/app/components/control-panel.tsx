"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

type Numberish = number | string;

type BetStopLossProps = {
  // Amount input on the left
  amount?: number;
  setAmount: React.Dispatch<React.SetStateAction<number>>;
  onAmountChange?: (value: number) => void;
  balance?: number;
  min?: number;
  step?: number;
  // Quick amount presets. If not provided, uses sensible defaults.
  amountPresets?: Numberish[];
  // Stop-loss (percentage 0-100) on the right
  stopPercent?: number;
  onStopPercentChange?: (value: number) => void;
  percentPresets?: number[];
  isApplied: boolean;
  setisApplied: React.Dispatch<React.SetStateAction<boolean>>;
  // Visual
  className?: string;
  setAutoSellAmount: React.Dispatch<React.SetStateAction<number | null>>;
  autosell: number | null;
};

export function BetStopLossControl({
  amount,
  setAmount,
  onAmountChange,
  min = 0,
  step = 0.001,
  amountPresets = ["+0.001", "+0.01", "+0.1", "+1", "1/2", "x2", "MAX"],
  percentPresets = [1.5, 2, 3.5, 5],
  balance,
  setAutoSellAmount,
  autosell,
  isApplied,
  setisApplied,
  className,
}: BetStopLossProps) {
  // Controlled/uncontrolled pattern for amount

  const amt = amount;
  const setAmt = onAmountChange ?? setAmount;
  const [message, setMessage] = React.useState("");

  const setStop = setAutoSellAmount;

  const parseNumber = (val: string) => {
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
  };

  const handleAmountInput = (val: string) => {
    const next = Math.max(min, parseNumber(val));
    setAmt(next);
  };

  const applyPreset = (p: Numberish) => {
    if (!balance) return;
    const s = String(p).toUpperCase();
    // "x" to clear
    if (s === "X") return setAmt(0);
    if (s === "MAX")
      return setAmt(
        Math.max(min, Number((balance / LAMPORTS_PER_SOL).toFixed(4)))
      );
    if (s === "1/2" || s === "½")
      return setAmt(
        Math.max(min, Number((balance / LAMPORTS_PER_SOL).toFixed(4)) / 2)
      );
    if (s === "X2" || s === "2X")
      return setAmt(
        Math.max(
          min,
          Math.min(amt! * 2, Number((balance / LAMPORTS_PER_SOL).toFixed(4)))
        )
      );

    // relative increment like "+0.001" or "+1"
    if (s.startsWith("+")) {
      const inc = Number(s.slice(1));
      if (Number.isFinite(inc))
        return setAmt(
          Math.max(
            min,
            Math.min(
              amt! + inc,
              Number((balance / LAMPORTS_PER_SOL).toFixed(4))
            )
          )
        );
    }

    // absolute number as fallback
    const n = Number(s);
    if (Number.isFinite(n))
      return setAmt(
        Math.max(
          min,
          Math.min(n, Number((balance / LAMPORTS_PER_SOL).toFixed(4)))
        )
      );
  };

  const applyPercentPreset = (p: number) => {
    const clamped = Math.min(100, Math.max(0, p));
    setStop(clamped);
  };

  return (
    <div
      className={cn(
        "bg-black/80 text-white border border-yellow-300/30 rounded-2xl p-4 md:p-5 flex flex-col gap-10 transition-all",
        "shadow-[0_0_15px_rgba(255,255,0,0.2)] hover:shadow-[0_0_25px_rgba(255,255,0,0.3)] my-5 w-[85%] xl:w-[100%] mx-auto",
        "xl:flex-row md:items-stretch md:gap-10",
        className
      )}
    >
      {/* Left: Amount input + balance */}
      <div className="flex-1  px-3 py-3">
        <div className="flex flex-col w-full gap-2 focus:ring-2 focus:ring-yellow-400/50">
          <div className="h-12 md:h-14 flex flex-col gap-2 border border-yellow-300/30">
            {/* Amount field */}
            <div className="flex-1 flex gap-2 items-center w-full">
              <input
                inputMode="decimal"
                type="number"
                step="0.0001"
                min="0"
                value={amt}
                onChange={(e) => handleAmountInput(e.target.value)}
                aria-label="Bet amount"
                className={cn(
                  "w-full font-mono text-lg md:text-2xl text-yellow-300 px-3 py-2 text-right rounded-md outline-none",
                  "bg-white/10  focus:border-yellow-400 ",
                  "placeholder:text-white/40"
                )}
                placeholder="0.0000"
              />
              <div
                onClick={() => applyPreset("X")}
                className="text-white/80 hover:bg-yellow-500/20"
              >
                ×
              </div>
            </div>

            {/* Presets */}
            <div
              // align="inline-end"
              className="flex gap-1.5 shrink-0 w-full items-center"
            >
              {amountPresets.map((p) => (
                <div
                  key={String(p)}
                  // size="xs"
                  // variant="outline"
                  className="text-yellow-300 border-yellow-500/30 hover:bg-yellow-400/20 px-2 rounded-full cursor-pointer"
                  onClick={() => applyPreset(p)}
                >
                  {p}
                </div>
              ))}

              {/* Balance pill */}
              <div className="ml-1 flex items-center gap-1 bg-white/10 border border-yellow-500/30 rounded-md px-2 py-1">
                <span className="text-gray-300">Bal</span>
                <span className="font-mono text-yellow-300">
                  {balance
                    ? Number((balance / LAMPORTS_PER_SOL).toFixed(4))
                    : 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Stop-loss section */}
      <div className="">
        <div
          className={cn(
            "border border-yellow-500/30 rounded-xl px-3 py-3 md:px-4 md:py-3",
            "bg-white/5"
          )}
        >
          <div className="flex items-center gap-2 md:gap-3">
            <ButtonGroup className="shrink-0">
              {percentPresets.map((p) => {
                const active = autosell === p;
                return (
                  <Button
                    key={p}
                    size="sm"
                    variant={active ? "destructive" : "outline"}
                    className={cn(
                      "h-8 px-2.5 transition-all font-mono",
                      active
                        ? "bg-yellow-500 text-black font-bold shadow-[0_0_10px_rgba(255,255,0,0.6)]"
                        : "text-yellow-300 border-yellow-500/30 hover:bg-yellow-400/20"
                    )}
                    onClick={() => applyPercentPreset(p)}
                    aria-pressed={active}
                  >
                    {p}x
                  </Button>
                );
              })}
            </ButtonGroup>

            {/* Auto Sell */}
            <div className="flex-1">
              <input
                inputMode="decimal"
                type="number"
                step="0.5"
                min="0"
                value={autosell ?? ""}
                onChange={(e) => setAutoSellAmount(Number(e.target.value))}
                aria-label="Bet amount"
                placeholder="0"
                className={cn(
                  "w-full font-mono text-lg md:text-2xl text-yellow-300 px-3 py-2 text-right rounded-md outline-none",
                  "bg-white/10 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/50",
                  "placeholder:text-white/40"
                )}
              />
            </div>
          </div>

          <div className="w-full flex justify-between items-center">
            <div className="mt-2 text-xs text-gray-400">
              Auto-sell triggers when price matches by selected multiplier.
            </div>
            <div>
              <button
                onClick={() => {
                  if (autosell && autosell > 0 && !isApplied) {
                    setMessage("Auto-sell activated ✅");
                    setisApplied(true);
                    // setTimeout(() => setMessage(""), 2500);
                  } else if (isApplied) {
                    setisApplied(false);
                    setAutoSellAmount(null);
                    setMessage("");
                  } else {
                    setMessage("Please enter a valid amount ⚠️");
                    setisApplied(false);
                    // setTimeout(() => setMessage(""), 2500);
                  }
                }}
                className="bg-yellow-400 text-sm rounded-lg px-3 py-1 my-1 text-black font-bold cursor-pointer hover:bg-yellow-300 transition"
              >
                {!isApplied ? "Apply" : "Turn Off"}
              </button>
            </div>
          </div>

          {/* UX Message */}
          {message && (
            <div className="mt-2 text-sm font-medium text-yellow-400 animate-fade-in">
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BetStopLossControl;
