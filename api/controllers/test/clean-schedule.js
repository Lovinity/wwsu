module.exports = {
  friendlyName: "Calendar",

  description: "Calendar test.",

  inputs: {},

  fn: async function (inputs) {
    let toBeRemoved = [];

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
          toBeRemoved.push(schedule);
          let overrides = await sails.models.schedule.find({
            or: [{ scheduleID: schedule.ID }, { overriddenID: schedule.ID }],
          });
          overrides.map((override) => {
            toBeRemoved.push(override);
          });
        }
      });
      await Promise.all(maps);
    }

    return toBeRemoved;
  },
};
