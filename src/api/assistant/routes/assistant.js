// src/api/assistant/routes/assistant.js
module.exports = {
  routes: [
    {
      method: "POST",
      path: "/assistant/chat",
      handler: "assistant.chat",
      config: { auth: false }, // public endpoint (change if you want auth)
    },
  ],
};
