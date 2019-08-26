module.exports = {

  friendlyName: 'status.change',

  description: 'Change the status of something',

  inputs: {
    name: {
      type: 'string',
      required: true,
      description: 'The unique alphanumeric name of the status system to change.'
    },
    label: {
      type: 'string',
      description: 'The human readable label for this system.'
    },
    status: {
      type: 'number',
      required: true,
      min: 1,
      max: 5,
      description: 'The status which to change the system. 1 = critical, 2 = major, 3 = minor, 4 = offline, 5 = good.'
    },
    data: {
      type: 'string',
      defaultsTo: '',
      description: 'Any additional information regarding this system, such as instructions to fix the issue.'
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug(`helper sails.helpers.status.change called.`)
    try {
      var criteriaB
      var criteria = { name: inputs.name, status: inputs.status, data: inputs.data || '', label: inputs.label || inputs.name }
      if (status.status === 5) { criteria.time = moment().toISOString(true) }

      // We must clone the InitialValues object due to how Sails.js manipulates any objects passed as InitialValues.
      criteriaB = _.cloneDeep(criteria)

      // Find or create the status record
      var record = await sails.models.status.findOrCreate({ name: status.name }, criteriaB)
        .tolerate(() => {
          return true
        })

      // Search to see if any changes are made to the status; we only want to update if there is a change.
      var updateIt = false
      for (var key in criteria) {
        if (Object.prototype.hasOwnProperty.call(criteria, key)) {
          if (criteria[key] !== record[key]) {
            // We don't want to fetch() on time-only updates; this will flood websockets
            if (!updateIt && key === 'time') {
              updateIt = 2
            } else {
              updateIt = 1
            }
          }
        }
      }
      if (updateIt === 1 && typeof criteria.status !== 'undefined' && criteria.status <= 3 && (!record.status || (record.status !== criteria.status))) {
        var loglevel = `warning`
        if (criteria.status < 2) {
          loglevel = `danger`
        } else if (criteria.status < 3) {
          loglevel = `urgent`
        }

        // Log changes in status
        await sails.models.logs.create({ attendanceID: sails.models.meta.memory.attendanceID, logtype: 'status', loglevel: loglevel, logsubtype: sails.models.meta.memory.show, event: `<strong>${criteria.label || record.label || criteria.name || record.name || `Unknown System`}</strong>:<br />${criteria.data ? criteria.data : `Unknown Issue`}` }).fetch()
          .tolerate((err) => {
            // Don't throw errors, but log them
            sails.log.error(err)
          })
      }
      if (updateIt === 1 && record.status && criteria.status && record.status <= 3 && criteria.status > 3) {
        // Log when bad statuses are now good.
        await sails.models.logs.create({ attendanceID: sails.models.meta.memory.attendanceID, logtype: 'status', loglevel: 'success', logsubtype: sails.models.meta.memory.show, event: `<strong>${criteria.label || record.label || criteria.name || record.name || `Unknown System`}</strong>:<br />Now Operational.` }).fetch()
          .tolerate((err) => {
            // Don't throw errors, but log them
            sails.log.error(err)
          })
      }
      if (updateIt === 1) {
        // We must clone the InitialValues object due to how Sails.js manipulates any objects passed as InitialValues.
        criteriaB = _.cloneDeep(criteria)
        sails.log.verbose(`Updating status ${status.name} and pushing to sockets via fetch.`)
        await sails.models.status.update({ name: status.name }, criteriaB)
          .tolerate((err) => {
            throw err
          })
          .fetch()
      } else if (updateIt === 2) {
        // We must clone the InitialValues object due to how Sails.js manipulates any objects passed as InitialValues.
        criteriaB = _.cloneDeep(criteria)
        sails.log.verbose(`Updating status ${status.name} without using fetch / pushing to sockets.`)
        await sails.models.status.update({ name: status.name }, criteriaB)
          .tolerate((err) => {
            throw err
          })
      }
      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
