export type CallInvitePayload = {
  callId: string;

  conversationId: string;

  caller: {
    id: string;
    name: string;
    avatar: string | null;
  };
};

export type CallAcceptPayload = {
  callId: string;
};

export type CallRejectPayload = {
  callId: string;
};

export type CallEndPayload = {
  callId: string;
};
