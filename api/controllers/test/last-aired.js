module.exports = {
  friendlyName: "Last aired",

  description: "",

  inputs: {},

  exits: {},

  fn: async function(inputs) {
    let records = await sails.models.calendar.find();

    let maps = records.map(async record => {
      let attendance = await sails.models.attendance
        .find({ calendarID: record.ID })
        .sort("actualStart DESC")
        .limit(1);
      if (attendance && attendance[0])
        await sails.models.calendar.updateOne(
          { ID: record.ID },
          { lastAired: attendance[0].actualStart }
        );
    });

    await Promise.all(maps);

    return;
  }
};
