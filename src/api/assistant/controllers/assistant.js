export default {
  async echo(ctx) {
    ctx.body = {
      ok: true,
      method: ctx.request.method,
      body: ctx.request.body || null,
    };
  },
};
