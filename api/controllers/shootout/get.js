module.exports = {
  friendlyName: "Get",

  description: "Get shootout data and subscribe to socket.",

  inputs: {},

  exits: {},

  fn: async function(inputs) {
    if (this.req.isSocket) {
      sails.sockets.join(this.req, "shootout");
      sails.log.verbose("Request was a socket. Joining shootout.");
    }

    return await sails.models.shootout.find();
  }
};
