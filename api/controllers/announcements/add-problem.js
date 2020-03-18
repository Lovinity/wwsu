module.exports = {

  friendlyName: 'Announcements / Add-problem',

  description: 'Report a problem with WWSU.',

  inputs: {
    information: {
      type: 'string',
      required: true,
      description: 'Information about the problem.'
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller announcements/add-problem called.')

    try {
      // Add the reported issue to the database
      await sails.models.announcements.create({ type: `djcontrols`, level: `danger`, title: `Reported Problem`, announcement: inputs.information, starts: DateTime.local().toISO(), expires: DateTime.fromObject({year: 3000}).toISO() }).fetch()

      // Push notification
      await sails.helpers.onesignal.sendMass('emergencies', 'Reported Technical Issue', inputs.information)

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
