"use client";
import { RugsFun } from "@/contract_build/rugs_fun";
import { Program } from "@coral-xyz/anchor";
import IDL from "../../contract_build/rugs_fun.json";
import React from "react";
import {
  clusterApiUrl,
  Connection,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { MINT_ADDRESS } from "@/constants/constants";
import { Button } from "@/components/ui/button";

const admin = () => {
  const wallet = useWallet();

  const initAdminAccounts = async () => {
    try {
      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
      const program: Program<RugsFun> = new Program(IDL, { connection });

      const ix = await program.methods
        .instructions()
        .accounts({
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
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center mx-auto">
      <div>
        <Button onClick={initAdminAccounts}> INITIALISE </Button>
      </div>
    </div>
  );
};

export default admin;
