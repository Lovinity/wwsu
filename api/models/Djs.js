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

    realName: {
      type: 'string',
      required: true,
    },

    email: {
      type: 'string',
      required: true,
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
    var records;
    var hosts;
    var temp;
    var temp2;

      // Update host data in calendar events
      temp = (async () => {
        records = await sails.models.calendar.find({
          or: [
            { hostDJ: updatedRecord.ID },
            { cohostDJ1: updatedRecord.ID },
            { cohostDJ2: updatedRecord.ID },
            { cohostDJ3: updatedRecord.ID },
          ],
          active: true
        });
        if (records.length > 0) {
          records.map(async (record) => {
            try {
              hosts = await sails.helpers.calendar.generateHosts(record);
              await sails.models.calendar.update({ ID: record.ID }, { hosts: hosts }).fetch();
            } catch (e) {
            }
          });
        }
      })()
      temp2 = (async () => {
        records = await sails.models.schedule.find({
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
              hosts = await sails.helpers.calendar.generateHosts(record);
              await sails.models.schedule.update({ ID: record.ID }, { hosts: hosts }).fetch();
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
    var records;
    var hosts;
    var maps;
    var toUpdate;
    var temp;

      // Update DJ data in calendar events
      temp = (async () => {
        records = await sails.models.calendar.find({
          or: [
            { hostDJ: destroyedRecord.ID },
            { cohostDJ1: destroyedRecord.ID },
            { cohostDJ2: destroyedRecord.ID },
            { cohostDJ3: destroyedRecord.ID },
          ],
          active: true
        });
        if (records.length > 0) {
          maps = records.map(async (record) => {
            try {
              toUpdate = {};
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

              toUpdate.hosts = await sails.helpers.calendar.generateHosts(record);
              await sails.models.calendar.update({ ID: record.ID }, toUpdate).fetch();
            } catch (e) {
            }
          });
          await Promise.all(maps);
        }

        records = await sails.models.schedule.find({
          or: [
            { hostDJ: destroyedRecord.ID },
            { cohostDJ1: destroyedRecord.ID },
            { cohostDJ2: destroyedRecord.ID },
            { cohostDJ3: destroyedRecord.ID },
          ]
        });
        if (records.length > 0) {
          maps = records.map(async (record) => {
            try {
              toUpdate = {};
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

              toUpdate.hosts = await sails.helpers.calendar.generateHosts(record);
              await sails.models.schedule.update({ ID: record.ID }, toUpdate).fetch();
            } catch (e) {
            }
          });
          await Promise.all(maps);
        }

        // Deactivate any main calendar events that now have no host DJ
        await sails.models.calendar.update({ type: [ 'show', 'remote', 'prerecord' ], hostDJ: null }, { active: false }).fetch();

        // Update attendance records
        await sails.models.attendance.update({ dj: inputs.ID }, { dj: null }).fetch()
        await sails.models.attendance.update({ cohostDJ1: inputs.ID }, { cohostDJ1: null }).fetch()
        await sails.models.attendance.update({ cohostDJ2: inputs.ID }, { cohostDJ2: null }).fetch()
        await sails.models.attendance.update({ cohostDJ3: inputs.ID }, { cohostDJ3: null }).fetch()

        // Update lockToDJ in hosts to 0, which means the host cannot start any broadcasts at all
        await sails.models.hosts.update({ lockToDJ: inputs.ID }, { lockToDJ: 0 }).fetch()

        // Destroy XP records
        await sails.models.xp.destroy({ dj: inputs.ID }).fetch()

        // Edit meta if necessary
        if (sails.models.meta.memory.dj === inputs.ID) { await sails.helpers.meta.change.with({ dj: null }) }
        if (sails.models.meta.memory.cohostDJ1 === inputs.ID) { await sails.helpers.meta.change.with({ cohostDJ1: null }) }
        if (sails.models.meta.memory.cohostDJ2 === inputs.ID) { await sails.helpers.meta.change.with({ cohostDJ2: null }) }
        if (sails.models.meta.memory.cohostDJ3 === inputs.ID) { await sails.helpers.meta.change.with({ cohostDJ3: null }) }
      })()
    return proceed()
  }

}
