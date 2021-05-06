module.exports = {
  friendlyName: "djnotes / get",

  description: "Get the notes for a specific dj.",

  inputs: {
    dj: {
      type: "number",
      allowNull: true,
      description: "The DJ ID which to view information."
    }
  },

  exits: {},

  fn: async function(inputs, exits) {
    sails.log.debug("Controller djnotes/get called.");

    try {
      // Get records
      if (inputs.dj && inputs.dj !== null) {
        var records = await sails.models.djnotes.find({ dj: inputs.dj });

        return exits.success(records);
      } else {
        // Join socket if applicable
        if (this.req.isSocket) {
          sails.sockets.join(this.req, "djnotes");
          sails.log.verbose("Request was a socket. Joining djnotes.");
        }

        return exits.success();
      }
    } catch (e) {
      return exits.error(e);
    }
  }
};
