"use server";

import { createClient } from "@supabase/supabase-js";

export type FaucetRateStatus = {
  claimed: number;
  remaining: number;
  canClaim: boolean;
  resetTime: number;
};

const HOUR_MS = 1000 * 60 * 60;
const LIMIT = 10;

function getHourBucket() {
  return Math.floor(Date.now() / HOUR_MS);
}
function getResetTime() {
  return (getHourBucket() + 1) * HOUR_MS;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function getRateStatus(
  address: string
): Promise<FaucetRateStatus> {
  const hourBucket = getHourBucket();

  const { data, error } = await supabase
    .from("faucet_claims")
    .select("claimed")
    .eq("address", address)
    .eq("hour_bucket", hourBucket)
    .maybeSingle();

  // if (error && error.code !== "PGRST116") {
  //   // PGRST116 = row not found
  //   console.error(error);
  // }

  const claimed = data?.claimed || 0;
  const remaining = Math.max(0, LIMIT - claimed);

  return {
    claimed,
    remaining,
    canClaim: remaining > 0,
    resetTime: getResetTime(),
  };
}

export async function recordClaim(address: string, amount: number) {
  const hourBucket = getHourBucket();

  const { data, error } = await supabase
    .from("faucet_claims")
    .upsert(
      {
        address,
        hour_bucket: hourBucket,
        claimed: amount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "address" }
    )
    .select("claimed");

  if (error) console.error("recordClaim error", error);
  return data;
}

export async function addClaimRecord(
  address: string,
  entry: { mint: string; amount: number; ts: number; sig?: string }
) {
  // update the hourly claimed amount
  await recordClaim(address, entry.amount);

  const { error } = await supabase.from("faucet_history").insert({
    address,
    mint: entry.mint,
    amount: entry.amount,
    ts: new Date(entry.ts).toISOString(),
    sig: entry.sig || null,
  });

  if (error) console.error("addClaimRecord error", error);
}

export async function getHistory(address: string) {
  const { data, error } = await supabase
    .from("faucet_history")
    .select("*")
    .eq("address", address)
    .order("ts", { ascending: false })
    .limit(50);

  if (error) {
    console.error("getHistory error", error);
    return [];
  }

  return data || [];
}
