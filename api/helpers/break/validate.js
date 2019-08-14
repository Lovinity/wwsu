module.exports = {

  friendlyName: 'break.validate',

  description: 'Check for, and validate, an array of break tasks.',

  inputs: {
    tasks: {
      type: 'ref',
      required: true,
      description: 'The array of tasks to validate for.'
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Helper break.validate called.')

    try {
      // Reject non-arrays
      if (!_.isArray(inputs.tasks)) { return exits.success(false) }

      // Empty arrays are allowed
      if (inputs.tasks.length < 1) { return exits.success(true) }

      var rejectIt = false
      inputs.tasks.map((obj) => {
        // Every item in the array should be an object.
        if (typeof obj !== `object`) { rejectIt = true }

        // Every object should have a task property.
        if (typeof obj.task === `undefined`) { rejectIt = true }

        // Enforce required properties depending on the task
        switch (obj.task) {
          case 'log':
            if (typeof obj.event === `undefined`) { rejectIt = true }
            break
          case 'queue':
            if (typeof obj.category === `undefined`) { rejectIt = true }
            if (['noRules', 'lenientRules', 'strictRules'].indexOf(obj.rules) === -1) { rejectIt = true }
            break
            // No enforcements for these tasks
          case 'queueRequests':
          case 'queueDuplicates':
          case 'queueUnderwritings':
            break
            // If the task name is not satisfied by the switch, it is an invalid task.
          default:
            rejectIt = true
        }
      })

      return exits.success(!rejectIt)
    } catch (e) {
      return exits.error(e)
    }
  }

}
