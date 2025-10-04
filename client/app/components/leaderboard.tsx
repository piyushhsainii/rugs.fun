"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type Trade = {
  id: string | number;
  buy: number;
  sell?: number | null;
  pnl?: number | null;
};

type UserTrades = {
  userId: string;
  trades: Trade[];
};

export type LeaderboardProps = {
  data?: UserTrades[];
  title?: string;
  onClear?: () => void;
  className?: string;
};

function initialsFromId(id: string) {
  const clean = id.trim();
  const parts = clean.split(/[.\-_@ ]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

function formatNumber(n?: number | null, digits = 2) {
  if (n === null || n === undefined || Number.isNaN(n)) return "-";
  return n.toFixed(digits);
}

export function Leaderboard({
  data,
  title = "Leaderboard / Trades",
  onClear,
  className,
}: LeaderboardProps) {
  // Flatten trades for a clean, scannable table
  const rows = React.useMemo(
    () =>
      (data ?? []).flatMap((u) =>
        (u?.trades ?? []).map((t) => ({
          key: `${u.userId}-${t.id}`,
          userId: u.userId.slice(0, 9),
          tradeId: t.id,
          buy: t.buy,
          sell: t.sell ?? null,
          pnl: t.pnl ?? null,
        }))
      ),
    [data]
  );

  return (
    <Card
      className={cn(
        "bg-card border border-border/60 rounded-xl shadow-sm max-w-[370px]",
        // Subtle interactive feel
        "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:ring-1 hover:ring-primary/30",
        className
      )}
      aria-label="Leaderboard and recent trades"
    >
      <div
        className={cn(
          "flex items-center justify-between",
          "px-5 pt-5 pb-4 border-b border-border/60"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-8 w-8 rounded-md",
              "bg-primary/15",
              "flex items-center justify-center",
              "text-primary text-sm font-medium"
            )}
            aria-hidden
          >
            {/* Decorative mark to add a vibrant, branded touch */}
            {"LB"}
          </div>
          <div className="flex flex-col">
            <h2 className="text-base font-semibold text-foreground text-pretty">
              {title}
            </h2>
            <p className="text-xs text-muted-foreground">
              {rows.length > 0 ? `${rows.length} trades` : "No trades yet"}
            </p>
          </div>
        </div>

        {onClear ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            className={cn(
              "text-muted-foreground hover:text-foreground",
              "transition-colors"
            )}
            aria-label="Clear trades"
          >
            Clear
          </Button>
        ) : null}
      </div>

      <div className="px-6 py-5">
        {rows.length === 0 ? (
          <div
            className={cn(
              "rounded-lg border border-dashed border-border/60",
              "p-6 text-center",
              "bg-muted/20"
            )}
            role="status"
            aria-live="polite"
          >
            <p className="text-sm text-muted-foreground">
              No trades to display.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border/60">
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader className="bg-muted/40">
                  <TableRow className="hover:bg-muted/40">
                    <TableHead className="w-[220px]">Trader</TableHead>
                    <TableHead>Buy</TableHead>
                    <TableHead>Sell</TableHead>
                    <TableHead className="text-right">PnL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const pnl = r.pnl;
                    const isProfit = typeof pnl === "number" && pnl > 0;
                    const isLoss = typeof pnl === "number" && pnl < 0;

                    return (
                      <TableRow
                        key={r.key}
                        className={cn(
                          "group cursor-default", // subtle hover
                          "transition-colors",
                          "hover:bg-muted/40"
                        )}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "h-8 w-8 rounded-full",
                                "bg-primary/15 text-primary",
                                "flex items-center justify-center",
                                "text-[11px] font-semibold",
                                "transition-all duration-200",
                                // subtle pop on hover for richer feel
                                "group-hover:scale-105"
                              )}
                              aria-hidden
                            >
                              {initialsFromId(r.userId)}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-foreground leading-5">
                                {r.userId}
                              </span>
                              <span className="text-xs text-muted-foreground leading-4">
                                Trade ID: {String(r.tradeId).slice(0, 5)}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="align-middle">
                          <span className="text-sm text-foreground">
                            {formatNumber(r.buy)}
                          </span>
                        </TableCell>
                        <TableCell className="align-middle">
                          <span className="text-sm text-foreground">
                            {r.sell === null ? "-" : formatNumber(r.sell)}
                          </span>
                        </TableCell>
                        <TableCell className="align-middle text-right">
                          {pnl === null ? (
                            <span className="text-sm text-muted-foreground">
                              -
                            </span>
                          ) : (
                            <Badge
                              variant="outline"
                              className={cn(
                                "border-border/60",
                                "text-xs font-medium",
                                "transition-colors",
                                isProfit && "text-primary",
                                isLoss && "text-destructive",
                                !isProfit && !isLoss && "text-foreground"
                              )}
                              aria-label={`PnL ${formatNumber(pnl)} percent`}
                            >
                              {formatNumber(pnl)}%
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export default Leaderboard;
