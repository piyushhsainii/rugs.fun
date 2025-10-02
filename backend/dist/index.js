"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const price_ticks_1 = require("./lib/price_ticks");
const ws_1 = __importDefault(require("ws"));
// Create WebSocket server on port 8080
const wss = new ws_1.default.Server({ port: 8080 });
wss.on("connection", (ws) => {
    console.log("Client connected");
    const path = (0, price_ticks_1.generateChaoticPath)();
    let index = 0;
    const interval = setInterval(() => {
        if (index < path.length) {
            ws.send(JSON.stringify({ multiplier: path[index] }));
            index++;
        }
        else {
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
console.log((0, price_ticks_1.generateChaoticPath)());
//# sourceMappingURL=index.js.map