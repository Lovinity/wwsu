module.exports = {

  friendlyName: `Execute array`,

  description: ``,

  inputs: {
    array: {
      type: `ref`,
      required: true,
      description: `An array of break task objects to execute. The order will be reversed.`
    }
  },

  exits: {
  },

  fn: async function (inputs, exits) {
    try {
      // Empty array? No need to continue.
      if (inputs.array.length <= 0) { return exits.success() }

      // Get the configured break tasks, but clone it. We're going to reverse the order, so we don't want to reverse the original object.
      var breakOpts = _.cloneDeep(inputs.array)

      // Reverse the order of execution so queued things are in the same order as configured.
      breakOpts.reverse()

      // Go through each task
      if (breakOpts.length > 0) {
        var asyncLoop = async function (array, callback) {
          for (let index = 0; index < array.length; index++) {
            // LINT: Callback is executed on every item in the array; do NOT return.
            // eslint-disable-next-line callback-return
            await callback(array[index], index, array)
          }
        }

        await asyncLoop(breakOpts, async (task) => {
          await sails.helpers.break.execute(task.task, task.event, task.category, task.quantity, task.rules)
        })
      }

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
