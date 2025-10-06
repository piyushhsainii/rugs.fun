"use client";
import { useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Tick = {
  value: number;
  // other fields are allowed but ignored here
  [key: string]: any;
};

type Game = {
  crashedAt: number;
  ticks: Tick[];
};

export type PrevGamesCarouselProps = {
  games: Game[];
  className?: string;
  // Optional: number of items to show (defaults to 10)
  limit?: number;
};

function formatMultiplier(num: number): string {
  if (!isFinite(num)) return "—";
  // Choose precision by magnitude for better readability
  if (Math.abs(num) >= 10) return `${num.toFixed(1)}x`;
  if (Math.abs(num) >= 1) return `${num.toFixed(2)}x`;
  if (Math.abs(num) >= 0.01) return `${num.toFixed(4)}x`;
  // very small values
  return `${num.toExponential(2)}x`;
}

function getMaxTickValue(ticks: Tick[]): number {
  if (!Array.isArray(ticks) || ticks.length === 0)
    return Number.NEGATIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const t of ticks) {
    const v = typeof t?.value === "number" ? t.value : Number.NEGATIVE_INFINITY;
    if (v > max) max = v;
  }
  return max;
}

export default function SummaryPrevGames({
  games,
  className,
  limit = 10,
}: PrevGamesCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const items = useMemo(() => {
    if (!Array.isArray(games)) return [];
    // Keep input order, cap at limit
    return games.slice(0, Math.min(limit, 10));
  }, [games, limit]);

  const scrollByAmount = (dir: "left" | "right") => {
    const el = containerRef.current;
    if (!el) return;
    const amount = Math.max(160, Math.floor(el.clientWidth * 0.7)); // scroll by ~70% viewport or min card width
    el.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  if (!items.length) {
    return (
      <div
        className={cn(
          "w-full rounded-md border bg-card text-card-foreground p-3 text-sm",
          className
        )}
      >
        No previous games to display.
      </div>
    );
  }

  return (
    <div className={cn("relative w-full", className)}>
      <div className="mb-2 flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => scrollByAmount("left")}
          aria-label="Scroll previous games left"
        >
          {"‹"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => scrollByAmount("right")}
          aria-label="Scroll previous games right"
        >
          {"›"}
        </Button>
      </div>

      <div
        ref={containerRef}
        className="flex gap-3 overflow-x-auto pb-2"
        role="list"
        aria-label="Previous games"
      >
        {items.map((game) => {
          const maxValue = getMaxTickValue(game.ticks);
          const hasTicks = isFinite(maxValue);
          return (
            <Card
              role="listitem"
              className="min-w-[140px] max-w-[160px] flex-shrink-0"
            >
              <CardContent className="p-3">
                <div className="flex flex-col gap-1">
                  <div className="text-xs text-muted-foreground">Max</div>
                  <div className="text-lg font-medium text-primary leading-none">
                    {hasTicks ? formatMultiplier(maxValue) : "—"}
                  </div>

                  <div className="mt-2 text-xs text-muted-foreground">
                    Rugged at
                  </div>
                  <div className="text-sm leading-none">
                    {formatMultiplier(Number(game.crashedAt))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
