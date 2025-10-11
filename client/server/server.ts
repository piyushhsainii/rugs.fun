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

export async function updateBalance(
  depositedAmount: number,
  wallet_address: string
) {
  // fetch user balance
  const supabase = await createClient();
  const balance = await supabase
    .from("users_rugsfun")
    .select("*")
    .eq("wallet_address", wallet_address)
    .single();

  if (!balance.data || balance.error) {
    console.log(`Could not update balance`);
    return;
  }
  console.log(`Deposited Amount`, depositedAmount);
  // Updating user balance
  const updatedBalance = (balance.data?.balance ?? 0) + depositedAmount;
  const res = await supabase
    .from("users_rugsfun")
    .update({
      balance: updatedBalance,
      depositedBalance: updatedBalance,
    })
    .eq("wallet_address", wallet_address)
    .single();

  if (res.error) {
    console.log(`Could not update balance`);
    return;
  }

  return updatedBalance;
}

export async function MaxWithdrawAmountAllowed(wallet_address: string) {
  // fetch user balance
  const supabase = await createClient();
  const { data: balance, error } = await supabase
    .from("users_rugsfun")
    .select("*")
    .eq("wallet_address", wallet_address)
    .single();

  if (!balance || error) {
    console.log(`Could not update balance`);
    return;
  }
  console.log(`Max Withdraw Amount`, balance.balance);

  return balance.balance;
}

export const fetchUsername = async (wallet_address: string) => {
  console.log(`1`);
  if (!wallet_address) return;
  console.log(`2`);
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("users_rugsfun")
      .select("*")
      .eq("wallet_address", wallet_address.toString())
      .single();

    if (error) {
      console.log(`Could not fetch username`, error);
      return;
    }
    return data.user_name;
  } catch (error) {
    console.log(`Error occured`, error);
    return null;
  }
};
export const updateUsername = async (
  wallet_address: string,
  user_name: string
) => {
  console.log(`1`);
  if (!wallet_address) return;
  console.log(`2`);
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("users_rugsfun")
      .update({
        user_name: user_name,
      })
      .eq("wallet_address", wallet_address.toString())
      .select()
      .single();

    if (error) {
      console.log(`Could not fetch username`, error);
      return;
    }
    return data.user_name;
  } catch (error) {
    console.log(`Error occured`, error);
    return null;
  }
};
