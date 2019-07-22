module.exports = {

  friendlyName: 'config / radiodjs / set-rest',

  description: 'Change the password that every RadioDJ REST server is using.',

  inputs: {
    auth: {
      type: 'string',
      required: true,
      description: `The new REST auth password that should be used for all configured RadioDJs.`
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller config/radiodjs/set-rest called.')

    try {
      sails.config.custom.rest.auth = inputs.auth

      // Do not update rest auth password changes through websockets; it's a secret.

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
