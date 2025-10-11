"use client";
import React, { useEffect } from "react";

interface Tick {
  value: number;
}

interface GameData {
  crashedAt: number;
  ticks: Tick[];
}

const PreviousSummaryData = ({ gameData }: { gameData: GameData[] }) => {
  function getMaxTickValue(ticks: Tick[]): number {
    if (!Array.isArray(ticks) || ticks.length === 0)
      return Number.NEGATIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const t of ticks) {
      const v =
        typeof t?.value === "number" ? t.value : Number.NEGATIVE_INFINITY;
      if (v > max) max = v;
    }
    return max;
  }

  useEffect(() => {}, [gameData]);

  return (
    <div className="w-full max-w-[350px]">
      <div
        className="
          flex items-center gap-2
          h-[90px] px-2 py-2
          bg-black/40 backdrop-blur-sm
          border border-yellow-400/30 rounded-xl
          shadow-inner shadow-yellow-400/10
          overflow-x-auto
          custom-scrollbar
        "
      >
        {gameData.length === 0 ? (
          <div className="text-gray-400 italic px-4">No previous data</div>
        ) : (
          gameData.map((dta, i) => {
            const maxTick = getMaxTickValue(dta.ticks);
            const isGood = maxTick > dta.crashedAt;
            return (
              <div
                key={i}
                className={`
                  flex flex-col items-center justify-center
                  min-w-[60px] h-[60px]
                  text-white font-mono text-sm md:text-base
                  rounded-lg px-3 py-2
                  border transition-all duration-200 select-none
                  ${
                    isGood
                      ? "bg-yellow-400/20 border-yellow-400/40 hover:bg-yellow-400/30 shadow-md shadow-yellow-400/20"
                      : "bg-red-500/20 border-red-500/40 hover:bg-red-500/30 shadow-md shadow-red-500/20"
                  }
                `}
              >
                <span className="font-bold">{maxTick.toFixed(2)}x</span>
                <span className="text-[10px] text-gray-300">crash</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PreviousSummaryData;
