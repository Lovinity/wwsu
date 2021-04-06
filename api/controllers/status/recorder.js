module.exports = {
  friendlyName: "Status / recorder",

  description: "Report the current status of the recorder.",

  inputs: {
    status: {
      type: "number",
      min: 1,
      max: 5,
      required: true,
      description: "The status code of the recorder.",
    },
    data: {
      type: "string",
      required: true,
      description: "Information about the current state of the recorder.",
    },
  },

  exits: {},

  fn: async function (inputs) {
    await sails.helpers.status.change.with({
      name: `recorder`,
      status: inputs.status,
      label: `Recorder`,
      data: inputs.data,
    });

    // All done.
    return;
  },
};
