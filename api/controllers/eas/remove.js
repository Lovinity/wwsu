module.exports = {

    friendlyName: 'eas / remove',
  
    description: 'Remove an EAS alert',
  
    inputs: {
      ID: {
        type: 'number',
        required: true,
        description: 'The ID of the EAS to remove.'
      }
    },
  
    exits: {
    },
  
    fn: async function (inputs, exits) {
      sails.log.debug('Controller eas/remove called.')
  
      try {
        await sails.models.eas.destroyOne({ID: inputs.ID});
  
        // All done.
        return exits.success()
      } catch (e) {
        return sails.error(e)
      }
    }
  
  }
  