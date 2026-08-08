import type { FastifyInstance, FastifyRequest } from "fastify";

import { connectionManager } from "./connection-manager.js";
import { WebSocketEvents } from "./events.js";
import { broadcastTyping } from "./typing.js";
import {
  setUserOffline,
  setUserOnline,
} from "../modules/user/presence.service.js";
import { verifyWebSocketToken } from "./auth.js";
import {
  sendAnswer,
  sendIceCandidate,
  sendOffer,
} from "../modules/call/call.signal.js";

export default async function websocketRoutes(app: FastifyInstance) {
  app.get(
    "/ws",
    {
      websocket: true,
    },
    (socket, request: FastifyRequest) => {
      void (async () => {
        try {
          const url = new URL(
            request.url,
            `${request.protocol}://${request.headers.host}`,
          );
          const token = url.searchParams.get("token");

          if (!token) {
            socket.close();
            return;
          }

          const payload = await verifyWebSocketToken(app, token);
          const userId = payload.sub;

          connectionManager.add(userId, socket);

          await setUserOnline(userId);

          connectionManager.broadcast(WebSocketEvents.USER_ONLINE, {
            userId,
          });

          app.log.info(`${userId} connected`);

          socket.send(
            JSON.stringify({
              event: WebSocketEvents.CONNECTED,
              payload: {
                userId,
              },
            }),
          );

          socket.on("message", async (raw) => {
            try {
              const data = JSON.parse(raw.toString());

              switch (data.event) {
                case "typing":
                  await broadcastTyping(
                    userId,
                    data.payload.conversationId,
                    data.payload.typing,
                  );
                  break;

                case WebSocketEvents.WEBRTC_OFFER:
                  sendOffer(data.payload.receiverId, {
                    callerId: userId,
                    conversationId: data.payload.conversationId,
                    offer: data.payload.offer,
                  });
                  break;

                case WebSocketEvents.WEBRTC_ANSWER:
                  sendAnswer(data.payload.receiverId, {
                    answer: data.payload.answer,
                  });
                  break;

                case WebSocketEvents.WEBRTC_ICE:
                  sendIceCandidate(data.payload.receiverId, {
                    candidate: data.payload.candidate,
                  });
                  break;

                default:
                  app.log.warn(`Unknown websocket event: ${data.event}`);
              }
            } catch (error) {
              app.log.error(error);
            }
          });

          socket.on("close", () => {
            connectionManager.remove(userId);

            void (async () => {
              await setUserOffline(userId);

              connectionManager.broadcast(WebSocketEvents.USER_OFFLINE, {
                userId,
              });

              app.log.info(`${userId} disconnected`);
            })();
          });

          socket.on("error", (error) => {
            app.log.error(error);
          });
        } catch (error) {
          app.log.error(error);

          socket.close();
        }
      })();
    },
  );
}
