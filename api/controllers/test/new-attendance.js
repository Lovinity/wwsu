module.exports = {

  friendlyName: `New attendance`,

  description: ``,

  inputs: {

  },

  fn: async function (inputs, exits) {
    try {
      await sails.models.attendance.createRecord(`Genre: Default`)
      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
