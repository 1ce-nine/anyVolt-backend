export default [
  {
    method: 'POST',
    path: '/assistant-chat',                   // unique path to avoid collisions
    handler: 'api::assistant.assistant.echo', // FULL UID to controller
    config: { auth: false, policies: [] },
  },
];
