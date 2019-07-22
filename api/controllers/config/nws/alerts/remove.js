module.exports = {

  friendlyName: `config / nws / alerts / remove`,

  description: `Do not trigger the internal EAS for the provided NWS alert anymore.`,

  inputs: {
    alert: {
      type: `string`,
      required: true,
      description: `The name of the alert as provided by the NWS to remove from configuration, case sensitive. Example: "Tornado Warning".`
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug(`Controller config/nws/alerts/remove called.`)

    try {
      delete sails.config.custom.EAS.alerts[inputs.alert]

      // broadcast changes over websockets
      sails.sockets.broadcast(`config`, `config`, { update: { EAS: sails.config.custom.EAS } })

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
