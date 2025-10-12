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
import { ChartBarIncreasingIcon } from "lucide-react";

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
        "bg-[#0f0f10] border border-yellow-400/40 rounded-xl h-auto shadow-sm w-auto lg:w-[380px] text-white",
        "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:ring-1 hover:ring-gray-700/40",
        className
      )}
      aria-label="Leaderboard and recent trades"
    >
      <div
        className={cn(
          "flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-700"
        )}
      >
        <div className="flex items-center gap-3">
          <ChartBarIncreasingIcon color="yellow" />
          <div className="flex flex-col">
            <h2 className="text-base font-semibold text-white text-pretty brightness-75">
              {title}
            </h2>
            <p className="text-xs text-gray-400">
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
              "transition-colors text-gray-300 hover:text-gray-100 hover:bg-gray-800"
            )}
            aria-label="Clear trades"
          >
            Clear
          </Button>
        ) : null}
      </div>

      <div className="px-6">
        {rows.length === 0 ? (
          <div
            className={cn(
              "rounded-lg border border-dashed border-gray-700 p-6 text-center bg-gray-900"
            )}
            role="status"
            aria-live="polite"
          >
            <p className="text-sm text-gray-400">No trades to display.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-700  h-[340px] overflow-auto custom-scrollbar ">
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader className="bg-gray-800/50">
                  <TableRow className="hover:bg-gray-800/50">
                    <TableHead className="w-[220px] text-gray-300">
                      Trader
                    </TableHead>
                    <TableHead className="text-gray-300">Buy</TableHead>
                    <TableHead className="text-gray-300">Sell</TableHead>
                    <TableHead className="text-right text-gray-300">
                      PnL
                    </TableHead>
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
                          "group cursor-default transition-colors hover:bg-gray-800/40"
                        )}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "h-8 w-8 rounded-full bg-gray-800 flex items-center justify-center text-[11px] font-semibold text-gray-200 transition-all duration-200 group-hover:scale-105"
                              )}
                              aria-hidden
                            >
                              {initialsFromId(r.userId)}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium leading-5 text-gray-100">
                                {r.userId}
                              </span>
                              <span className="text-xs leading-4 text-gray-500">
                                Trade ID: {String(r.tradeId).slice(0, 5)}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="align-middle">
                          <span className="text-sm text-gray-200">
                            {formatNumber(r.buy)}
                          </span>
                        </TableCell>
                        <TableCell className="align-middle">
                          <span className="text-sm text-gray-200">
                            {r.sell === null ? "-" : formatNumber(r.sell)}
                          </span>
                        </TableCell>
                        <TableCell className="align-middle text-right">
                          {pnl === null ? (
                            <span className="text-sm text-gray-500">-</span>
                          ) : (
                            <Badge
                              variant="outline"
                              className={cn(
                                "border px-2 py-0.5 rounded-md text-xs font-medium transition-colors",
                                isProfit &&
                                  "text-green-400 border-green-400/40 bg-green-400/10",
                                isLoss &&
                                  "text-red-400 border-red-400/40 bg-red-400/10",
                                !isProfit &&
                                  !isLoss &&
                                  "text-gray-400 border-gray-600 bg-gray-700/20"
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
