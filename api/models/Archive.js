/**
 * Archive.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  globalId: "Archive",
  primaryKey: "id",
  datastore: "nodebase",
  attributes: {
    id: {
      type: "number",
      autoIncrement: true,
    },

    createdAt: {
      type: "number",
      autoCreatedAt: true,
      autoMigrations: { columnType: "_numbertimestamp" },
    },
    fromModel: {
      type: "string",
      required: true,
      autoMigrations: { columnType: "_string" },
    },
    originalRecord: {
      type: "json",
      required: true,
      autoMigrations: { columnType: "_json" },
    },

    // Use `type:'json'` for this:
    // (since it might contain pks for records from different datastores)
    originalRecordId: { type: "json", autoMigrations: { columnType: "_json" } },
  },
};
