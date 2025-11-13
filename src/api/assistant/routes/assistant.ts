export default {
  routes: [
    {
      method: "POST",
      path: "/assistant-chat",
      handler: "assistant.chat",   // <-- switch from echo to chat
      config: { auth: false, policies: [] },
    },
  ],
};
