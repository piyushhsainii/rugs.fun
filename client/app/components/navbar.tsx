"use client";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect } from "react";
import { createUser } from "../../server/server";

const Navbar = () => {
  const { publicKey, connected } = useWallet();

  useEffect(() => {
    if (connected && publicKey) {
      console.log("Wallet connected:", publicKey.toBase58());
      // ✅ Create user in your DB here
      handleUser(publicKey.toBase58());
    }
  }, [connected, publicKey]);

  const handleUser = async (walletAddress: string) => {
    try {
      const res = await createUser(walletAddress);
      return res;
    } catch (err) {
      console.error("Failed to create user:", err);
    }
  };

  return (
    <div className="w-full flex justify-evenly bg-primary">
      <div className="text-white">Rugs.fun</div>
      <WalletMultiButton />
    </div>
  );
};

export default Navbar;
