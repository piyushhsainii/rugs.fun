import { createClient } from "@/supabase/server";
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
