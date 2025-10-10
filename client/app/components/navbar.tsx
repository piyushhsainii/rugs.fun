"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import {
  createUser,
  MaxWithdrawAmountAllowed,
  updateBalance,
} from "../../server/server";
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
import { BN, Program } from "@coral-xyz/anchor";
import {
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import IDL from "../../contract_build/rugs_fun.json";
import { MINT_ADDRESS } from "@/constants/constants";
import {
  getAssociatedTokenAddress,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { RugsFun } from "@/contract_build/rugs_fun";
import { supabase } from "@/supabase/client";
import { toast } from "sonner";
import { useUserInformation } from "../hooks/userInfo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Navbar = () => {
  const { publicKey, connected, disconnect, connect, select } = useWallet();
  const { balance, setBalance, error, loading, refetch } = useUserInformation();
  const [tokenamount, setTokenAmount] = useState("0");
  const wallet = useWallet();

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
    if (!wallet.publicKey) {
      toast("Wallet not connected");
      return;
    }
    try {
      try {
        const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
        const program: Program<RugsFun> = new Program(IDL, { connection });

        const user_account = await getAssociatedTokenAddress(
          new PublicKey(MINT_ADDRESS),
          wallet.publicKey!,
          false,
          TOKEN_2022_PROGRAM_ID
        );

        console.log(user_account.toString());
        const lamportAmount = Number(tokenamount) * LAMPORTS_PER_SOL;
        const ix = await program.methods
          .deposit(new BN(lamportAmount))
          .accountsPartial({
            mint: new PublicKey(MINT_ADDRESS),
            tokenProgram: TOKEN_2022_PROGRAM_ID,
            signer: wallet.publicKey!,
            userAccount: user_account,
          })
          .instruction();

        const bx = await connection.getLatestBlockhash();

        const tx = new Transaction({
          feePayer: wallet.publicKey,
          blockhash: bx.blockhash,
          lastValidBlockHeight: bx.lastValidBlockHeight,
        }).add(ix);

        const txSig = await wallet.sendTransaction(tx, connection);
        console.log(`txSig`, txSig);

        const res = await connection.confirmTransaction(txSig);
        console.log(res);

        const balance = await updateBalance(
          lamportAmount,
          wallet.publicKey?.toString()
        );
        if (!balance) return;
        setBalance(balance);
        console.log(`Updated balance`, balance);
      } catch (error) {
        console.log(error);
      }
    } catch (error) {
      console.log(error);
    }
  };
  const withdrawFunds = async () => {
    if (!wallet.publicKey) {
      toast("Wallet not connected");
      return;
    }
    try {
      try {
        const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
        const program: Program<RugsFun> = new Program(IDL, { connection });
        const maxWithdrawAmount = await MaxWithdrawAmountAllowed(
          wallet.publicKey.toString()
        );
        setTokenAmount(String(Number(maxWithdrawAmount)));
        const lamportAmount = Number(tokenamount) * LAMPORTS_PER_SOL;
        // if true, then stop the withdraw
        const isNotAllowed = lamportAmount > Number(maxWithdrawAmount ?? 0);

        if (isNotAllowed) {
          toast("Cannot Withdraw more than available balance");
          return;
        }
        const user_account = await getAssociatedTokenAddress(
          new PublicKey(MINT_ADDRESS),
          wallet.publicKey!,
          false,
          TOKEN_2022_PROGRAM_ID
        );
        const [bank_auth] = PublicKey.findProgramAddressSync(
          [Buffer.from("bank_authority")],
          new PublicKey(IDL.address)
        );
        console.log(`Bank Authority`, bank_auth.toString());
        const bank_account = await getAssociatedTokenAddress(
          new PublicKey(MINT_ADDRESS),
          bank_auth,
          true,
          TOKEN_2022_PROGRAM_ID
        );
        console.log(`Bank Account`, bank_account.toString());
        const bank_balance = await connection.getBalance(bank_account);
        console.log(`balance`, bank_balance);
        console.log(user_account.toString());
        const ix = await program.methods
          .withdraw(new BN(lamportAmount))
          .accountsPartial({
            mint: new PublicKey(MINT_ADDRESS),
            tokenProgram: TOKEN_2022_PROGRAM_ID,
            signer: wallet.publicKey!,
          })
          .instruction();

        const bx = await connection.getLatestBlockhash();

        const tx = new Transaction({
          feePayer: wallet.publicKey,
          blockhash: bx.blockhash,
          lastValidBlockHeight: bx.lastValidBlockHeight,
        }).add(ix);

        const txSig = await wallet.sendTransaction(tx, connection);
        console.log(`txSig`, txSig);

        const res = await connection.confirmTransaction(txSig);
        console.log(res);

        const balance = await updateBalance(
          lamportAmount,
          wallet.publicKey?.toString()
        );
        if (!balance) return;
        setBalance(balance);
        console.log(`Updated balance`, balance);
      } catch (error) {
        console.log(error);
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="w-full flex justify-evenly items-center text-white">
      <div>
        <Link href={"/"}>
          <div
            className="font-extrabold text-4xl cursor-pointer"
            style={{
              textShadow: `
            /* Black bold outline (4 directions) */
            3px 3px 0 #000,
            -3px -3px 0 #000,
            3px -3px 0 #000,
            -3px 3px 0 #000,

            /* Yellow accent layer */
            2px 2px 0 #FFD700,
            -2px -2px 0 #FFD700,
            2px -2px 0 #FFD700,
            -2px 2px 0 #FFD700,

            /* Soft white glow */
            0 0 5px rgba(255, 255, 255, 0.7)
          `,
            }}
          >
            Rugs.fun
          </div>
        </Link>
      </div>

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
          <Tabs>
            <DialogContent className="flex flex-col">
              <DialogTitle className="font-mono text-yellow-400">
                <TabsList>
                  <TabsTrigger value="1">Deposit</TabsTrigger>
                  <TabsTrigger value="2">Withdraw</TabsTrigger>
                </TabsList>
              </DialogTitle>
              <TabsContent value="1">
                <label
                  htmlFor=""
                  className="text-xs font-sans text-yellow-400 brightness-75 "
                >
                  SOL Amount
                </label>
                <input
                  type="number"
                  placeholder="Deposit Amount"
                  value={`${tokenamount}`}
                  onChange={(e) => {
                    setTokenAmount(e.target.value);
                  }}
                  className="outline-none  p-3 ml-0 border border-yellow-400/50 w-full rounded-xl placeholder:text-gray-300 text-yellow-400 bg-yellow-600/10 placeholder:font-mono placeholder:text-xs"
                />
                <Button
                  onClick={depositFunds}
                  className="text-base cursor-pointer px-8 my-2 mb-5 bg-yellow-300 hover:bg-yellow-500 text-black font-semibold font-sans rounded-full"
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
              </TabsContent>
              <TabsContent value="2">
                <label
                  htmlFor=""
                  className="text-xs font-sans text-yellow-400 brightness-75 pl-1 py-1"
                >
                  SOL Amount
                </label>
                <input
                  type="number"
                  placeholder="Withdraw Amount"
                  value={`${tokenamount}`}
                  onChange={(e) => {
                    setTokenAmount(e.target.value);
                  }}
                  className="outline-none  p-3 ml-0 border border-yellow-400/50 w-full rounded-xl placeholder:text-gray-300 text-yellow-400 bg-yellow-600/10 placeholder:font-mono placeholder:text-xs"
                />
                <div className="w-full flex justify-between text-xs items-center my-1 ">
                  <div className="brightness-75 text-yellow-400 px-2">
                    {" "}
                    Available to withdraw:{" "}
                    {balance &&
                      Number(balance / LAMPORTS_PER_SOL).toFixed(4)}{" "}
                  </div>
                  <div
                    className="border border-yellow-400/50  rounded-full px-3 py-1 text-xs cursor-pointer hover:bg-yellow-400/80 hover:text-white"
                    onClick={() =>
                      setTokenAmount(
                        Number(balance! / LAMPORTS_PER_SOL).toFixed(4)
                      )
                    }
                  >
                    {" "}
                    MAX{" "}
                  </div>
                </div>
                <Button
                  onClick={withdrawFunds}
                  className="text-base cursor-pointer  mb-5 px-8 mt-2  bg-yellow-300 hover:bg-yellow-500 text-black font-semibold font-sans rounded-full"
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
                `,
                  }}
                >
                  Withdraw
                </Button>
              </TabsContent>
              <DialogFooter>
                <div className="w-full flex justify-between items-center ">
                  <Button
                    onClick={async () => await disconnect()}
                    className="brightness-100 cursor-pointer rounded-full px-5 py-1 text-red-500 font-semibold bg-black/20 border-black"
                  >
                    disconnect
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
          </Tabs>
        </Dialog>
      ) : (
        <WalletMultiButton
          className="text-xl cursor-pointer px-5 py-2 rounded-lg text-shadow-amber-300 text-shadow-sm"
          style={{
            background: "none",
            color: "#FFFFFF",
            fontWeight: "semibold",
            textShadow: `
    1.4px 1.1px 0.1px rgba(0, 0, 0, 1),      /* black shadow (base) */
    2px 1.6px 0.2px rgba(252, 211, 77, 1)  /* yellow shadow next to it */
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
