module.exports = {
  friendlyName: "Version / Check",

  description: "Check version of an application.",

  inputs: {
    app: {
      type: "string",
      required: true,
      description: "The application to check version.",
    },
  },

  exits: {
    notFound: {
      statusCode: 404,
    },
  },

  fn: async function (inputs, exits) {
    sails.log.debug(`Controller version/check called`);

    // Get record
    var record = await sails.models.version.findOne({ app: inputs.app });
    if (!record) return exits.notFound();

    // Subscribe to socket
    if (this.req.isSocket) {
      sails.sockets.join(this.req, `version-${inputs.app}`);
      sails.log.verbose("Request was a socket. Joining version.");
    }

    // Return version and download URL
    return exits.success({ version: record.version, downloadURL: record.downloadURL });
  },
};
