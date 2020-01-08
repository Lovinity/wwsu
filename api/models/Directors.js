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

    assistant: {
      type: 'boolean',
      defaultsTo: false
    },

    avatar: {
      type: 'string',
      defaultsTo: ''
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

  // Websockets standards
  afterCreate: function (newlyCreatedRecord, proceed) {
    delete newlyCreatedRecord.login
    var data = { insert: newlyCreatedRecord }
    sails.log.silly(`directors socket: ${data}`)
    sails.sockets.broadcast('directors', 'directors', data)
    return proceed()
  },

  afterUpdate: function (updatedRecord, proceed) {
    delete updatedRecord.login;
    var data = { update: updatedRecord }
    sails.log.silly(`directors socket: ${data}`)
    sails.sockets.broadcast('directors', 'directors', data)

      // Update host data in calendar and calendarExceptions
      (async () => {
        let records = await sails.models.calendar7.find({ director: updatedRecord.ID });
        if (records.length > 0) {
          records.map(async (record) => {
            try {
              let hosts = await sails.helpers.calendar7.generateHosts(updatedRecord);
              await sails.models.calendar7.update({ ID: record.ID }, { hosts: hosts });
            } catch (e) {
            }
          });
        }
      })()

      (async () => {
        let records = await sails.models.calendarexceptions.find({ director: updatedRecord.ID });
        if (records.length > 0) {
          records.map(async (record) => {
            try {
              let hosts = await sails.helpers.calendar7.generateHosts(updatedRecord);
              await sails.models.calendarexceptions.update({ ID: record.ID }, { hosts: hosts });
            } catch (e) {
            }
          });
        }
      })()


    return proceed()
  },

  afterDestroy: function (destroyedRecord, proceed) {
    var data = { remove: destroyedRecord.ID }
    sails.log.silly(`directors socket: ${data}`)
    sails.sockets.broadcast('directors', 'directors', data)

      // Deactivate office hours events for this director. Update all other events using this director ID to null director.
      (async () => {
        let records = await sails.models.calendar7.find({ director: destroyedRecord.ID });
        if (records.length > 0) {
          let maps = records.map(async (record) => {
            try {
              if (record.type === 'office-hours') {
                await sails.models.calendar7.update({ ID: record.ID }, { active: false }).fetch();
              } else {
                record.director = null;
                let hosts = await sails.helpers.calendar7.generateHosts(record);
                await sails.models.calendar7.update({ ID: record.ID }, { hosts: hosts, director: null }).fetch();
              }
            } catch (e) {
            }
          });
          await Promise.all(maps);
        }

        let records = await sails.models.calendarexceptions.find({ director: destroyedRecord.ID });
        if (records.length > 0) {
          let maps = records.map(async (record) => {
            try {
              if (record.type === 'office-hours') {
                await sails.models.calendarexceptions.destroy({ ID: record.ID }).fetch();
              } else {
                record.director = null;
                let hosts = await sails.helpers.calendar7.generateHosts(record);
                await sails.models.calendarexceptions.update({ ID: record.ID }, { hosts: hosts, director: null }).fetch();
              }
            } catch (e) {
            }
          });
          await Promise.all(maps);
        }
      })()

    return proceed()
  }
}
