import WebSocket, { WebSocketServer } from "ws";
import { createTickGenerator } from "./lib/price_ticks";

interface Trade {
  id: number;
  buy: number;
  sell?: number;
  pnl?: number;
}

interface User {
  userId: string;
  trades: Trade[];
}

interface GameTick {
  time: number;
  value: number;
}

interface GameHistory {
  id: number;
  crashedAt: number;
  ticks: GameTick[];
}

const wss = new WebSocketServer({ port: 8080 });

let tickGenerator: ReturnType<typeof createTickGenerator>;
let currentMultiplier = 1.0;
let gameState: "WAITING" | "ACTIVE" | "CRASHED" = "WAITING";
let timer = 0;
let gameInterval: any;
let timerInterval: any;

let users: User[] = [];
let currentGameTicks: GameTick[] = [];
let previousGames: GameHistory[] = []; // holds last 10 games only

// --- Broadcast Helper ---
const broadcast = (data: any) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
};

// --- Start Game ---
const startGame = () => {
  console.log("🚀 Game started");
  // Reset per-game state
  users = [];
  currentGameTicks = [];
  tickGenerator = createTickGenerator();
  gameState = "ACTIVE";

  // Tick generator loop
  gameInterval = setInterval(() => {
    const tick = tickGenerator();
    currentMultiplier = tick.value;
    // Record tick
    currentGameTicks.push({ time: Date.now(), value: currentMultiplier });

    // Broadcast live tick
    broadcast({
      type: "tick",
      multiplier: currentMultiplier,
      state: gameState,
      timer: 0,
    });

    // --- Crash ---
    if (tick.crashed) {
      clearInterval(gameInterval);
      gameState = "CRASHED";
      console.log(`💥Game crashed at multiplier: ${currentMultiplier}`);

      // Save finished game to history
      previousGames.push({
        id: Date.now(),
        crashedAt: currentMultiplier,
        ticks: [...currentGameTicks],
      });

      // Keep only last 10 games
      if (previousGames.length > 10) {
        previousGames.shift();
      }
      currentGameTicks = [];
      // Broadcast crash
      broadcast({
        type: "tick",
        multiplier: currentMultiplier,
        state: "CRASHED",
        timer: 0,
      });

      // 2️⃣ Wait 2 seconds before starting WAITING timer
      setTimeout(() => {
        timer = 8;
        timerInterval = setInterval(() => {
          broadcast({
            type: "tick",
            multiplier: currentMultiplier,
            state: "WAITING",
            timer,
          });
          timer--;

          if (timer < 0) {
            clearInterval(timerInterval);
            startGame(); // start new game
          }
        }, 1000);
      }, 2000);
    }
  }, 500);
};

// --- WebSocket Connection ---
wss.on("connection", (ws) => {
  console.log("🟢 New client connected");

  // Send initial state & recent game history
  ws.send(
    JSON.stringify({
      type: "init",
      multiplier: currentMultiplier,
      state: gameState,
      timer,
      allUserTrades: users,
      previousGames,
      currentGameTicks, // include current round tick data for redraws
    })
  );

  // Update live user count
  broadcast({
    type: "client-count",
    count: wss.clients.size,
  });

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());
      // --- Identify / Reconnect user ---
      if (data.type === "identify") {
        const user = users.find((u) => u.userId === data.userId);
        if (user) {
          ws.send(
            JSON.stringify({
              type: "trade-restore",
              userId: user.userId,
              trades: user.trades,
            })
          );
        }

        // Send current tick data for chart redraw
        ws.send(
          JSON.stringify({
            type: "tick-restore",
            ticks: currentGameTicks,
          })
        );

        return;
      }
      // --- BUY ---
      if (data.type === "buy") {
        let user = users.find((u) => u.userId === data.userId);
        if (!user) {
          user = { userId: data.userId, trades: [] };
          users.push(user);
        }

        const trade: Trade = { id: Date.now(), buy: data.buy };
        user.trades.push(trade);

        broadcast({
          type: "trade-update",
          userId: user.userId,
          trades: user.trades,
        });
      }
      // --- SELL ---
      if (data.type === "sell") {
        const user = users.find((u) => u.userId === data.userId);
        if (!user) return;

        const openTrade = user.trades.find((t) => t.sell === undefined);
        if (!openTrade) return;

        openTrade.sell = data.sell;
        openTrade.pnl = ((data.sell - openTrade.buy) / openTrade.buy) * 100;

        broadcast({
          type: "trade-update",
          userId: user.userId,
          trades: user.trades,
        });
      }
    } catch (err) {
      console.error("❌ Invalid WS message:", err);
    }
  });

  ws.on("close", () => console.log("🔴 Client disconnected"));
});

// --- Start first game ---
startGame();

console.log("✅ WebSocket server running on ws://localhost:8080");
