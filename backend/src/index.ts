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

const wss = new WebSocketServer({ port: 8080 });

let tickGenerator: ReturnType<typeof createTickGenerator>;
let currentMultiplier = 1.0;
let gameState: "WAITING" | "ACTIVE" | "CRASHED" = "WAITING";
let timer = 0;
let gameInterval: any;
let timerInterval: any;

interface Tick {
  time: number;
  value: number;
}
// Only keep trades for the active game
let users: User[] = [];
let currentGameTicks: Tick[] = []; // holds tick history of current game

const broadcast = (data: any) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
};

const startGame = () => {
  console.log("🎮 Starting new game...");
  users = []; // Reset all trades for the new round

  tickGenerator = createTickGenerator();
  gameState = "ACTIVE";

  gameInterval = setInterval(() => {
    const tick = tickGenerator();
    currentMultiplier = tick.value;

    currentGameTicks.push({ time: Date.now(), value: currentMultiplier });

    broadcast({
      type: "tick",
      multiplier: currentMultiplier,
      state: gameState,
      timer: 0,
    });

    if (tick.crashed) {
      clearInterval(gameInterval);
      gameState = "CRASHED";
      console.log(`💥 Game crashed at ${currentMultiplier}x`);

      broadcast({
        type: "tick",
        multiplier: currentMultiplier,
        state: gameState,
        timer: 0,
      });

      // Start waiting phase before next game
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
          startGame(); // restart
        }
      }, 1000);
    }
  }, 500);
};

wss.on("connection", (ws) => {
  console.log("🟢 New client connected");

  // Send current state immediately
  ws.send(
    JSON.stringify({
      type: "init",
      multiplier: currentMultiplier,
      state: gameState,
      timer,
    })
  );
  if (currentGameTicks.length > 0) {
    ws.send(
      JSON.stringify({
        type: "tick-restore",
        ticks: currentGameTicks,
      })
    );
  }
  // Broadcast number of connected clients
  broadcast({
    type: "client-count",
    count: wss.clients.size,
  });

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());

      // 🧩 Step 1: Identify or reconnect user
      if (data.type === "identify") {
        const user = users.find((u) => u.userId === data.userId);
        console.log(`User Found ?`, user);
        if (user) {
          // send them back their current trades
          ws.send(
            JSON.stringify({
              type: "trade-restore",
              userId: user.userId,
              trades: user.trades,
            })
          );
          if (currentGameTicks.length > 0) {
            ws.send(
              JSON.stringify({
                type: "tick-restore",
                ticks: currentGameTicks,
              })
            );
          }
        }
        return;
      }

      // 🟢 BUY
      if (data.type === "buy" && gameState === "ACTIVE") {
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

      // 🔴 SELL
      if (data.type === "sell" && gameState === "ACTIVE") {
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
    } catch (e) {
      console.error("❌ Invalid WS message:", e);
    }
  });

  ws.on("close", () => {
    console.log("🔴 Client disconnected");
    broadcast({
      type: "client-count",
      count: wss.clients.size - 1,
    });
  });
});

startGame();
