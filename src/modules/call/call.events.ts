import { connectionManager } from "../../websocket/connection-manager.js";
import { WebSocketEvents } from "../../websocket/events.js";

type CallInvitePayload = {
  callId: string;

  conversationId: string;

  caller: {
    id: string;
    name: string;
    avatar: string | null;
  };
};

export function emitIncomingCall(
  receiverId: string,
  payload: CallInvitePayload,
) {
  connectionManager.send(receiverId, WebSocketEvents.CALL_INVITE, payload);
}
