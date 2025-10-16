// migrations/XXXXXXXXXXXX_add_unique_slug_to_products.js
// ------------------------------------------------------
// Dev-comment: Enforce uniqueness on products.slug at the DB level.
// Clean duplicates before running this migration, or it will fail.
// ------------------------------------------------------

/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  // Dev-comment: make sure table exists (fresh DB safety)
  const exists = await knex.schema.hasTable('products');
  if (!exists) return;

  // Dev-comment: add a named unique index for easy rollback/inspection
  await knex.schema.alterTable('products', (t) => {
    t.unique(['slug'], 'unique_product_slug');
  });
};

/** @param {import('knex').Knex} knex */
exports.down = async function down(knex) {
  const exists = await knex.schema.hasTable('products');
  if (!exists) return;

  await knex.schema.alterTable('products', (t) => {
    t.dropUnique(['slug'], 'unique_product_slug');
  });
};
