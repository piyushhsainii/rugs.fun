import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { fetchUsername, MaxWithdrawAmountAllowed } from "@/server/server";

export const useUserInformation = () => {
  const wallet = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isApplied, setisApplied] = useState(false);

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

  const fetchUsernameClient = async () => {
    if (!wallet.publicKey) return;
    const username = await fetchUsername(wallet.publicKey.toString());
    if (username == null) {
      console.log(`Could not fetch username`);
      return;
    }
    setUserName(username);
  };

  // automatically fetch when wallet changes
  useEffect(() => {
    fetchBalance();
    fetchUsernameClient();
  }, [fetchBalance]);

  return {
    balance,
    setBalance,
    userName,
    setUserName,
    loading,
    error,
    isApplied,
    setisApplied,
    refetch: fetchBalance, // can call this from anywhere
  };
};
