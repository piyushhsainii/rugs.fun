"use client";

import type React from "react";
import { useState, useRef, RefObject, SetStateAction, Dispatch } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useUserInformation } from "../hooks/userInfo";
import { useWallet } from "@solana/wallet-adapter-react";

type ChatMessage = {
  username: string;
  message: string;
  self: boolean;
};

export function ChatSidebar({
  wsRef,
  globalChats,
  setGlobalChats,
}: {
  wsRef: RefObject<WebSocket | null>;
  globalChats: {
    username: string;
    message: string;
  }[];
  setGlobalChats: Dispatch<
    SetStateAction<
      {
        username: string;
        message: string;
      }[]
    >
  >;
}) {
  const [open, setOpen] = useState(true);
  const [text, setText] = useState("");
  const { userName } = useUserInformation();
  const { publicKey } = useWallet();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSend() {
    const value = text.trim();
    if (!value) return;
    const msg: ChatMessage = {
      username: userName ?? "guest",
      message: value,
      self: true,
    };
    inputRef.current?.focus();
    wsRef?.current?.send(
      JSON.stringify({
        type: "global-chat",
        chats: msg,
      })
    );
    setText("");
    setGlobalChats((prev) => [...prev, msg]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  }

  const disabled = userName === "guest" || !publicKey;

  return (
    <>
      {/* Sidebar */}
      <div
        className={cn(
          "max-h-[800px] inset-y-0 left-0",
          "w-full  transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          "bg-chat-bg border-r border-yellow-400/40 "
        )}
        role="complementary"
        aria-label="Global chat"
      >
        {/* Header */}
        <header className="flex items-center justify-between px-3 py-3 border-b border-yellow-400/40">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full bg-green-600"
              aria-hidden
            />
            <h2 className="text-sm font-semibold text-pretty">Global Chat</h2>
          </div>
          <span className="text-xs text-white">in-game</span>
        </header>

        {/* Messages */}
        <ScrollArea className="h-[calc(100vh-250px)] max-h-[1500px] w-full">
          <div className="flex flex-col gap-3 p-3" aria-live="polite">
            {globalChats.map((m, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex w-full",
                  userName == m.username ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm shadow",
                    userName == m.username
                      ? "bg-yellow-300 text-black font-semibold"
                      : "bg-black text-yellow-400 font-semibold"
                  )}
                >
                  <div
                    className={`mb-1 text-xs font-medium ${
                      userName == m.username
                        ? "text-black bg-gray-700/30 px-2 py-1"
                        : "text-white"
                    } rounded-full`}
                  >
                    {m.username}
                  </div>
                  <p className="whitespace-pre-wrap break-words">{m.message}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Composer */}
        <div className="border-t border-yellow-400/40 p-3">
          <div className="flex items-center gap-2 relative">
            <Input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder="Type your message..."
              aria-label="Message input"
              className="bg-black text-yellow-400 font-semibold border border-yellow-400/40"
            />

            <Button
              type="button"
              disabled={disabled}
              onClick={handleSend}
              className={cn(
                "bg-black text-yellow-400 font-semibold hover:opacity-90 cursor-pointer",
                disabled && "opacity-60 cursor-not-allowed"
              )}
            >
              Send
            </Button>
          </div>

          {/* Tooltip / Warning text */}
          {disabled && (
            <p className="mt-2 text-[11px] leading-tight text-yellow-400/80 font-semibold italic">
              ⚠️ Please{" "}
              {!publicKey && (
                <>
                  <span className="underline">connect your wallet</span>
                  {userName === "guest" && " and "}
                </>
              )}
              {userName === "guest" && (
                <span className="underline">set your username</span>
              )}{" "}
              to chat globally.
            </p>
          )}

          <p className="mt-2 text-[11px] leading-none text-yellow-400 font-semibold brightness-75">
            Press Enter to send.
          </p>
        </div>
      </div>
    </>
  );
}
