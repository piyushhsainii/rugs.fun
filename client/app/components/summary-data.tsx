import React, { useEffect } from "react";

interface Tick {
  value: number;
}

interface gameData {
  crashedAt: number;
  ticks: Tick[];
}

const PreviousSummaryData = ({ gameData }: { gameData: gameData[] }) => {
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
    <div className="max-w-[350px]">
      <div className="flex overflow-y-auto h-[80px] text-gray-400 gap-1 items-center justify-start ">
        {gameData.map((dta) => (
          <div className="bg-gradient-to-b from-green-500 to-red-500 border border-red-500 text-white font-semibold rounded-lg px-4 py-2">
            {" "}
            {getMaxTickValue(dta.ticks)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PreviousSummaryData;
