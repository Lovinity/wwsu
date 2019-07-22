module.exports = {

  friendlyName: `config / get`,

  description: `Retrieve the current configuration. Also subscribe to receive changes via the config websocket.`,

  inputs: {

  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug(`Controller config/get called.`)

    try {
      // Subscribe to websockets if applicable
      if (this.req.isSocket) {
        sails.sockets.join(this.req, `config`)
        sails.log.verbose(`Request was a socket. Joined config.`)
      }

      var returnData = _.cloneDeep(sails.config.custom)

      // Delete config that we do not want to return

      // No need to return the subcategory numbers
      delete returnData.subcats
      delete returnData.sportscats
      delete returnData.showcats

      // These are secret stuff we do not want others knowing
      delete returnData.onesignal.rest
      delete returnData.darksky.api
      delete returnData.hostSecret
      delete returnData.rest
      delete returnData.secrets

      return exits.success(returnData)
    } catch (e) {
      return exits.error(e)
    }
  }

}
