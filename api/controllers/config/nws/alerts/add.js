module.exports = {

  friendlyName: `config / nws / alerts / add`,

  description: `Add or update an NWS alert that should be triggered in the EAS.`,

  inputs: {
    alert: {
      type: `string`,
      required: true,
      description: `The name of the alert as provided by the NWS, case sensitive. Example: "Tornado Warning".`
    },
    color: {
      type: `string`,
      isHexColor: true,
      required: true,
      description: `A hexadecimal color that should be used, especially on the display signs, to visually indicate this alert. It is advised to use the same colors that the NWS uses.`
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug(`Controller config/nws/alerts/add called.`)

    try {
      sails.config.custom.EAS.alerts[inputs.alert] = inputs.color

      // broadcast changes over websockets
      sails.sockets.broadcast(`config`, `config`, { update: { EAS: sails.config.custom.EAS } })

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
