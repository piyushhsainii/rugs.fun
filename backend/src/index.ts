import WebSocket, { WebSocketServer } from "ws";
import { createTickGenerator } from "./lib/price_ticks";
import { supabase } from "./lib/supabase";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
interface Trade {
  id: number;
  buy: number;
  buy_amount: number;
  sell?: number;
  pnl?: number;
  userId: string;
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
let gameId: any;

let users: User[] = [];
let currentGameTicks: GameTick[] = [];
let previousGames: GameHistory[] = []; // holds last 10 games only
let userTrades: Trade[] = [];
let globalChats: {
  username: string;
  message: string;
}[] = [
  {
    username: "System",
    message: "Welcome to the global chat. Be respectful and have fun!",
  },
];

// --- Broadcast Helper ---
const broadcast = (data: any) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
};

// dotenv
dotenv.config();

// --- Start Game ---
const startGame = () => {
  console.log("🚀 Game started");
  // Reset per-game state
  users = [];
  currentGameTicks = [];
  tickGenerator = createTickGenerator();
  gameState = "ACTIVE";
  gameId = uuidv4();

  console.log("Attempting to insert game_id:", gameId);
  try {
    supabase
      .from("games_rugs_fun")
      .insert({
        game_id: gameId,
      })
      .then((res) => {
        console.log("Insert response:", res);

        if (res.error) {
          console.error("ERROR INSERTING GAME:", res);
        } else {
          console.log("✅ Successfully inserted Game ID:", gameId);
          console.log("Insert data:", res.data);
        }
      });
  } catch (error) {
    console.log(`Error`, error);
  }

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
      gameId: gameId,
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
        ticks: currentGameTicks,
      });

      // Keep only last 10 games
      if (previousGames.length > 10) {
        previousGames.shift();
      }
      const total_volume = currentGameTicks
        .map((data) => data.value) // get array of values
        .reduce((acc, val) => acc + val, 0); // sum them
      currentGameTicks = [];

      // Update off chain ledger securely
      supabase
        .from("games_rugs_fun")
        .update({
          crash_multiplier: currentMultiplier,
          total_volume: total_volume,
        })
        .eq("game_id", gameId)
        .then((res) => {
          if (res.error) {
            console.error("ERROR INSERTING GAME");
          }
        });

      // Broadcast crash
      broadcast({
        type: "tick",
        multiplier: currentMultiplier,
        state: "CRASHED",
        timer: 0,
      });
      broadcast({
        type: "prev-game",
        data: previousGames,
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

  broadcast({
    type: "global-chat",
    chats: globalChats,
  });

  setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      console.log(`Sending PING`);
      ws.send(
        JSON.stringify({
          type: "PING",
          serverTimestamp: Date.now(),
        })
      );
    }
  }, 2000);

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

      if (data.type === "PONG") {
        const rtt = Date.now() - data.serverTimestamp;
        const latency = Math.round(rtt / 2);

        ws.send(
          JSON.stringify({
            type: "LATENCY_UPDATE",
            latency,
          })
        );
      }

      if (data.type === "global-chat") {
        globalChats.push({
          username: data.chats.username,
          message: data.chats.message,
        });
        broadcast({
          type: "global-chat",
          chats: globalChats,
        });
      }

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
        ws.send(
          JSON.stringify({
            type: "prev-game",
            data: previousGames,
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

        const trade: Trade = {
          id: Date.now(),
          buy: currentMultiplier,
          buy_amount: data.buyAmount,
          userId: user.userId,
        };
        // check for balance if trade is valid and update balance.
        supabase
          .rpc("buy_trade", {
            p_wallet_address: data.userId,
            p_amount: data.buyAmount,
            p_payout_multiplier: currentMultiplier,
            p_game_id: gameId,
          })
          .then(({ data, error }: { data: any; error: any }) => {
            if (error) console.error(error);
            else {
              console.log("✅ Buy trade result:", data);
              user.trades.push(trade);
              // global trades array
              userTrades.push(trade);
              broadcast({
                type: "trade-update",
                userId: user.userId,
                trades: user.trades,
                new_balance: data.new_balance,
              });
            }
          });
      }
      // --- SELL ---
      if (data.type === "sell") {
        const user = users.find((u) => u.userId === data.userId);
        if (!user) return;

        const openTrade = user.trades.find((t) => t.sell === undefined);
        const openGlobalTrade = userTrades.find((t) => t.sell === undefined);
        if (!openTrade) return;
        if (!openGlobalTrade) return;

        openTrade.sell = currentMultiplier;
        openTrade.pnl =
          ((currentMultiplier - openTrade.buy) / openTrade.buy) * 100;

        // Updating the state of global
        openTrade.sell = currentMultiplier;
        openGlobalTrade.pnl =
          ((currentMultiplier - openGlobalTrade.buy) / openGlobalTrade.buy) *
          100;

        supabase
          .rpc("sell_trade", {
            p_wallet_address: data.userId,
            p_sell_multiplier: currentMultiplier,
            p_game_id: gameId,
          })
          .then(({ data: rpcData, error }) => {
            if (error) {
              console.error("❌ Error selling trade:", error);
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: error.message || "Failed to sell trade",
                })
              );
              return;
            }
            console.log("✅ Trade sold successfully for user:", data.userId);

            // Update local state
            openTrade.sell = currentMultiplier;
            openTrade.pnl =
              ((currentMultiplier - openTrade.buy) / openTrade.buy) * 100;

            // Update global trades array
            const openGlobalTrade = userTrades.find(
              (t) => t.userId === data.userId && t.sell === undefined
            );
            if (openGlobalTrade) {
              openGlobalTrade.sell = currentMultiplier;
              openGlobalTrade.pnl = openTrade.pnl;
            }
            console.log("✅ Sold trade result:", rpcData);
            // Broadcast updated trades to specific user
            broadcast({
              type: "trade-update",
              userId: user.userId,
              trades: user.trades,
              new_balance: data.new_balance,
            });

            // Broadcast all trades update to everyone
            // broadcast({
            //   type: "all-trades",
            //   trades: userTrades,
            // });
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
