module.exports = {

  friendlyName: 'break.validate',

  description: 'Check for, and validate, an array of break tasks.',

  inputs: {
    tasks: {
      type: 'ref',
      required: true,
      custom: (value) => _.isArray(value),
      description: 'The array of tasks to filter null values for.'
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Helper break.validate called.')

    try {
      var newArray = []
      if (inputs.tasks.length > 0) {
        inputs.tasks
          .filter((task) => task !== null)
          .map((task, index) => { newArray.push(task) })
      }

      return exits.success(newArray)
    } catch (e) {
      return exits.error(e)
    }
  }

}
