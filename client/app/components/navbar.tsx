"use client";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import React from "react";

const Navbar = () => {
  return (
    <div className="w-full flex justify-evenly bg-primary ">
      <div className="text-white">Rugs.fun</div>
      <div>
        <WalletMultiButton />
      </div>
    </div>
  );
};

export default Navbar;
