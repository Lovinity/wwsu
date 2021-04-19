module.exports = {
  friendlyName: "Archive",

  description: "Archive test.",

  inputs: {},

  exits: {},

  fn: async function (inputs) {
    await sails.models.attendance.destroy({
      createdAt: { "<": moment().subtract(2, "years").toISOString(true) },
    });
    await sails.models.calendar.destroy({
      updatedAt: {
        "<": moment().subtract(2, "years").toISOString(true),
      },
      active: false,
    });
    await sails.models.emails.destroy({
      createdAt: { "<": moment().subtract(2, "years").toISOString(true) },
    });
    await sails.models.history.destroy({
      createdAt: { "<": moment().subtract(2, "years").toISOString(true) },
    });
    await sails.models.listeners.destroy({
      createdAt: { "<": moment().subtract(2, "years").toISOString(true) },
    });
    await sails.models.logs.destroy({
      createdAt: { "<": moment().subtract(2, "years").toISOString(true) },
    });
    await sails.models.messages.destroy({
      createdAt: { "<": moment().subtract(2, "years").toISOString(true) },
    });
    await sails.models.requests.destroy({
      createdAt: { "<": moment().subtract(2, "years").toISOString(true) },
    });
    await sails.models.timesheet.destroy({
      createdAt: { "<": moment().subtract(2, "years").toISOString(true) },
    });
    await sails.models.uabtimesheet.destroy({
      createdAt: { "<": moment().subtract(2, "years").toISOString(true) },
    });

    // All done.
    return;
  },
};
