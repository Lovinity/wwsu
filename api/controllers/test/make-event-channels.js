module.exports = {
  friendlyName: "Make event channels",

  description: "Make Discord channels for each calendar event",

  inputs: {},

  fn: async function (inputs) {
    let events = await sails.models.calendar.find({ active: true });

    let maps = events.map(async (event) => {
      await sails.helpers.discord.calendar.postEvent(event);
    });

    await Promise.all(maps);

    // All done.
    return;
  },
};
