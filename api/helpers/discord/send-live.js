module.exports = {
  friendlyName: "Send live",

  description:
    "Use the going live webhook to let others know in the Discord that a show is going live.",

  inputs: {
    event: {
      type: "json",
      description: "Event object triggering the notification."
    }
  },

  exits: {
    success: {
      description: "All done."
    }
  },

  fn: async function(inputs) {
    // TODO: move this to config
    const webhook =
      "https://discord.com/api/webhooks/782133813853683712/1qJv5Yc8dnqolO_MK_Dsz6g8axZqX5KmLpm6S8C1jr-sppwjadLFeryC-oJ0lEOT-vAR";

    if (
      !inputs.event ||
      ["show", "remote", "sports", "prerecord", "playlist"].indexOf(
        inputs.event.type
      ) === -1
    )
      return;

    return await needle(
      "post",
      webhook,
      {
        username: inputs.event.name,
        content: `:radio: __**Now live on WWSU Radio**__
**${inputs.event.type}: ${inputs.event.hosts} - ${inputs.event.name}.**
${sails.models.meta.memory.topic}

:link: Tune in at https://server.wwsu1069.org or by going in the Radio voice channel.`
      },
      { headers: { "Content-Type": "application/json" } }
    );
  }
};
