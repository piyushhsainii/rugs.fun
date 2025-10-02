import WebSocket from "ws";
import { createTickGenerator } from "./lib/price_ticks";

const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", (ws) => {
  console.log("Client connected");

  const nextTick = createTickGenerator();

  const interval = setInterval(() => {
    if (ws.readyState !== WebSocket.OPEN) {
      clearInterval(interval);
      return;
    }

    const { value, crashed } = nextTick();

    ws.send(
      JSON.stringify({
        multiplier: value,
        state: crashed ? "CRASHED" : "ACTIVE",
      })
    );

    if (crashed) {
      clearInterval(interval);
      ws.close();
    }
  }, 500); // tick every 250ms

  ws.on("close", () => {
    console.log("Client disconnected");
    clearInterval(interval);
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
    clearInterval(interval);
  });
});

console.log("WebSocket server running on ws://localhost:8080");
