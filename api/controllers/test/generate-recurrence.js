module.exports = {
  friendlyName: "Generate recurrence",

  description: "Generate recurrence test.",

  inputs: {},

  exits: {},

  fn: async function (inputs, exits) {
    var records = await sails.models.schedules.find();

    var maps = records.map(async (record) => {
      var criteria = { startTime: null, recurrenceRules: null };

      if (record.recurH && record.recurH[0]) {
        criteria.recurrenceRules = [];

        if (record.recurH[0] < 10) record.recurH[0] = `0${record.recurH[0]}`;
        if (!record.recurM || !record.recurM[0]) record.recurM = [0];
        if (record.recurM[0] < 10) record.recurM[0] = `0${record.recurM[0]}`;

        criteria.startTime = `${record.recurH[0]}:${record.recurM[0]}`;

        if (record.recurDM && record.recurDM.length > 0) {
          criteria.recurrenceRules.push({
            measure: "daysOfMonth",
            units: record.recurDM,
          });
        }

        if (record.recurWM && record.recurWM.length > 0) {
          record.recurWM = record.recurWM.map((recur) => {
            recur -= 1;
            if (recur < 0) {
              recur = 5;
              if (!record.recurDW || record.recurDW.length === 0) {
                record.recurDW = [0, 1, 2, 3, 4, 5, 6];
              }
            }
            return recur;
          });
          criteria.recurrenceRules.push({
            measure:
              record.recurWM && record.recurWM.length > 0
                ? "weeksOfMonthByDay"
                : "weeksOfMonth",
            units: record.recurWM,
          });
        }

        if (record.recurDW && record.recurDW.length > 0) {
          criteria.recurrenceRules.push({
            measure: "daysOfWeek",
            units: record.recurDW,
          });
        }

        var _criteria = _.cloneDeep(criteria);

        await sails.models.schedule.update({ID: record.ID}, _criteria);
      }
    });

    await Promise.all(maps);
  },
};
