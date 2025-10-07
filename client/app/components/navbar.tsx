"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { createUser } from "../../server/server";
import Link from "next/link";
import { Menu } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const Navbar = () => {
  const { publicKey, connected, disconnect, connect, select } = useWallet();
  const [tokenamount, setTokenAmount] = useState("0");

  useEffect(() => {
    if (connected && publicKey) {
      console.log("Wallet connected:", publicKey.toBase58());
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

  const depositFunds = async () => {
    try {
    } catch (error) {}
  };

  return (
    <div className="w-full flex justify-evenly items-center text-white">
      {/* Logo */}
      <Link href={"/"}>
        <div
          className="font-extrabold text-4xl cursor-pointer"
          style={{
            textShadow: `
              3px 3px 0 #000000,
              -3px -3px 0 #000000,
              3px -3px 0 #000000,
              -3px 3px 0 #000000,

              2px 2px 0 #FFD700,
              -2px -2px 0 #FFD700,
              2px -2px 0 #FFD700,
              -2px 2px 0 #FFD700,

              0 0 5px rgba(255, 255, 255, 0.7)
            `,
          }}
        >
          Rugs.fun
        </div>
      </Link>

      {/* Wallet / Menu */}
      {connected ? (
        <Dialog>
          <DialogTrigger>
            <Menu
              stroke="black"
              strokeWidth={4}
              absoluteStrokeWidth
              className="bg-yellow-400/90 rounded-sm p-1 m-3 cursor-pointer"
            />
          </DialogTrigger>
          <DialogContent className="flex flex-col">
            <DialogTitle className="font-mono text-yellow-400">
              Deposit SOL
            </DialogTitle>
            <input
              type="number"
              placeholder="Deposit Amount"
              value={tokenamount}
              onChange={(e) => {
                setTokenAmount(e.target.value);
              }}
              className="outline-none m-3 p-3 ml-0 border border-yellow-400/50 w-full rounded-xl placeholder:text-gray-300 text-yellow-400 bg-yellow-600/10 placeholder:font-mono placeholder:text-xs"
            />
            <Button
              onClick={depositFunds}
              className="text-xl cursor-pointer px-5 my-2 bg-yellow-300 hover:bg-yellow-500 text-black font-semibold font-mono"
              style={{
                fontWeight: "bold",
                textShadow: `
                  3px 3px 0 #000000,
                  -3px -3px 0 #000000,
                  3px -3px 0 #000000,
                  -3px 3px 0 #000000,

                  2px 2px 0 #FFD700,
                  -2px -2px 0 #FFD700,
                  2px -2px 0 #FFD700,
                  -2px 2px 0 #FFD700,
                `,
              }}
            >
              Deposit
            </Button>
            <DialogFooter>
              <div className="w-full flex justify-between items-center">
                <Button
                  onClick={async () => await disconnect()}
                  className="brightness-75 cursor-pointer"
                >
                  Disconnect Wallet
                </Button>
                <Link
                  href={"/faucet"}
                  className="text-xs brightness-75 underline"
                >
                  Checkout our SOL faucet to mint some tokens!
                </Link>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <WalletMultiButton
          className="text-xl cursor-pointer px-5 py-2 rounded-lg"
          style={{
            background: "none",
            color: "#FFFFFF",
            fontWeight: "bold",
            textShadow: `
              3px 3px 0 #000000,
              -3px -3px 0 #000000,
              3px -3px 0 #000000,
              -3px 3px 0 #000000,

              2px 2px 0 #FFD700,
              -2px -2px 0 #FFD700,
              2px -2px 0 #FFD700,
              -2px 2px 0 #FFD700,
            `,
          }}
        >
          Connect Wallet
        </WalletMultiButton>
      )}
    </div>
  );
};

export default Navbar;
