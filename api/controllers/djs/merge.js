const bcrypt = require("bcrypt");
const cryptoRandomString = require("crypto-random-string");

module.exports = {
  friendlyName: "djs / merge",

  description: "Merge one DJ into another DJ",

  inputs: {
    IDFrom: {
      type: "number",
      required: true,
      description:
        "The ID of the dj to merge from (the one that will be removed).",
    },
    IDTo: {
      type: "number",
      required: true,
      description:
        "The ID of the dj to merge into (the one which all IDFrom records will be changed to).",
    },
  },

  exits: {},

  fn: async function (inputs, exits) {
    sails.log.debug("Controller djs/merge called.");

    try {
      var djfrom = await sails.models.djs.findOne({ ID: inputs.IDFrom });
      var djto = await sails.models.djs.findOne({ ID: inputs.IDTo });
      if (!djfrom || !djto) {
        return exits.error(
          new Error("Either IDFrom or IDTo DJ does not exist.")
        );
      }
      var temp;
      var updatedRecords = {};

      // Update all XP records
      await sails.models.xp.update({ dj: djfrom.ID }, { dj: djto.ID }).fetch();

      // Update all attendance records
      await sails.models.attendance
        .update({ dj: djfrom.ID }, { dj: djto.ID })
        .fetch();
      await sails.models.attendance
        .update({ cohostDJ1: djfrom.ID }, { cohostDJ1: djto.ID })
        .fetch();
      await sails.models.attendance
        .update({ cohostDJ2: djfrom.ID }, { cohostDJ2: djto.ID })
        .fetch();
      await sails.models.attendance
        .update({ cohostDJ3: djfrom.ID }, { cohostDJ3: djto.ID })
        .fetch();

      // Update all calendar records
      temp = await sails.models.calendar
        .update({ hostDJ: djfrom.ID }, { hostDJ: djto.ID })
        .fetch();
      temp.map((tmp) => (updatedRecords[tmp.ID] = tmp));
      temp = await sails.models.calendar
        .update({ cohostDJ1: djfrom.ID }, { cohostDJ1: djto.ID })
        .fetch();
      temp.map((tmp) => (updatedRecords[tmp.ID] = tmp));
      temp = await sails.models.calendar
        .update({ cohostDJ2: djfrom.ID }, { cohostDJ2: djto.ID })
        .fetch();
      temp.map((tmp) => (updatedRecords[tmp.ID] = tmp));
      temp = await sails.models.calendar
        .update({ cohostDJ3: djfrom.ID }, { cohostDJ3: djto.ID })
        .fetch();
      temp.map((tmp) => (updatedRecords[tmp.ID] = tmp));

      // Regenerate hosts
      for (var cal in updatedRecords) {
        if (Object.prototype.hasOwnProperty.call(updatedRecords, cal)) {
          await sails.models.calendar
            .update(
              { ID: cal },
              {
                hosts: await sails.helpers.calendar.generateHosts(
                  updatedrecords[cal]
                ),
              }
            )
            .fetch();
        }
      }

      updatedRecords = {};

      // Update all calendar schedules
      temp = await sails.models.schedule
        .update({ hostDJ: djfrom.ID }, { hostDJ: djto.ID })
        .fetch();
      temp.map((tmp) => (updatedRecords[tmp.ID] = tmp));
      temp = await sails.models.schedule
        .update({ cohostDJ1: djfrom.ID }, { cohostDJ1: djto.ID })
        .fetch();
      temp.map((tmp) => (updatedRecords[tmp.ID] = tmp));
      temp = await sails.models.schedule
        .update({ cohostDJ2: djfrom.ID }, { cohostDJ2: djto.ID })
        .fetch();
      temp.map((tmp) => (updatedRecords[tmp.ID] = tmp));
      temp = await sails.models.schedule
        .update({ cohostDJ3: djfrom.ID }, { cohostDJ3: djto.ID })
        .fetch();
      temp.map((tmp) => (updatedRecords[tmp.ID] = tmp));

      // Regenerate hosts
      for (var cal in updatedRecords) {
        if (Object.prototype.hasOwnProperty.call(updatedRecords, cal)) {
          await sails.models.schedule
            .update(
              { ID: cal },
              {
                hosts: await sails.helpers.calendar.generateHosts(
                  updatedrecords[cal]
                ),
              }
            )
            .fetch();
        }
      }

      // Update lockToDJ in hosts
      await sails.models.hosts
        .update({ lockToDJ: djfrom.ID }, { lockToDJ: djto.ID })
        .fetch();

      // Edit meta if necessary
      if (sails.models.meta.memory.dj === djfrom.ID) {
        sails.helpers.meta.change.with({ dj: djto.ID });
      }
      if (sails.models.meta.memory.cohostDJ1 === djfrom.ID) {
        sails.helpers.meta.change.with({ cohostDJ1: djto.ID });
      }
      if (sails.models.meta.memory.cohostDJ2 === djfrom.ID) {
        sails.helpers.meta.change.with({ cohostDJ2: djto.ID });
      }
      if (sails.models.meta.memory.cohostDJ3 === djfrom.ID) {
        sails.helpers.meta.change.with({ cohostDJ3: djto.ID });
      }

      // Remove the original record
      await sails.models.djs.destroy({ ID: djfrom.ID }).fetch();

      // As a security measure, invalidate all tokens for DJs by changing the secret.
      sails.config.custom.secrets.dj = cryptoRandomString({ length: 256 });

      return exits.success();
    } catch (e) {
      return exits.error(e);
    }
  },
};
