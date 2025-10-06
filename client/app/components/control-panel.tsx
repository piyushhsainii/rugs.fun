"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Slider } from "@/components/ui/slider";

type Numberish = number | string;

type BetStopLossProps = {
  // Amount input on the left
  amount?: number;
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
  onAmountChange,
  balance = 100,
  min = 0,
  step = 0.001,
  amountPresets = ["+0.001", "+0.01", "+0.1", "+1", "1/2", "x2", "MAX"],
  stopPercent,
  onStopPercentChange,
  percentPresets = [10, 25, 50, 100],
  className,
}: BetStopLossProps) {
  // Controlled/uncontrolled pattern for amount
  const [internalAmount, setInternalAmount] = React.useState<number>(
    amount ?? 0
  );
  const amt = amount ?? internalAmount;
  const setAmt = onAmountChange ?? setInternalAmount;

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
    const s = String(p).toUpperCase();
    // "x" to clear
    if (s === "X") return setAmt(0);
    if (s === "MAX") return setAmt(Math.max(min, balance));
    if (s === "1/2" || s === "½") return setAmt(Math.max(min, balance / 2));
    if (s === "X2" || s === "2X")
      return setAmt(Math.max(min, Math.min(amt * 2, balance)));

    // relative increment like "+0.001" or "+1"
    if (s.startsWith("+")) {
      const inc = Number(s.slice(1));
      if (Number.isFinite(inc))
        return setAmt(Math.max(min, Math.min(amt + inc, balance)));
    }

    // absolute number as fallback
    const n = Number(s);
    if (Number.isFinite(n)) return setAmt(Math.max(min, Math.min(n, balance)));
  };

  const applyPercentPreset = (p: number) => {
    const clamped = Math.min(100, Math.max(0, p));
    setStop(clamped);
  };

  return (
    <div
      className={cn(
        // Container follows theme tokens; subtle hover + focus ring
        "bg-card border rounded-xl p-3 md:p-4 flex flex-col gap-3 transition-all",
        "hover:shadow-sm hover:border-primary/40 hover:ring-2 hover:ring-primary/10",
        "md:flex-row md:items-stretch md:gap-4",
        className
      )}
    >
      {/* Left: Amount input with presets */}
      <div className="md:flex-1">
        <InputGroup className="h-12 md:h-14">
          {/* Amount field */}
          <InputGroupInput
            inputMode="decimal"
            type="number"
            step={step}
            min={min}
            value={amt}
            onChange={(e) => handleAmountInput(e.target.value)}
            aria-label="Bet amount"
            className={cn(
              // Larger, legible numeric style
              "font-mono text-lg md:text-2xl text-foreground px-4",
              "placeholder:text-muted-foreground rounded-r-none"
            )}
            placeholder="0.00"
          />
          {/* Quick actions on the right of input */}
          <InputGroupAddon align="inline-end" className="gap-1">
            <InputGroupButton
              size="xs"
              variant="ghost"
              onClick={() => applyPreset("X")}
              aria-label="Clear"
            >
              {"×"}
            </InputGroupButton>
            {amountPresets.map((p) => (
              <InputGroupButton
                key={String(p)}
                size="xs"
                variant="outline"
                className="transition-colors hover:bg-accent"
                onClick={() => applyPreset(p)}
              >
                {String(p)}
              </InputGroupButton>
            ))}
            <InputGroupText className="ml-1">
              <span className="text-muted-foreground">Bal</span>
              <span className="font-mono text-foreground">
                {formatAmt(balance)}
              </span>
            </InputGroupText>
          </InputGroupAddon>
        </InputGroup>
      </div>

      {/* Right: Stop-loss presets + slider */}
      <div className="md:flex-1">
        <div
          className={cn(
            "border rounded-lg px-3 py-2 md:px-3.5 md:py-2.5",
            "bg-background/40 dark:bg-background/20"
          )}
        >
          <div className="flex items-center gap-2 md:gap-2.5">
            {/* Preset chips */}
            <ButtonGroup className="shrink-0">
              {percentPresets.map((p) => {
                const active = stop === p;
                return (
                  <Button
                    key={p}
                    size="sm"
                    variant={active ? "destructive" : "outline"}
                    className={cn(
                      "h-8 px-2.5 transition-colors",
                      active ? "text-white" : ""
                    )}
                    onClick={() => applyPercentPreset(p)}
                    aria-pressed={active}
                    aria-label={`Set stop loss to ${p}%`}
                  >
                    {p}%
                  </Button>
                );
              })}
            </ButtonGroup>

            {/* Slider */}
            <div className="flex-1 flex items-center gap-3 md:gap-4">
              <Slider
                value={[stop]}
                onValueChange={(v) => setStop(Math.round(v[0]))}
                min={0}
                max={100}
                className={cn(
                  "w-full",
                  "[&_[data-slot='slider-range']]:bg-destructive",
                  // subtle hover animation for the thumb
                  "[&_[data-slot='slider-thumb']]:transition-transform [&_[data-slot='slider-thumb']]:hover:scale-105"
                )}
              />
              <div className="w-16 text-right font-mono tabular-nums text-foreground">
                {stop} <span className="text-muted-foreground">%</span>
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Auto-sell triggers when price drops by the selected percentage.
          </div>
        </div>
      </div>
    </div>
  );
}

export default BetStopLossControl;
