module.exports = {
  friendlyName: "clockwheels / get",

  description: "Get all clockwheels and subscribe to sockets.",

  inputs: {},

  exits: {},

  fn: async function (inputs, exits) {
    sails.log.debug("Controller clockwheels/get called.");

    try {
      var clockwheels = await sails.models.clockwheels.find();

      // Subscribe to sockets if applicable
      if (this.req.isSocket) {
        sails.sockets.join(this.req, "clockwheels");
        sails.log.verbose("Request was a socket. Joining clockwheels.");
      }

      return exits.success(clockwheels);
    } catch (e) {
      return exits.error(e);
    }
  },
};
