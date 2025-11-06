'use strict';

module.exports = {
  routes: [
    // --- Default CRUD routes for the Product collection type ---
    { method: 'GET',    path: '/products',          handler: 'product.find',     config: { policies: [], middlewares: [] } },
    { method: 'GET',    path: '/products/:id',      handler: 'product.findOne',  config: { policies: [], middlewares: [] } },
    { method: 'POST',   path: '/products',          handler: 'product.create',   config: { policies: [], middlewares: [] } },
    { method: 'PUT',    path: '/products/:id',      handler: 'product.update',   config: { policies: [], middlewares: [] } },
    { method: 'DELETE', path: '/products/:id',      handler: 'product.delete',   config: { policies: [], middlewares: [] } },

    // --- Our custom chat endpoint under the product API ---
    { method: 'POST',   path: '/products/assistant-chat', handler: 'product.chat', config: { auth: false } },
  ],
};
