import { create } from "zustand";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect } from "react";
import { fetchUsername, MaxWithdrawAmountAllowed } from "@/server/server";

interface UserInformationStore {
  balance: number | null;
  userName: string | null;
  loading: boolean;
  error: any;
  isApplied: boolean;
  setBalance: (balance: number | null) => void;
  setUserName: (userName: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: any) => void;
  setisApplied: (isApplied: boolean) => void;
  fetchBalance: (publicKey: string) => Promise<void>;
  fetchUsernameClient: (publicKey: string) => Promise<void>;
  refetch: (publicKey: string) => Promise<void>;
  reset: () => void;
}

export const useUserInformationStore = create<UserInformationStore>(
  (set, get) => ({
    balance: null,
    userName: null,
    loading: false,
    error: null,
    isApplied: false,

    setBalance: (balance: number | null) => set({ balance }),
    setUserName: (userName: string | null) => set({ userName }),
    setLoading: (loading: boolean) => set({ loading }),
    setError: (error: any) => set({ error }),
    setisApplied: (isApplied: boolean) => set({ isApplied }),

    fetchBalance: async (publicKey: string) => {
      set({ loading: true, error: null });
      try {
        const maxAmount = await MaxWithdrawAmountAllowed(publicKey);
        set({ balance: Number(maxAmount ?? 0) });
      } catch (err) {
        console.error("Error fetching balance:", err);
        set({ error: err });
      } finally {
        set({ loading: false });
      }
    },

    fetchUsernameClient: async (publicKey: string) => {
      try {
        const username = await fetchUsername(publicKey);
        if (username == null) {
          console.log(`Could not fetch username`);
          return;
        }
        set({ userName: username });
      } catch (err) {
        console.error("Error fetching username:", err);
      }
    },

    refetch: async (publicKey: string) => {
      await get().fetchBalance(publicKey);
    },

    reset: () =>
      set({
        balance: null,
        userName: null,
        loading: false,
        error: null,
        isApplied: false,
      }),
  })
);

// Hook to automatically sync with wallet
export const useUserInformation = () => {
  const wallet = useWallet();
  const store = useUserInformationStore();

  useEffect(() => {
    if (wallet.publicKey) {
      const publicKeyString = wallet.publicKey.toString();
      store.fetchBalance(publicKeyString);
      store.fetchUsernameClient(publicKeyString);
    } else {
      store.reset();
    }
  }, [wallet.publicKey]);

  return {
    balance: store.balance,
    setBalance: store.setBalance,
    userName: store.userName,
    setUserName: store.setUserName,
    loading: store.loading,
    error: store.error,
    isApplied: store.isApplied,
    setisApplied: store.setisApplied,
    refetch: () =>
      wallet.publicKey && store.refetch(wallet.publicKey.toString()),
  };
};
