"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card } from "@/components/ui/card";

export function FaucetOnboarding() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (pathname?.startsWith("/faucet")) return;
  }, [pathname]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4">
      <Card className="w-full max-w-md p-5">
        <h3 className="mb-2 text-lg font-semibold text-black">
          Welcome to Our DeFi Lending Protocol!
        </h3>
        <p className="mb-3 text-sm text-gray-600">
          This is a devnet demonstration using custom tokens. To get started,
          visit our faucet to claim free tokens.
        </p>
        <div className="flex items-center justify-end gap-2">
          <button
            className="rounded border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
            onClick={() => setOpen(false)}
          >
            Skip for Now
          </button>
          <button
            className="rounded border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
            onClick={() => {
              localStorage.setItem("faucet_onboarding_dismissed", "1");
              setOpen(false);
            }}
          >
            Don’t Show Again
          </button>
          <Link
            href="/faucet"
            className="rounded bg-black px-3 py-2 text-sm text-white transition hover:scale-[1.02]"
          >
            Go to Faucet
          </Link>
        </div>
      </Card>
    </div>
  );
}
