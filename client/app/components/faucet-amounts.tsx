"use client";

const PRESETS = [
  { amount: 1, label: "Starter Pack" },
  { amount: 2, label: "Getting Serious" },
  { amount: 4, label: "Power User" },
  { amount: 5, label: "Maximum Boost" },
] as const;

export function FaucetAmounts({
  onPick,
  remaining,
  disabled,
}: {
  onPick: (amount: number) => void;
  remaining: number;
  disabled: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 bg-black text-white">
      {PRESETS.map((p) => {
        const blocked = disabled || p.amount > remaining;
        return (
          <button
            key={p.amount}
            onClick={() => onPick(p.amount)}
            disabled={blocked}
            className={`group rounded  px-4 py-3 text-left transition ${
              blocked
                ? "cursor-not-allowed border-gray-200 text-gray-400"
                : "border-gray-200 hover:scale-[1.02]"
            }`}
            aria-disabled={blocked}
          >
            <div className={`text-xl font-semibold text-gray-400`}>
              {p.amount}
            </div>
            <div className={`text-xs text-gray-400`}>{p.label}</div>
          </button>
        );
      })}
    </div>
  );
}
