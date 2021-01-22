module.exports = {
  friendlyName: "Calendar",

  description: "Calendar test.",

  inputs: {},

  fn: async function (inputs) {
    let schedules = await sails.models.schedule.find({ scheduleType: null });

    if (schedules && schedules.length > 0) {
      let maps = schedules.map(async (schedule) => {
        let endTime = moment(
          schedule.endDate || schedule.startDate || "2002-01-01T00:00:00Z"
        ).add(1, "days");

        if (schedule.oneTime && schedule.oneTime.length > 0) {
          schedule.oneTime.map((ot) => {
            if (moment(ot).isAfter(moment(endTime))) {
              endTime = moment(ot).add(1, "days");
            }
          });
        }

        if (
          moment(sails.config.custom.startOfSemester).isAfter(moment(endTime))
        ) {
          await sails.models.schedule.destroy({ ID: schedule.ID }).fetch();

          let overrides = await sails.models.schedule.find({
            or: [{ scheduleID: schedule.ID }, { overriddenID: schedule.ID }],
          });
          let maps2 = overrides.map(async (override) => {
            await sails.models.schedule.destroy({ ID: override.ID }).fetch();
          });
          await Promise.all(maps2);
        }
      });
      await Promise.all(maps);
    }
  },
};
