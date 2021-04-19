module.exports = {
  friendlyName: "Archive",

  description: "Archive test.",

  inputs: {},

  exits: {},

  fn: async function (inputs) {
    await sails.models.attendance.archive({
      createdAt: { "<": moment().subtract(2, "years").toISOString(true) },
    });
    await sails.models.calendar.archive({
      updatedAt: {
        "<": moment().subtract(2, "years").toISOString(true),
      },
      active: false,
    });
    await sails.models.emails.archive({
      createdAt: { "<": moment().subtract(2, "years").toISOString(true) },
    });
    await sails.models.history.archive({
      createdAt: { "<": moment().subtract(2, "years").toISOString(true) },
    });
    await sails.models.listeners.archive({
      createdAt: { "<": moment().subtract(2, "years").toISOString(true) },
    });
    await sails.models.logs.archive({
      createdAt: { "<": moment().subtract(2, "years").toISOString(true) },
    });
    await sails.models.messages.archive({
      createdAt: { "<": moment().subtract(2, "years").toISOString(true) },
    });
    await sails.models.requests.archive({
      createdAt: { "<": moment().subtract(2, "years").toISOString(true) },
    });
    await sails.models.timesheet.archive({
      createdAt: { "<": moment().subtract(2, "years").toISOString(true) },
    });
    await sails.models.uabtimesheet.archive({
      createdAt: { "<": moment().subtract(2, "years").toISOString(true) },
    });

    // All done.
    return;
  },
};
