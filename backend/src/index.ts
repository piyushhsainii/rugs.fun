import { generateChaoticPath } from "./lib/price_ticks";
import WebSocket from "ws";

// Create WebSocket server on port 8080
const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", (ws) => {
  console.log("Client connected");

  const path = generateChaoticPath();
  let index = 0;

  const interval = setInterval(() => {
    if (index < path.length) {
      ws.send(JSON.stringify({ multiplier: path[index] }));
      index++;
    } else {
      clearInterval(interval);
      ws.close(); // Close connection after path is complete
    }
  }, 1000); // send one multiplier per second

  // Clean up on disconnect
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

// Example run
console.log(generateChaoticPath());
