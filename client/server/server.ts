"use server";
import { createClient } from "@/supabase/server";
import {
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import { toast } from "sonner";

export async function createUser(walletAddress: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("users_rugsfun").upsert(
      {
        wallet_address: walletAddress,
      },
      {
        onConflict: "wallet_address",
      }
    );

    if (error) {
      console.log(`Error`, error);
      toast("Could not save user's profile");
    }
  } catch (error) {
    console.log(`Error`, error);
    toast("Something went wrong");
  }
}

export async function AirDropTokensToUser(
  client: string,
  mint: string,
  amount: number
) {
  try {
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    const secretKey = process.env.MINT_AUTHORITY_PRIVATE_KEY;
    if (!secretKey) return null;
    const secret = Uint8Array.from(JSON.parse(secretKey));
    const authorityKeypair = Keypair.fromSecretKey(secret);
    const mintAddress = new PublicKey(mint);
    const owner = new PublicKey(client);
    const tokenAmt = amount * 1000000000;

    // Creating the ATA account for the user.
    const ATA = await getOrCreateAssociatedTokenAccount(
      connection,
      authorityKeypair, // authority
      mintAddress, //mint address of the TOKEN
      owner, // owner of ATA
      true,
      "confirmed",
      { commitment: "confirmed" },
      TOKEN_2022_PROGRAM_ID
    );
    // Minting the tokens
    const txSig = await mintTo(
      connection,
      authorityKeypair,
      mintAddress,
      ATA.address,
      authorityKeypair,
      tokenAmt,
      [],
      { commitment: "confirmed" },
      TOKEN_2022_PROGRAM_ID
    );
    return txSig;
  } catch (error) {
    console.log(error, "Error occured while");
    return null;
  }
}
