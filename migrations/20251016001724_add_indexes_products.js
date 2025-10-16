// migrations/20251016001724_add_indexes_products.js
// ------------------------------------------------------
// Dev-comment: Add helpful indexes to products. We RETURN the schema
// promise so Knex knows when the migration is complete.
// ------------------------------------------------------

/** @param {import('knex').Knex} knex */
exports.up = function up(knex) {
  // Dev-comment: return the promise from alterTable so Knex doesn't warn.
  return knex.schema.hasTable('products').then((exists) => {
    if (!exists) return; // fresh DB safety
    return knex.schema.alterTable('products', (t) => {
      t.index('slug', 'idx_products_slug');
      t.index('name', 'idx_products_name');
    });
  });
};

/** @param {import('knex').Knex} knex */
exports.down = function down(knex) {
  // Dev-comment: also return the promise for the rollback path.
  return knex.schema.hasTable('products').then((exists) => {
    if (!exists) return;
    return knex.schema.alterTable('products', (t) => {
      t.dropIndex('slug', 'idx_products_slug');
      t.dropIndex('name', 'idx_products_name');
    });
  });
};
