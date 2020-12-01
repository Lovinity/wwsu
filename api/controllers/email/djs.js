const nodemailer = require("nodemailer");

module.exports = {
  friendlyName: "Email / djs",

  description: "email all DJs in the system.",

  inputs: {
    subject: {
      type: "string",
      required: true,
      maxLength: 255
    },
    text: {
      type: "string",
      required: true
    }
  },

  exits: {},

  fn: async function(inputs, exits) {
    let djs = await sails.models.djs.find({ email: { "!=": null } });
    let sendTo = djs.filter(dj => dj.email && dj.email !== "");

    return await sails.helpers.emails.queue.with({
      to: sendTo,
      subject: inputs.subject,
      text: inputs.text,
      sendNow: false
    });
  }
};
