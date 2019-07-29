/**
 * Directors.js
 *
 * @description :: A model containing all of the station directors.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  // This model is only a container for temporary data. It should not persist. Use memory instead of SQL.
  datastore: 'timesheets',
  attributes: {
    ID: {
      type: 'number',
      autoIncrement: true
    },

    name: {
      type: 'string',
      required: true,
      unique: true
    },

    login: {
      type: 'string',
      required: true
    },

    admin: {
      type: 'boolean',
      defaultsTo: false
    },

    avatar: { // HTML path relative to assets/images/avatars/
      type: 'string',
      allowNull: true
    },

    position: {
      type: 'string',
      defaultsTo: 'Unknown'
    },

    present: {
      type: 'boolean',
      defaultsTo: false
    },

    since: {
      type: 'ref',
      columnType: 'datetime'
    }
  },

  /**
     * Re-updates director presence
     */
  updateDirectors: function () {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve) => {
      sails.log.debug(`updateDirectors called.`)
      var names = {}

      // Determine presence by analyzing timesheet records up to 14 days ago
      var records = await sails.models.uabtimesheet.find({
        where: {
          or: [
            { time_out: { '>=': moment().subtract(14, 'days').toDate() } },
            { time_out: null }
          ]
        },
        sort: 'time_in DESC' })
      if (records.length > 0) {
        // Update present and since entries in the Directors database
        var maps = records
          .map(async record => {
            if (typeof names[record.name] !== 'undefined') { return false }

            names[record.name] = true
            // If there's an entry with a null time_out, then consider the director clocked in
            if (record.time_out === null && record.time_in !== null) {
              await sails.models.uabdirectors.update({ name: record.name }, { present: true, since: moment(record.time_in).toISOString(true) })
                .tolerate(() => {
                })
                .fetch()
            } else {
              await sails.models.uabdirectors.update({ name: record.name }, { present: false, since: moment(record.time_out).toISOString(true) })
                .tolerate(() => {
                })
                .fetch()
            }
            return true
          })
        await Promise.all(maps)
      }
      return resolve()
    })
  },

  // Websockets standards
  afterCreate: function (newlyCreatedRecord, proceed) {
    delete newlyCreatedRecord.login
    var data = { insert: newlyCreatedRecord }
    sails.log.silly(`uabdirectors socket: ${data}`)
    sails.sockets.broadcast('uabdirectors', 'uabdirectors', data)
    return proceed()
  },

  afterUpdate: function (updatedRecord, proceed) {
    delete updatedRecord.login
    var data = { update: updatedRecord }
    sails.log.silly(`uabdirectors socket: ${data}`)
    sails.sockets.broadcast('uabdirectors', 'uabdirectors', data)
    return proceed()
  },

  afterDestroy: function (destroyedRecord, proceed) {
    var data = { remove: destroyedRecord.ID }
    sails.log.silly(`uabdirectors socket: ${data}`)
    sails.sockets.broadcast('uabdirectors', 'uabdirectors', data)
    return proceed()
  }
}
