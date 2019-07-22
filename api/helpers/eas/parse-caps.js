module.exports = {

  friendlyName: `eas.parseCaps`,

  description: `Parse alert data received from a CAPS XML document.`,

  inputs: {
    county: {
      type: `string`,
      required: true,
      description: `The CAPS body applies to the specified county.`
    },
    body: {
      type: `ref`,
      required: true,
      description: `An object returned by the needle library containing the CAPS data.`
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug(`Helper eas.parseCaps called.`)
    try {
      var maps = inputs.body.children
        .filter(entry => typeof entry.name !== `undefined` && entry.name === `entry`)
        .map(async (entry, index) => {
          var alert = {}

          // Parse field information into the alert variable
          entry.children.map(entry2 => { alert[entry2.name] = entry2.value })

          // Skip any entries that do not have an ID or do not have a status of "Actual"; they're not real alerts.
          if (typeof alert[`id`] !== `undefined` && typeof alert[`cap:status`] !== `undefined` && alert[`cap:status`] === `Actual`) {
            // Skip expired alerts
            if (moment().isBefore(moment(alert[`cap:expires`]))) {
              sails.log.verbose(`Processing ${index}.`)
              var color = `#787878`
              if (alert[`cap:event`] in sails.config.custom.EAS.alerts) { // Is the alert in our array of alerts to alert for? Get its color if so.
                color = sails.config.custom.EAS.alerts[alert[`cap:event`]]
              } else { // If it is not in our array, then it is not an alert we should publish. Resolve to the next one.
                return false
              }

              // Pre-add the alert (this does NOT put it in the database nor push in websockets yet; that is done via sails.helpers.eas.postParse)
              await sails.helpers.eas.addAlert(alert[`id`], `NWS`, inputs.county, alert[`cap:event`], alert[`cap:severity`] !== `Unknown` ? alert[`cap:severity`] : `Minor`, moment(alert[`cap:effective`]).toISOString(true), moment(alert[`cap:expires`]).toISOString(true), color)

              // Mark this alert as active in the caps
              sails.models.eas.activeCAPS.push(alert[`id`])
            } else {
              sails.log.verbose(`Skipped ${index} because it is expired.`)
            }
          } else {
            sails.log.verbose(`Skipped ${index} because it was not a valid alert.`)
          }
          return true
        })
      await Promise.all(maps)

      return exits.success()
      // }
      // });
    } catch (e) {
      return exits.error(e)
    }
  }

}
