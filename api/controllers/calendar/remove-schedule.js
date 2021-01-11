module.exports = {
  friendlyName: "Calendar / Remove-schedule",

  description: "Remove a schedule record from the calendar.",

  inputs: {
    ID: {
      type: "number",
      required: true,
      description: "The ID number of the schedule event to remove."
    }
  },

  fn: async function(inputs) {
    sails.log.debug("Controller calendar/remove-schedule called.");

    // Check for event conflicts
    sails.models.calendar.calendardb.checkConflicts(
      async conflicts => {
        sails.sockets.broadcast("schedule", "upbeat", conflicts);

        // Remove records which should be removed first
        if (conflicts.removals.length > 0) {
          await sails.models.schedule
            .destroy({
              ID: conflicts.removals.map(removal => removal.scheduleID)
            })
            .fetch();
        }

        // Now, add overrides
        if (conflicts.additions.length > 0) {
          let cfMaps = conflicts.additions.map(async override => {
            await sails.models.schedule.create(override).fetch();
          });
          await Promise.all(cfMaps);
        }
      },
      [{ remove: inputs.ID }]
    );

    // Destroy the schedule event
    await sails.models.schedule.destroyOne({ ID: inputs.ID });
  }
};
