module.exports = {
  friendlyName: "Set",

  description: "Set shootout value.",

  inputs: {
    name: {
      type: "string",
      isIn: [
        "time",
        "round",
        "turn",
        "name1",
        "score1",
        "name2",
        "score2",
        "name3",
        "score3",
        "name4",
        "score4",
        "timeStart",
        "timeStop",
        "timeResume",
        "active"
      ],
      required: true
    },

    value: {
      type: "string",
      defaultsTo: ""
    }
  },

  exits: {},

  fn: async function(inputs) {
    return new Promise(async (resolve, reject) => {
      sails.models.shootout
        .findOrCreate(
          { name: inputs.name },
          { name: inputs.name, value: inputs.value }
        )
        .exec(async (err, newOrExistingRecord, wasCreated) => {
          if (err) return reject(err);

          if (wasCreated) return resolve();

          await sails.models.shootout
            .update(
              { name: inputs.name },
              { name: inputs.name, value: inputs.value }
            )
            .fetch();

          return resolve();
        });
    });
  }
};
