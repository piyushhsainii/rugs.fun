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

// Only keep trades for current game
let users: User[] = [];

const broadcast = (data: any) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
};

const startGame = () => {
  console.log("Game started");

  // Reset current game trades
  users = [];

  tickGenerator = createTickGenerator();
  gameState = "ACTIVE";

  gameInterval = setInterval(() => {
    const tick = tickGenerator();
    currentMultiplier = tick.value;

    broadcast({
      type: "tick",
      multiplier: currentMultiplier,
      state: gameState,
      timer: 0,
    });

    if (tick.crashed) {
      clearInterval(gameInterval);
      gameState = "CRASHED";
      console.log(`Game crashed at multiplier: ${currentMultiplier}`);

      broadcast({
        type: "tick",
        multiplier: currentMultiplier,
        state: gameState,
        timer: 0,
      });

      // Start 8-second WAITING timer
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
    }
  }, 500);
};

wss.on("connection", (ws) => {
  console.log("New client connected");

  // Send initial state
  ws.send(
    JSON.stringify({
      type: "init",
      multiplier: currentMultiplier,
      state: gameState,
      timer,
      allUserTrades: users, // only current game trades
    })
  );
  // return the no. of users connected
  broadcast({
    type: "client-count",
    count: wss.clients.size,
  });

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());

      // --- BUY ---
      if (data.type === "buy") {
        let user = users.find((u) => u.userId === data.userId);
        if (!user) {
          user = { userId: data.userId, trades: [] };
          users.push(user);
        }

        const trade: Trade = {
          id: Date.now(),
          buy: data.buy,
        };
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
    } catch (e) {
      console.error("Invalid WS message:", e);
    }
  });

  ws.on("close", () => console.log("Client disconnected"));
});

// Start the first game
startGame();
