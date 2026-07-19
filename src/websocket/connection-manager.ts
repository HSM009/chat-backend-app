import type { WebSocket } from "ws";
import { WebSocketEvent } from "./events.js";

class ConnectionManager {
  private connections = new Map<string, WebSocket>();

  add(userId: string, socket: WebSocket) {
    this.connections.set(userId, socket);
  }

  get(userId: string) {
    return this.connections.get(userId);
  }

  remove(userId: string) {
    this.connections.delete(userId);
  }

  has(userId: string) {
    return this.connections.has(userId);
  }

  send(userId: string, event: WebSocketEvent, payload: unknown) {
    const socket = this.connections.get(userId);

    if (!socket) {
      return false;
    }

    socket.send(
      JSON.stringify({
        event,
        payload,
      }),
    );

    return true;
  }

  get size() {
    return this.connections.size;
  }

  broadcast(event: WebSocketEvent, payload: unknown) {
    for (const socket of this.connections.values()) {
      socket.send(
        JSON.stringify({
          event,
          payload,
        }),
      );
    }
  }
}

export const connectionManager = new ConnectionManager();
