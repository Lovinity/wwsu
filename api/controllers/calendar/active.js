module.exports = {
  friendlyName: "Calendar / active",

  description: "Mark an event in the main calendar active",

  inputs: {
    ID: {
      type: "number",
      required: true,
      description: "The ID number of the calendar event to mark active."
    }
  },

  fn: async function(inputs) {
    sails.log.debug("Controller calendar/active called.");

    // Mark the calendar as active
    await sails.models.calendar.updateOne({ ID: inputs.ID }, { active: true });

    return;
  }
};
