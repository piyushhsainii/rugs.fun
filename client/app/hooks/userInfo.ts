import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { MaxWithdrawAmountAllowed } from "@/server/server";

export const useUserInformation = () => {
  const wallet = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  // function to fetch balance
  const fetchBalance = useCallback(async () => {
    if (!wallet.publicKey) return;
    setLoading(true);
    setError(null);
    try {
      const maxAmount = await MaxWithdrawAmountAllowed(
        wallet.publicKey.toString()
      );

      setBalance(Number(maxAmount ?? 0));
    } catch (err) {
      console.error("Error fetching balance:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [wallet.publicKey]);

  // automatically fetch when wallet changes
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    balance,
    setBalance,
    loading,
    error,
    refetch: fetchBalance, // can call this from anywhere
  };
};
