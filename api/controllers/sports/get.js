module.exports = {

  friendlyName: `Sports / Get`,

  description: `Get sports information and subscribe to the sports websocket.`,

  inputs: {

  },

  exits: {

  },

  fn: async function (inputs, exits) {
    if (this.req.isSocket) {
      sails.sockets.join(this.req, `sports`)
      sails.log.verbose(`Request was a socket. Joining sports.`)
    }

    return exits.success(await sails.models.sports.find())
  }

}
