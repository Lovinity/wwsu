module.exports = {

  friendlyName: 'EAS / Send',

  description: 'Send an alert through the Emergency Alert System as WWSU.',

  inputs: {
    counties: {
      type: 'string',
      required: true,
      description: 'This alert applies to this comma-delimited list of counties.'
    },

    alert: {
      type: 'string',
      required: true,
      description: 'Title of the alert'
    },

    severity: {
      type: 'string',
      required: true,
      isIn: ['Extreme', 'Severe', 'Moderate', 'Minor'],
      description: `Severity of alert: One of the following in order from highest to lowest ['Extreme', 'Severe', 'Moderate', 'Minor']`
    },

    starts: {
      type: 'string',
      custom: function (value) {
        return DateTime.fromISO(value).isValid
      },
      allowNull: true,
      description: `ISO string of when the alert starts.`
    },

    expires: {
      type: 'string',
      custom: function (value) {
        return DateTime.fromISO(value).isValid
      },
      allowNull: true,
      description: `ISO string of when the alert expires.`
    },

    color: {
      type: 'string',
      regex: /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i,
      description: 'Hex color representing this alert.',
      required: true
    },

    information: {
      type: 'string',
      required: true,
      description: 'Detailed information about this alert for the public.'
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller eas/send called.')
    sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`)
    try {
      // Add the alert to EAS
      await sails.helpers.eas.addAlert(DateTime.local().valueOf(), 'WWSU', inputs.counties, inputs.alert, inputs.severity, inputs.starts !== null && typeof inputs.starts !== 'undefined' ? inputs.starts : DateTime.local().toISO(), inputs.expires !== null && typeof inputs.expires !== 'undefined' ? inputs.expires : DateTime.local().plus({hours: 1}).toISO(), inputs.color, inputs.information)

      // Process post tasks (this is what actually pushes the new alert out)
      await sails.helpers.eas.postParse()

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
