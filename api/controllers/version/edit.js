module.exports = {
  friendlyName: "Version / Update",

  description: "Change latest version of an application.",

  inputs: {
    app: {
      type: "string",
      required: true,
      description: "The application to change version.",
    },
    version: {
      type: "string",
      description: "The new latest semantic version",
    },
    downloadURL: {
      type: "string",
      isURL: true,
      description: "The URL to download the new version",
    },
  },

  exits: {
    notFound: {
      statusCode: 404,
    },
  },

  fn: async function (inputs, exits) {
    sails.log.debug(`Controller version/update called`);

    var criteria = {};
    if (inputs.version) criteria.version = inputs.version;
    if (inputs.downloadURL) criteria.downloadURL = inputs.downloadURL;
    var criteriaB = _.cloneDeep(criteria);

    await sails.models.version.update({ app: inputs.app }, criteriaB).fetch();

    return exits.success();
  },
};
