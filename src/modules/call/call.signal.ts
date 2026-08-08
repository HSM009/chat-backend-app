import { connectionManager } from "../../websocket/connection-manager.js";
import { WebSocketEvents } from "../../websocket/events.js";

export function sendOffer(receiverId: string, payload: unknown) {
  connectionManager.send(receiverId, WebSocketEvents.WEBRTC_OFFER, payload);
}

export function sendAnswer(receiverId: string, payload: unknown) {
  connectionManager.send(receiverId, WebSocketEvents.WEBRTC_ANSWER, payload);
}

export function sendIceCandidate(receiverId: string, payload: unknown) {
  connectionManager.send(receiverId, WebSocketEvents.WEBRTC_ICE, payload);
}
