module.exports = {

  friendlyName: 'eas.postParse',

  description: 'Finalize and push out new/updated alerts.',

  inputs: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Helper eas.postParse called.')

    try {
      var sendit = []

      // Process sails.models.eas.pendingAlerts
      for (var key in sails.models.eas.pendingAlerts) {
        if (Object.prototype.hasOwnProperty.call(sails.models.eas.pendingAlerts, key)) {
          sails.log.verbose(`Processing EAS`, sails.models.eas.pendingAlerts[key])

          // Do not process alerts containing no information
          if (sails.models.eas.pendingAlerts[key].information === '' || sails.models.eas.pendingAlerts[key].information === null) {
            delete sails.models.eas.pendingAlerts[key]
            continue
          }

          // New alerts should be created
          if (sails.models.eas.pendingAlerts[key]._new) {
            delete sails.models.eas.pendingAlerts[key]._new
            await sails.models.eas.create(sails.models.eas.pendingAlerts[key]).fetch()
            delete sails.models.eas.pendingAlerts[key]

            // Non-new alerts should be updated
          } else {
            delete sails.models.eas.pendingAlerts[key]._new
            await sails.models.eas.update({ source: sails.models.eas.pendingAlerts[key].source, reference: sails.models.eas.pendingAlerts[key].reference }, sails.models.eas.pendingAlerts[key]).fetch()
            delete sails.models.eas.pendingAlerts[key]
          }
        }
      }

      // Get all active alerts from the database.
      var records = await sails.models.eas.find()
      sails.log.verbose(`sails.models.eas records retrieved: ${records.length}`)
      sails.log.silly(records)

      var maps = records.map(async record => {
        // Trigger a non-fetched update of all NWS records still active so that the updatedAt is updated, and therefore the record isn't removed.
        if (record.source === 'NWS' && sails.models.eas.activeCAPS.indexOf(record.reference) !== -1) {
          await sails.models.eas.update({ ID: record.ID }, { updatedAt: moment().toISOString(true) })
            .tolerate((err) => {
              sails.log.error(err)
            })
          return true
        }

        // Remove expired alerts. Also, NWS alerts not reported by CAPS in 5 or more minutes (via updatedAt checking) should also be considered expired or canceled.
        if ((record.source === 'NWS' && moment().isAfter(moment(record.updatedAt).add(5, 'minutes'))) || moment().isAfter(moment(record.expires))) {
          sails.log.verbose(`Record ${record.ID} is to be deleted. It has expired.`)
          await sails.models.eas.destroy({ ID: record.ID }).fetch()
            .tolerate((err) => {
              sails.log.error(err)
            })
          return true
        }

        return true
      })
      await Promise.all(maps)

      return exits.success(sendit)
    } catch (e) {
      return exits.error(e)
    }
  }

}
