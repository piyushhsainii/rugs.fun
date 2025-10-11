"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
} from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { useUserInformation } from "../hooks/userInfo";
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
  // Visual
  className?: string;
};

export function BetStopLossControl({
  amount,
  setAmount,
  onAmountChange,
  min = 0,
  step = 0.001,
  amountPresets = ["+0.001", "+0.01", "+0.1", "+1", "1/2", "x2", "MAX"],
  stopPercent,
  onStopPercentChange,
  percentPresets = [10, 25, 50, 100],
  className,
}: BetStopLossProps) {
  const { balance } = useUserInformation();

  // Controlled/uncontrolled pattern for amount

  const amt = amount;
  const setAmt = onAmountChange ?? setAmount;

  // Controlled/uncontrolled pattern for stop % (0-100)
  const [internalStop, setInternalStop] = React.useState<number>(
    stopPercent ?? 100
  );
  const stop = stopPercent ?? internalStop;
  const setStop = onStopPercentChange ?? setInternalStop;

  const formatAmt = (v: number) => {
    // Keep small increments readable
    return Number.isInteger(v)
      ? v.toString()
      : v.toFixed(3).replace(/\.?0+$/, "");
  };

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
        "bg-black/80 text-white border border-yellow-500/30 rounded-2xl p-4 md:p-5 flex flex-col gap-4 transition-all",
        "shadow-[0_0_15px_rgba(255,255,0,0.2)] hover:shadow-[0_0_25px_rgba(255,255,0,0.3)] my-5",
        "md:flex-row md:items-stretch md:gap-6",
        className
      )}
    >
      {/* Left: Amount input + balance */}
      <div className="md:flex-1 ">
        <InputGroup className="h-12 md:h-14 flex flex-wrap md:flex-nowrap">
          {/* Amount field */}
          <div className="flex-1 min-w-[200px]">
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
                "bg-white/10 border border-white/20 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/50",
                "placeholder:text-white/40"
              )}
              placeholder="0.0000"
            />
          </div>

          {/* Presets */}
          <InputGroupAddon align="inline-end" className="flex gap-1.5 shrink-0">
            <InputGroupButton
              size="xs"
              variant="ghost"
              onClick={() => applyPreset("X")}
              className="text-white/80 hover:bg-yellow-500/20"
            >
              ×
            </InputGroupButton>

            {amountPresets.map((p) => (
              <InputGroupButton
                key={String(p)}
                size="xs"
                variant="outline"
                className="text-yellow-300 border-yellow-500/30 hover:bg-yellow-400/20"
                onClick={() => applyPreset(p)}
              >
                {p}
              </InputGroupButton>
            ))}

            {/* Balance pill */}
            <InputGroupText className="ml-1 flex items-center gap-1 bg-white/10 border border-yellow-500/30 rounded-md px-2 py-1">
              <span className="text-gray-300">Bal</span>
              <span className="font-mono text-yellow-300">
                {formatAmt(
                  balance ? Number((balance / LAMPORTS_PER_SOL).toFixed(4)) : 0
                )}
              </span>
            </InputGroupText>
          </InputGroupAddon>
        </InputGroup>
      </div>

      {/* Right: Stop-loss section */}
      <div className="md:flex-1">
        <div
          className={cn(
            "border border-yellow-500/30 rounded-xl px-3 py-3 md:px-4 md:py-3",
            "bg-white/5"
          )}
        >
          <div className="flex items-center gap-2 md:gap-3">
            <ButtonGroup className="shrink-0">
              {percentPresets.map((p) => {
                const active = stop === p;
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
                    {p}%
                  </Button>
                );
              })}
            </ButtonGroup>

            {/* Slider */}
            <div className="flex-1 flex items-center gap-4">
              <Slider
                value={[stop]}
                onValueChange={(v) => setStop(Math.round(v[0]))}
                min={0}
                max={100}
                className={cn(
                  "w-full cursor-pointer",
                  "[&_[data-slot='slider-track']]:bg-white/10",
                  "[&_[data-slot='slider-range']]:bg-yellow-400",
                  "[&_[data-slot='slider-thumb']]:bg-yellow-300",
                  "[&_[data-slot='slider-thumb']]:hover:scale-110"
                )}
              />
              <div className="w-16 text-right font-mono text-yellow-300">
                {stop} <span className="text-white/60">%</span>
              </div>
            </div>
          </div>

          <div className="mt-2 text-xs text-gray-400">
            Auto-sell triggers when price drops by selected percentage.
          </div>
        </div>
      </div>
    </div>
  );
}

export default BetStopLossControl;
