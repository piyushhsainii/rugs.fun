import WebSocket, { WebSocketServer } from "ws";
import { createTickGenerator } from "./lib/price_ticks";

const wss = new WebSocketServer({ port: 8080 });

let tickGenerator: ReturnType<typeof createTickGenerator>;
let currentMultiplier = 1.0;
let gameInterval: any;
let gameState: "WAITING" | "ACTIVE" | "CRASHED" = "WAITING";
let timer = 0;

const broadcast = (data: any) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
};

const startGame = () => {
  console.log("Game started");
  tickGenerator = createTickGenerator();
  gameState = "ACTIVE";

  gameInterval = setInterval(() => {
    const tick = tickGenerator();
    currentMultiplier = tick.value;

    broadcast({
      type: "tick",
      multiplier: currentMultiplier,
      state: gameState,
      timer: 0, // 0 during active round
    });

    if (tick.crashed) {
      clearInterval(gameInterval);
      gameState = "CRASHED";
      console.log(`Game crashed at multiplier: ${currentMultiplier}`);

      // Broadcast crash
      broadcast({
        type: "tick",
        multiplier: currentMultiplier,
        state: gameState,
        timer: 0,
      });

      // Start timer countdown
      timer = 8;
      const timerInterval = setInterval(() => {
        broadcast({
          type: "tick",
          multiplier: currentMultiplier,
          state: "WAITING",
          timer,
        });

        timer--;
        if (timer <= 0) {
          clearInterval(timerInterval);
          startGame(); // Start new round
        }
      }, 1000);
    }
  }, 500); // send tick every 500ms
};

wss.on("connection", (ws) => {
  console.log("New client connected");

  // Send initial state
  ws.send(
    JSON.stringify({
      type: "tick",
      multiplier: currentMultiplier,
      state: gameState,
      timer,
    })
  );

  ws.on("message", (message) => {
    const data = JSON.parse(message.toString());
    // handle buy/sell here
  });

  ws.on("close", () => console.log("Client disconnected"));
});

startGame();
