import { useEffect, useRef, useState } from "react";

export default function useGameWebSocket() {
  const userId = localStorage.getItem("userId");

  const [gameState, setGameState] = useState<"WAITING" | "ACTIVE" | "CRASHED">(
    "WAITING"
  );
  const [clientsConnected, setClientsConnected] = useState(0);
  const [allUserTrades, setAllUserTrades] = useState<
    { userId: string; trades: any[] }[]
  >([
    {
      userId: "213",
      trades: [
        {
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
          console.log(`Received PING`, message);
          ws.send(
            JSON.stringify({
              type: "PONG",
              serverTimestamp: message.serverTimestamp,
            })
          );
          console.log(`Sending PONG`);
        }

        if (message.type === "LATENCY_UPDATE") {
          console.log(`Latency update in`, message);
          setLatency(message.latency);
        }

        // 🟢 Connected clients count
        if (data.type === "client-count") {
          console.log("Connected clients:", data.count);
          setClientsConnected(data.count);
        }

        // 🔁 Restore user trades on reconnect
        if (data.type === "trade-restore" && data.userId === userId) {
          console.log("Trade restored:", data.trades);
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
          console.log("INIT:", data);
          setGameState(data.state);
          setPreviousGames(data.previousGames || []);
          historyRef.current =
            data.currentGameTicks?.map((t: any) => t.value) || [];
          setHistory([...historyRef.current]);
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
            setGameState("CRASHED");
          } else if (state === "WAITING") {
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
          const { userId, trades } = data;
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

  console.log(latency, "latency");

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
    setGameState,
  };
}
