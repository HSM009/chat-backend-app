import { prisma } from "../../config/prisma.js";
import { CreateCallInput } from "./call.schema.js";
import { emitIncomingCall } from "./call.events.js";
import { connectionManager } from "../../websocket/connection-manager.js";
import { WebSocketEvents } from "../../websocket/events.js";
import { CallStatus } from "../../generated/prisma/enums.js";

export async function createCall(callerId: string, data: CreateCallInput) {
  const call = await prisma.call.create({
    data: {
      conversationId: data.conversationId,
      callerId,
      receiverId: data.receiverId,
      status: CallStatus.RINGING,
    },
  });

  const caller = await prisma.user.findUnique({
    where: {
      id: callerId,
    },
    select: {
      id: true,
      name: true,
      avatar: true,
    },
  });

  if (!caller) {
    throw new Error("Caller not found");
  }

  emitIncomingCall(call.receiverId, {
    callId: call.id,
    conversationId: call.conversationId,
    caller,
  });

  const receiver = await prisma.user.findUnique({
    where: {
      id: call.receiverId,
    },
    select: {
      id: true,
      name: true,
      avatar: true,
    },
  });

  if (!receiver) {
    throw new Error("Receiver not found");
  }

  return { call, receiver };
}

export async function acceptCall(callId: string) {
  const call = await prisma.call.update({
    where: {
      id: callId,
    },
    data: {
      status: CallStatus.ACCEPTED,
      startedAt: new Date(),
    },
  });

  connectionManager.send(call.callerId, WebSocketEvents.CALL_ACCEPT, {
    callId: call.id,
  });

  return call;
}

export async function rejectCall(callId: string) {
  const call = await prisma.call.update({
    where: {
      id: callId,
    },
    data: {
      status: CallStatus.REJECTED,
      endedAt: new Date(),
    },
  });

  connectionManager.send(call.callerId, WebSocketEvents.CALL_REJECT, {
    callId: call.id,
  });

  return call;
}
