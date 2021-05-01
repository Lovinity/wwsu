/**
 * Emails.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  datastore: "nodebase",
  attributes: {
    ID: {
      type: "number",
      autoIncrement: true
    },

    to: {
      type: "json",
      required: true
    },

    cc: {
      type: "json"
    },

    bcc: {
      type: "json"
    },

    subject: {
      type: "string",
      maxLength: 255
    },

    text: {
      type: "string",
      maxLength: 65535
    },

    sent: {
      type: "boolean",
      defaultsTo: false
    },

    status: {
      type: "json"
    }
  }
};
