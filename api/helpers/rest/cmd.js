module.exports = {
  friendlyName: "rest.cmd",

  description: "Execute a command on the active RadioDJ REST server.",

  inputs: {
    command: {
      type: "string",
      required: true,
      description: "Command to send over REST."
    },
    arg: {
      type: "string",
      allowNull: true,
      description: "If the command takes an argument, arg is that argument."
    },
    timeout: {
      type: "number",
      defaultsTo: 10000,
      description:
        "Amount of time allowed for waiting for a connection, a response header, and response data (each). If this value is set to 0, the promise will resolve immediately without waiting for needle to finish (and will return true instead of REST response), and will assume 10000 for needle timeout."
    }
  },

  fn: async function(inputs, exits) {
    sails.log.debug(
      `Helper rest.cmd called: ${inputs.command} / ${inputs.arg}`
    );

    var endstring = ""; // appends at the end of a REST call, say, if arg was supplied

    // arg supplied? Load it in memory.
    if (typeof inputs.arg !== "undefined" && inputs.arg !== null) {
      endstring = "&arg=" + inputs.arg;
    }

    try {
      // Query REST
      // LINT: do NOT camel case; these are needle parameters.
      // eslint-disable-next-line camelcase
      var func = () => {
        return new Promise(resolve => {
          needle(
            "get",
            sails.models.meta.memory.radiodj +
              "/opt?auth=" +
              sails.config.custom.rest.auth +
              "&command=" +
              inputs.command +
              endstring,
            {},
            {
              open_timeout: inputs.timeout > 0 ? inputs.timeout : 10000,
              response_timeout: inputs.timeout > 0 ? inputs.timeout : 10000,
              read_timeout: inputs.timeout > 0 ? inputs.timeout : 10000,
              headers: { "Content-Type": "application/json" }
            }
          ).then(resp => resolve(resp));
        });
      };
      if (inputs.timeout > 0) {
        var resp = await func();
        return exits.success(resp);
      }
      if (inputs.timeout === 0) {
        func();
        return exits.success(true);
      }
    } catch (e) {
      return exits.success(false);
    }
  }
};
