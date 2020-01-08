/**
 * Djs.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  datastore: 'nodebase',
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
      allowNull: true
    },

    lastSeen: {
      type: 'ref',
      columnType: 'datetime'
    }

  },

  // Websockets standards
  afterCreate: function (newlyCreatedRecord, proceed) {
    newlyCreatedRecord.login = newlyCreatedRecord.login === null ? false : true
    var data = { insert: newlyCreatedRecord }
    sails.log.silly(`djs socket: ${data}`)
    sails.sockets.broadcast('djs', 'djs', data)
    return proceed()
  },

  afterUpdate: function (updatedRecord, proceed) {
    updatedRecord.login = updatedRecord.login === null ? false : true
    var data = { update: updatedRecord }
    sails.log.silly(`djs socket: ${data}`)
    sails.sockets.broadcast('djs', 'djs', data)

      // Update host data in calendar events
      (async () => {
        var records = await sails.models.calendar7.find({
          or: [
            { hostDJ: updatedRecord.ID },
            { cohostDJ1: updatedRecord.ID },
            { cohostDJ2: updatedRecord.ID },
            { cohostDJ3: updatedRecord.ID },
          ]
        });
        if (records.length > 0) {
          records.map(async (record) => {
            try {
              var hosts = await sails.helpers.calendar7.generateHosts(updatedRecord);
              await sails.models.calendar7.update({ ID: record.ID }, { hosts: hosts }).fetch();
            } catch (e) {
            }
          });
        }
      })()
      (async () => {
        var records = await sails.models.calendarexceptions.find({
          or: [
            { hostDJ: updatedRecord.ID },
            { cohostDJ1: updatedRecord.ID },
            { cohostDJ2: updatedRecord.ID },
            { cohostDJ3: updatedRecord.ID },
          ]
        });
        if (records.length > 0) {
          records.map(async (record) => {
            try {
              var hosts = await sails.helpers.calendar7.generateHosts(updatedRecord);
              await sails.models.calendarexceptions.update({ ID: record.ID }, { hosts: hosts }).fetch();
            } catch (e) {
            }
          });
        }
      })()

    return proceed()
  },

  afterDestroy: function (destroyedRecord, proceed) {
    var data = { remove: destroyedRecord.ID }
    sails.log.silly(`djs socket: ${data}`)
    sails.sockets.broadcast('djs', 'djs', data)

      // Update DJ data in calendar events
      (async () => {
        let records = await sails.models.calendar7.find({
          or: [
            { hostDJ: destroyedRecord.ID },
            { cohostDJ1: destroyedRecord.ID },
            { cohostDJ2: destroyedRecord.ID },
            { cohostDJ3: destroyedRecord.ID },
          ]
        });
        if (records.length > 0) {
          let maps = records.map(async (record) => {
            try {
              let toUpdate = {};
              if (record.hostDJ === destroyedRecord.ID) {
                toUpdate.hostDJ = null;
                record.hostDJ = null;
              }
              if (record.cohostDJ1 === destroyedRecord.ID) {
                toUpdate.cohostDJ1 = null;
                record.cohostDJ1 = null;
              }
              if (record.cohostDJ2 === destroyedRecord.ID) {
                toUpdate.cohostDJ2 = null;
                record.cohostDJ2 = null;
              }
              if (record.cohostDJ3 === destroyedRecord.ID) {
                toUpdate.cohostDJ3 = null;
                record.cohostDJ3 = null;
              }

              toUpdate.hosts = await sails.helpers.calendar7.generateHosts(record);
              await sails.models.calendar7.update({ ID: record.ID }, toUpdate).fetch();
            } catch (e) {
            }
          });
          await Promise.all(maps);
        }

        let records = await sails.models.calendarexceptions.find({
          or: [
            { hostDJ: destroyedRecord.ID },
            { cohostDJ1: destroyedRecord.ID },
            { cohostDJ2: destroyedRecord.ID },
            { cohostDJ3: destroyedRecord.ID },
          ]
        });
        if (records.length > 0) {
          let maps = records.map(async (record) => {
            try {
              let toUpdate = {};
              if (record.hostDJ === destroyedRecord.ID) {
                toUpdate.hostDJ = null;
                record.hostDJ = null;
              }
              if (record.cohostDJ1 === destroyedRecord.ID) {
                toUpdate.cohostDJ1 = null;
                record.cohostDJ1 = null;
              }
              if (record.cohostDJ2 === destroyedRecord.ID) {
                toUpdate.cohostDJ2 = null;
                record.cohostDJ2 = null;
              }
              if (record.cohostDJ3 === destroyedRecord.ID) {
                toUpdate.cohostDJ3 = null;
                record.cohostDJ3 = null;
              }

              toUpdate.hosts = await sails.helpers.calendar7.generateHosts(record);
              await sails.models.calendarexceptions.update({ ID: record.ID }, toUpdate).fetch();
            } catch (e) {
            }
          });
          await Promise.all(maps);
        }

        // Deactivate any main calendar events that now have no host DJ
        await sails.models.calendar7.update({ type: [ 'show', 'remote', 'prerecord' ], hostDJ: null }, { active: false }).fetch();
      })()
    return proceed()
  }

}
