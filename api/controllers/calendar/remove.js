module.exports = {
  friendlyName: "Calendar / Remove",

  description: "Permanently remove a calendar event",

  inputs: {
    ID: {
      type: "number",
      required: true,
      description: "The ID number of the calendar event to remove."
    }
  },

  fn: async function(inputs) {
    sails.log.debug("Controller calendar/inactive called.");
    // Check for event conflicts
    sails.models.calendar.calendardb.checkConflicts(
      async conflicts => {
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
      [{ removeCalendar: inputs.ID }]
    );

    // Destroy the event
    await sails.models.calendar.destroyOne({ ID: inputs.ID });

    return;
  }
};
