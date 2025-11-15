module.exports = [
  {
    method: "POST",
    path: "/assistant",
    handler: "assistant.handle",
    config: {
      auth: false, // keep your existing config
    },
  },
];
