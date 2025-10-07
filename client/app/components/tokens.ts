export const TOKENS = [
  {
    symbol: "USDC",
    name: "USDC",
    mint: "9SFMpR2owdeZpGRLomHsDtx5rEf2bVuo3XCgSjyAVUf4",
    img: "https://mcvzbtnedtysipzkwmuz.supabase.co/storage/v1/object/public/uploads/usdc-devnet.png",
  },
  {
    symbol: "SOL",
    name: "Solana",
    mint: "J8NDF3RxtfZ5E2vks2NdchwE3PXNMNwUngCpEbMoLaoL",
    img: "https://mcvzbtnedtysipzkwmuz.supabase.co/storage/v1/object/public/uploads/solana-coin.png",
  },
] as const;

export type FaucetToken = (typeof TOKENS)[number];
