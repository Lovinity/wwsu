module.exports = {

  friendlyName: 'New attendance',

  description: '',

  inputs: {

  },

  fn: async function (inputs, exits) {
    try {
      await sails.helpers.attendance.createRecord(null)
      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
