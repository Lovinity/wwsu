module.exports = {

  friendlyName: 'underwritings / remove',

  description: 'Remove an underwriting from the system.',

  inputs: {
    ID: {
      type: 'number',
      required: true,
      description: 'The ID of the underwriting entry to remove.'
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller underwritings/remove called.')

    try {
      // Remove underwritings record
      await sails.models.underwritings.destroy({ ID: inputs.ID }).fetch()

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
