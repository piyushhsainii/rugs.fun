"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function FaucetFab() {
  const pathname = usePathname();
  if (pathname?.startsWith("/faucet")) return null;
  return (
    <Link
      href="/faucet"
      title="Need more tokens? Visit Faucet"
      className="fixed bottom-5 right-5 z-40 grid h-12 w-12 place-items-center rounded-full bg-blue-600 text-white shadow-lg transition hover:scale-105"
      aria-label="Open Faucet"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 3c3 4 6 7.5 6 10.5A6 6 0 1 1 6 13.5C6 10.5 9 7 12 3z" />
      </svg>
      <span className="absolute -right-1 -top-1 inline-flex h-3 w-3 animate-pulse rounded-full bg-white/80"></span>
    </Link>
  );
}
