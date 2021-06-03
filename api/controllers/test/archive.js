module.exports = {
  friendlyName: "Archive",

  description: "Archive test.",

  inputs: {},

  exits: {},

  fn: async function (inputs) {
    let cleanedUp = ``;
    let records;
    // Delete announcements that expired over a month ago
    records = await sails.models.announcements
      .destroy({
        expires: {
          "<": moment().subtract(1, "months").toISOString(true),
        },
      })
      .fetch();
    if (records.length > 0)
      cleanedUp += `<li>Announcements deleted (expired over 1 months ago): ${records
        .map((record) => record.title)
        .join()}</li>`;

    // Delete attendance records older than 2 years
    records = await sails.models.attendance
      .destroy({
        createdAt: {
          "<": moment().subtract(2, "years").toISOString(true),
        },
      })
      .fetch();
    if (records.length > 0)
      cleanedUp += `<li>Number of attendance records deleted (over 2 years old): ${records.length}</li>`;

    // Mark calendar events pertaining to onair programming (except sports) inactive if they did not air for over 4 months
    records = await sails.models.calendar
      .update(
        {
          type: ["show", "remote", "prerecord", "genre", "playlist"],
          lastAired: {
            "<": moment().subtract(4, "months").toISOString(true),
          },
          active: true,
        },
        { active: false }
      )
      .fetch();
    if (records.length > 0)
      cleanedUp += `<li>Calendar events marked inactive (did not air in the last 4 months): ${records
        .map((record) => `${record.type}: ${record.hosts} - ${record.name}`)
        .join()}</li>`;

    // Delete calendar events that did not air for over a year and are marked inactive
    records = await sails.models.calendar
      .destroy({
        lastAired: {
          "<": moment().subtract(1, "years").toISOString(true),
        },
        active: false,
      })
      .fetch();
    if (records.length > 0)
      cleanedUp += `<li>Calendar events deleted (inactive and did not air over a year): ${records
        .map((record) => `${record.type}: ${record.hosts} - ${record.name}`)
        .join()}</li>`;

    // Mark DJs inactive who have not been on the air for the last 4 months.
    records = await sails.models.djs
      .update(
        {
          lastSeen: {
            "<": moment().subtract(4, "months").toISOString(true),
          },
          active: true,
        },
        { active: false }
      )
      .fetch();
    if (records.length > 0)
      cleanedUp += `<li>DJs marked inactive (did not air any shows in the last 4 months): ${records
        .map((record) => `${record.name} (${record.realName})`)
        .join()}</li>`;

    // Delete inactive DJs who did not air any shows for over a year
    records = await sails.models.djs
      .destroy({
        lastSeen: {
          "<": moment().subtract(1, "years").toISOString(true),
        },
        active: false,
      })
      .fetch();
    if (records.length > 0)
      cleanedUp += `<li>Inactive DJs deleted (did not air any shows in the last year): ${records
        .map((record) => `${record.name} (${record.realName})`)
        .join()}</li>`;

    // Clean up old email records from over 2 years ago
    records = await sails.models.emails
      .destroy({
        createdAt: {
          "<": moment().subtract(2, "years").toISOString(true),
        },
      })
      .fetch();
    if (records.length > 0)
      cleanedUp += `<li>Number of email records deleted (over 2 years old): ${records.length}</li>`;

    // Delete RadioDJ history records older than 2 years
    records = await sails.models.history
      .destroy({
        createdAt: {
          "<": moment().subtract(2, "years").toISOString(true),
        },
      })
      .fetch();
    if (records.length > 0)
      cleanedUp += `<li>Number of RadioDJ track history records deleted (over 2 years old): ${records.length}</li>`;

    // Delete listener analytics older than 2 years
    records = await sails.models.listeners
      .destroy({
        createdAt: {
          "<": moment().subtract(2, "years").toISOString(true),
        },
      })
      .fetch();
    if (records.length > 0)
      cleanedUp += `<li>Number of listener records deleted (over 2 years old): ${records.length}</li>`;

    // Delete logs older than 2 years
    records = await sails.models.logs
      .destroy({
        createdAt: {
          "<": moment().subtract(2, "years").toISOString(true),
        },
      })
      .fetch();
    if (records.length > 0)
      cleanedUp += `<li>Number of log records deleted (over 2 years old): ${records.length}</li>`;

    // Delete old message records older than 1 years
    records = await sails.models.messages
      .destroy({
        createdAt: {
          "<": moment().subtract(1, "years").toISOString(true),
        },
      })
      .fetch();
    if (records.length > 0)
      cleanedUp += `<li>Number of message records deleted (over 1 year old): ${records.length}</li>`;

    // Delete track request records older than 2 years
    records = await sails.models.requests
      .destroy({
        createdAt: {
          "<": moment().subtract(2, "years").toISOString(true),
        },
      })
      .fetch();
    if (records.length > 0)
      cleanedUp += `<li>Number of track request records deleted (over 2 years old): ${records.length}</li>`;

    // Delete liked songs records older than 2 years
    records = await sails.models.songsliked
      .destroy({
        createdAt: {
          "<": moment().subtract(2, "years").toISOString(true),
        },
      })
      .fetch();
    if (records.length > 0)
      cleanedUp += `<li>Number of liked tracks records deleted (over 2 years old): ${records.length}</li>`;

    // Delete timesheet records older than 2 years
    records = await sails.models.timesheet
      .destroy({
        createdAt: {
          "<": moment().subtract(2, "years").toISOString(true),
        },
      })
      .fetch();
    if (records.length > 0)
      cleanedUp += `<li>Number of timesheet records deleted (over 2 years old): ${records.length}</li>`;

    // Delete UAB timesheet records older than 2 years
    records = await sails.models.uabtimesheet
      .destroy({
        createdAt: {
          "<": moment().subtract(2, "years").toISOString(true),
        },
      })
      .fetch();
    if (records.length > 0)
      cleanedUp += `<li>Number of UAB timesheet records deleted (over 2 years old): ${records.length}</li>`;

    // Add a log with the clean-up results
    await sails.models.logs
      .create({
        attendanceID: null,
        logtype: "cleanup",
        loglevel: "info",
        logsubtype: "",
        logIcon: `fas fa-broom`,
        title: `Daily clean-up was run.`,
        event: `<ul>${cleanedUp}</ul>`,
      })
      .fetch()
      .tolerate((err) => {
        // Don't throw errors, but log them
        sails.log.error(err);
      });

    // All done.
    return;
  },
};
