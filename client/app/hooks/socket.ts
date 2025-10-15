import { useEffect, useRef, useState } from "react";
import { useUserInformation } from "./userInfo";

export default function useGameWebSocket() {
  const userId = localStorage.getItem("userId");

  const [gameState, setGameState] = useState<"WAITING" | "ACTIVE" | "CRASHED">(
    "WAITING"
  );
  const { balance, setBalance, refetch } = useUserInformation();
  const [clientsConnected, setClientsConnected] = useState(0);
  const [allUserTrades, setAllUserTrades] = useState<
    {
      userId: string;
      trades: {
        id: number;
        key: String;
        userId: String;
        tradeId: String;
        buy: number;
        sell: number | null;
        pnl: number | null;
      }[];
    }[]
  >([
    {
      userId: "5NHvrqoZk4ov5GvKzDpsmEeW4URwLuG6P4HrmSDTqHc7",
      trades: [
        {
          id: 123,
          key: "",
          userId: "",
          tradeId: "123",
          buy: 1.2,
          sell: 2.4,
          pnl: 2,
        },
      ],
    },
  ]);
  const [previousGames, setPreviousGames] = useState<any[]>([]);
  const [globalChats, setGlobalChats] = useState<
    {
      username: string;
      message: string;
    }[]
  >([]);
  const [history, setHistory] = useState<number[]>([]);
  const [latency, setLatency] = useState<number | null>(null);
  const [timer, setTimer] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const historyRef = useRef<number[]>([]);
  const targetMultiplierRef = useRef<number>(1.0);

  // --------------------------------------------------
  // 🧩 WebSocket Connection
  // --------------------------------------------------
  useEffect(() => {
    if (!userId) return;

    const ws = new WebSocket("ws://localhost:8080");
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("✅ Connected to WS");
      ws.send(JSON.stringify({ type: "identify", userId }));
      console.log("Sent identification:", userId);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const message = JSON.parse(event.data);

        if (message.type === "PING") {
          ws.send(
            JSON.stringify({
              type: "PONG",
              serverTimestamp: message.serverTimestamp,
            })
          );
        }

        if (message.type === "global-chat") {
          console.log("loading chats", message.chats);
          setGlobalChats(message.chats);
        }
        if (message.type === "LATENCY_UPDATE") {
          setLatency(message.latency);
        }
        // 🟢 Connected clients count
        if (data.type === "client-count") {
          setClientsConnected(data.count);
        }
        // 🔁 Restore user trades on reconnect
        if (data.type === "trade-restore" && data.userId === userId) {
          setAllUserTrades((prev) => {
            const existing = prev.find((u) => u.userId === data.userId);
            if (existing) {
              return prev.map((u) =>
                u.userId === data.userId ? { ...u, trades: data.trades } : u
              );
            } else {
              return [...prev, data];
            }
          });
        }

        // 🔁 Restore current game ticks
        if (data.type === "tick-restore") {
          historyRef.current = [...data.ticks.map((t: any) => t.value)];
          setHistory([...historyRef.current]);
        }

        // 🧭 Handle initial game state
        if (data.type === "init") {
          setGameState(data.state);
          setPreviousGames(data.previousGames || []);
          historyRef.current =
            data.currentGameTicks?.map((t: any) => t.value) || [];
          setHistory([...historyRef.current]);
        }

        // Load in global chats..

        if (data.type === "global-chat") {
        }

        // 📈 Handle tick updates
        if (data.type === "tick") {
          const state = data.state;

          targetMultiplierRef.current = Number(data.multiplier);
          historyRef.current = [
            ...historyRef.current,
            targetMultiplierRef.current,
          ].slice(-1000);
          setHistory([...historyRef.current]);
          if (state === "CRASHED") {
            targetMultiplierRef.current = Number(0);
            setGameState("CRASHED");
            refetch();
          } else if (state === "WAITING") {
            targetMultiplierRef.current = Number(0);
            setGameState("WAITING");
            setTimer(data.timer);
            setHistory([]);
            setAllUserTrades([]);
            historyRef.current = [];
          } else {
            setGameState("ACTIVE");
          }
        }

        if (data.type === "tick-restore") {
          historyRef.current = [...data.ticks.map((t: any) => t.value)];
          setHistory([...historyRef.current]);
        }

        // 💹 Handle trade updates from server
        if (data.type === "trade-update") {
          const { userId, trades, new_balance } = data;
          setAllUserTrades((prev) => {
            const exists = prev.find((u) => u.userId === userId);
            if (exists) {
              return prev.map((u) =>
                u.userId === userId ? { userId, trades } : u
              );
            } else {
              return [...prev, { userId, trades }];
            }
          });
          setBalance(new_balance);
        }
        if (data.type === "prev-game") {
          setPreviousGames(data.data);
        }
      } catch (e) {
        console.error("Invalid WS message:", e);
      }
    };

    ws.onerror = (err) => {
      console.error("⚠️ WS error:", err);
      setGameState("CRASHED");
    };

    ws.onclose = () => {
      console.log("🔴 WS closed");
      setGameState((s) => (s === "ACTIVE" ? "CRASHED" : s));
    };

    return () => {
      ws.close();
    };
  }, [userId]);

  return {
    gameState,
    history,
    allUserTrades,
    clientsConnected,
    previousGames,
    wsRef,
    historyRef,
    targetMultiplierRef,
    timer,
    userId,
    latency,
    globalChats,
    setGlobalChats,
    setGameState,
  };
}
