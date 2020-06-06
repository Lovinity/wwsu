module.exports = {

  friendlyName: 'Status / Report',

  description: 'Report a problem with WWSU.',

  inputs: {
    location: {
      type: 'string',
      required: true,
      description: 'Where the problem was reported from.'
    },
    information: {
      type: 'string',
      required: true,
      description: 'Information about the problem.'
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller announcements/add-problem called.')

    try {

      // sanitize
      if (inputs.location !== '') {
        inputs.location = await sails.helpers.sanitize(inputs.location)
        inputs.location = await sails.helpers.truncateText(inputs.location, 64)
      }
      if (inputs.information !== '') {
        inputs.information = await sails.helpers.sanitize(inputs.information)
        inputs.information = await sails.helpers.truncateText(inputs.information, 1024)
      }

      // Add the reported issue to the logs
      await sails.models.logs.create({ attendanceID: sails.models.meta.memory.attendanceID, logtype: 'status-reported', loglevel: 'orange', logsubtype: sails.models.meta.memory.show, logIcon: `fas fa-bug`, title: `A problem was reported from ${inputs.location}`, event: inputs.information }).fetch();

      // Push notification
      await sails.helpers.onesignal.sendMass('emergencies', `Reported Problem from ${inputs.location}`, await sails.helpers.truncateText(inputs.information, 256))

      // Email
      await sails.helpers.emails.queueEmergencies(
        `A problem was reported from host ${inputs.location}`,
        `Directors,<br /><br />

A problem was reported from the <strong>${inputs.location}</strong> host. Please investigate and fix ASAP.<br /><br />

Additional information: ${inputs.information}<br /><br />

When this problem has been resolved, please mark it off in DJ Controls under the "To-Do" administration menu item.`,
        true
      );

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
