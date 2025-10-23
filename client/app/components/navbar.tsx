"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import {
  createUser,
  MaxWithdrawAmountAllowed,
  updateBalance,
  updateUsername,
} from "../../server/server";
import Link from "next/link";
import { Check, Loader2, Menu } from "lucide-react";
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
import { toast } from "sonner";
import { useUserInformation } from "../hooks/userInfo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Navbar = () => {
  const { publicKey, connected, disconnect } = useWallet();
  const { balance, setBalance, setUserName, userName, refetch } =
    useUserInformation();
  const [changeusername, setchangeusername] = useState(userName);
  const [tokenamount, setTokenAmount] = useState("");
  const [loadingDeposit, setLoadingDeposit] = useState(false);
  const [loadingWithdraw, setLoadingWithdraw] = useState(false);
  const wallet = useWallet();

  // ——————————————————————————————————————————
  // USER CREATION HANDLER
  useEffect(() => {
    if (connected && publicKey) {
      handleUser(publicKey.toBase58());
    }
  }, [connected, publicKey]);

  const handleUser = async (walletAddress: string) => {
    try {
      await createUser(walletAddress);
    } catch (err) {
      console.error("Failed to create user:", err);
      toast.error("Could not initialize your account.");
    }
  };

  // ——————————————————————————————————————————
  // DEPOSIT FUNCTION
  const depositFunds = async () => {
    if (!wallet.publicKey) {
      toast.error("Wallet not connected");
      return;
    }
    if (!tokenamount || Number(tokenamount) <= 0) {
      toast.warning("Enter a valid amount to deposit");
      return;
    }

    try {
      setLoadingDeposit(true);
      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
      const program: Program<RugsFun> = new Program(IDL, { connection });

      const user_account = await getAssociatedTokenAddress(
        new PublicKey(MINT_ADDRESS),
        wallet.publicKey!,
        false,
        TOKEN_2022_PROGRAM_ID
      );

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
      await connection.confirmTransaction(txSig);

      const newBalance = await updateBalance(
        lamportAmount,
        wallet.publicKey.toString()
      );
      if (newBalance) setBalance(newBalance);
      refetch();
      toast.success(`Deposit successful! ✅`);
      setTokenAmount("");
    } catch (error: any) {
      console.error(error);
      toast.error("Deposit failed. Please try again.");
    } finally {
      setLoadingDeposit(false);
    }
  };

  // ——————————————————————————————————————————
  // WITHDRAW FUNCTION
  const withdrawFunds = async () => {
    if (!wallet.publicKey) {
      toast.error("Wallet not connected");
      return;
    }
    if (!tokenamount || Number(tokenamount) <= 0) {
      toast.warning("Enter a valid amount to withdraw");
      return;
    }

    try {
      setLoadingWithdraw(true);
      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
      const program: Program<RugsFun> = new Program(IDL, { connection });

      const maxWithdrawAmount = await MaxWithdrawAmountAllowed(
        wallet.publicKey.toString()
      );
      const lamportAmount = Number(tokenamount) * LAMPORTS_PER_SOL;

      if (lamportAmount > Number(maxWithdrawAmount ?? 0)) {
        toast.warning("Cannot withdraw more than available balance.");
        return;
      }

      const user_account = await getAssociatedTokenAddress(
        new PublicKey(MINT_ADDRESS),
        wallet.publicKey!,
        false,
        TOKEN_2022_PROGRAM_ID
      );

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
      await connection.confirmTransaction(txSig);

      const newBalance = await updateBalance(
        -lamportAmount,
        wallet.publicKey.toString()
      );
      if (newBalance) setBalance(newBalance);
      refetch();
      toast.success("Withdrawal successful! ✅");
      setTokenAmount("");
    } catch (error) {
      console.error(error);
      toast.error("Withdrawal failed. Please try again.");
    } finally {
      setLoadingWithdraw(false);
    }
  };

  const handleUsernameUpdate = async () => {
    if (!changeusername?.trim() || !wallet?.publicKey) return;
    const res = await updateUsername(
      wallet.publicKey.toString(),
      changeusername?.trim()
    );
    if (res) setUserName(res);
  };
  return (
    <div
      className={`
    sticky top-0 z-50
    w-full flex justify-around items-center text-white
    backdrop-blur-lg bg-black/40
    border-b border-yellow-400/20
    shadow-[0_4px_15px_rgba(255,215,0,0.2)]
    transition-all duration-300 py-3
  `}
      style={{
        boxShadow: `
      0 2px 15px rgba(255, 215, 0, 0.25),
      inset 0 -2px 8px rgba(255, 215, 0, 0.15)
    `,
      }}
    >
      <div>
        <Link href={"/"}>
          <img
            src="https://apneajyhbpncbciasirk.supabase.co/storage/v1/object/public/nft-storage/rugs-fun/rugs-fun-logo-cropped-png.png"
            alt=""
            className="h-12 w-auto"
          />
          {/* <div
            className="font-extrabold text-4xl cursor-pointer"
            style={{
              textShadow: `
            3px 3px 0 #000,
            -3px -3px 0 #000,
            3px -3px 0 #000,
            -3px 3px 0 #000,
            2px 2px 0 #FFD700,
            -2px -2px 0 #FFD700,
            2px -2px 0 #FFD700,
            -2px 2px 0 #FFD700,
            0 0 5px rgba(255,255,255,0.7)
          `,
            }}
          >
            Rugs.fun
          </div> */}
        </Link>
      </div>

      <div>
        {connected ? (
          <div className="flex items-center gap-1">
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

                  {/* ---------------- DEPOSIT TAB ---------------- */}
                  <TabsContent value="1">
                    <label className="text-xs font-sans text-yellow-400 brightness-75">
                      SOL Amount
                    </label>
                    <input
                      type="number"
                      placeholder="Deposit Amount"
                      value={tokenamount}
                      onChange={(e) => setTokenAmount(e.target.value)}
                      className="outline-none p-3 border border-yellow-400/50 w-full rounded-xl placeholder:text-gray-300 text-yellow-400 bg-yellow-600/10 placeholder:font-mono placeholder:text-xs"
                    />
                    <Button
                      onClick={depositFunds}
                      disabled={loadingDeposit}
                      className={`
                    relative overflow-hidden cursor-pointer
                    px-10 py-3 my-3 mb-5 text-base font-semibold font-sans
                    rounded-full text-white
                    backdrop-blur-md bg-gradient-to-r from-yellow-400/60 via-amber-300/50 to-yellow-500/60
                    border border-white/20
                    shadow-[0_0_20px_rgba(255,215,0,0.4)]
                    hover:shadow-[0_0_30px_rgba(255,215,0,0.7)]
                    hover:scale-[1.05] active:scale-[0.97]
                    transition-all duration-300
                    disabled:opacity-60 disabled:cursor-not-allowed
                  `}
                    >
                      {loadingDeposit ? (
                        <Loader2 className="animate-spin mr-2 h-5 w-5" />
                      ) : (
                        "Deposit"
                      )}
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 rounded-full" />
                    </Button>
                  </TabsContent>

                  {/* ---------------- WITHDRAW TAB ---------------- */}
                  <TabsContent value="2">
                    <label className="text-xs font-sans text-yellow-400 brightness-75 pl-2 py-1">
                      SOL Amount
                    </label>
                    <input
                      type="number"
                      placeholder="Withdraw Amount"
                      value={tokenamount}
                      onChange={(e) => {
                        if (
                          Number(e.target.value) >
                          Number(balance! / LAMPORTS_PER_SOL)
                        ) {
                          setTokenAmount(
                            JSON.stringify(Number(balance! / LAMPORTS_PER_SOL))
                          );
                        } else {
                          setTokenAmount(e.target.value);
                        }
                      }}
                      className="outline-none p-3 border border-yellow-400/50 w-full rounded-xl placeholder:text-gray-300 text-yellow-400 bg-yellow-600/10 placeholder:font-mono placeholder:text-xs"
                    />
                    <div className="w-full flex justify-between text-xs items-center my-1">
                      <div className="brightness-75 text-yellow-400 px-2">
                        Available to withdraw:{" "}
                        {balance
                          ? Number(balance / LAMPORTS_PER_SOL)
                          : "0.0000"}
                      </div>
                      <div
                        className="border border-yellow-400/50 rounded-full px-3 py-1 text-xs cursor-pointer hover:bg-yellow-400/80 hover:text-white"
                        onClick={() =>
                          setTokenAmount(
                            JSON.stringify(Number(balance! / LAMPORTS_PER_SOL))
                          )
                        }
                      >
                        MAX
                      </div>
                    </div>

                    <Button
                      onClick={withdrawFunds}
                      disabled={loadingWithdraw}
                      className={`
                    relative overflow-hidden cursor-pointer
                    px-10 py-3 mb-5 mt-2 text-base font-semibold font-sans
                    rounded-full text-white
                    backdrop-blur-md bg-gradient-to-r from-amber-500/60 via-orange-400/50 to-red-500/60
                    border border-white/20
                    shadow-[0_0_20px_rgba(255,140,0,0.4)]
                    hover:shadow-[0_0_30px_rgba(255,100,0,0.7)]
                    hover:scale-[1.05] active:scale-[0.97]
                    transition-all duration-300
                    disabled:opacity-60 disabled:cursor-not-allowed
                  `}
                    >
                      {loadingWithdraw ? (
                        <Loader2 className="animate-spin mr-2 h-5 w-5" />
                      ) : (
                        "Withdraw"
                      )}
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 rounded-full" />
                    </Button>
                  </TabsContent>

                  <DialogFooter>
                    <div className="w-full flex justify-between items-center">
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

            {/* — USERNAME AREA — */}
            <div className="w-full max-w-sm">
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder={
                    userName === "guest"
                      ? "Set Username"
                      : userName || "Set Username"
                  }
                  value={changeusername ?? ""}
                  onChange={(e) => setchangeusername(e.target.value)}
                  className="w-full px-4 py-1 text-white placeholder-yellow-300 bg-yellow-400/20 backdrop-blur-sm border border-yellow-400/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 transition duration-200 placeholder-opacity-70"
                />

                {(userName === "guest" || !userName) && (
                  <Check
                    size={20}
                    onClick={handleUsernameUpdate}
                    className="m-1 hover:scale-125 transition-all duration-150 bg-green-400 cursor-pointer active:scale-75 rounded"
                  />
                )}
              </div>
            </div>
          </div>
        ) : (
          <WalletMultiButton
            className="text-xl cursor-pointer px-5 py-2 rounded-lg"
            style={{
              background: "none",
              color: "#FFFFFF",
              fontWeight: "semibold",
              textShadow: `
            1.4px 1.1px 0.1px rgba(0, 0, 0, 1),
            2px 1.6px 0.2px rgba(252, 211, 77, 1)
          `,
            }}
          >
            Connect Wallet
          </WalletMultiButton>
        )}
      </div>
    </div>
  );
};

export default Navbar;
