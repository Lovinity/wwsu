module.exports = {
  friendlyName: "Timesheet / Get",

  description: "Get a week of timesheet entries.",

  inputs: {
    start: {
      type: "string",
      custom: function (value) {
        return moment(value).isValid();
      },
      description: `moment() parsable string of the start date/time to get records. Defaults to 14 days ago.`,
    },
    end: {
      type: "string",
      custom: function (value) {
        return moment(value).isValid();
      },
      description: `moment() parsable string of the end date/time to get records. Defaults to now.`,
    },
  },

  fn: async function (inputs, exits) {
    sails.log.debug("Controller timesheet/get called.");

    try {
      if (!inputs.start || inputs.start === null) {
        // Join timesheet socket if applicable
        if (this.req.isSocket) {
          sails.sockets.join(this.req, "timesheet");
          sails.log.verbose("Request was a socket. Joining timesheet.");
        }
      }

      // Get the time ranges
      var start = inputs.start
        ? moment(inputs.start)
        : moment().subtract(2, "weeks");
      var end = inputs.end ? moment(inputs.end) : moment();

      // Get timesheet records
      var records = await sails.models.timesheet
        .find({
          or: [
            {
              timeIn: {
                ">=": start.toISOString(true),
                "<": end.toISOString(true),
              },
            },
            {
              timeOut: {
                ">=": start.toISOString(true),
                "<": end.toISOString(true),
              },
            },
            {
              timeIn: null,
              timeOut: null,
              scheduledIn: {
                ">=": start.toISOString(true),
                "<": end.toISOString(true),
              },
            },
            {
              timeIn: null,
              timeOut: null,
              scheduledOut: {
                ">=": start.toISOString(true),
                "<": end.toISOString(true),
              },
            },
          ],
        })
        .sort([{ timeIn: "ASC" }, { scheduledIn: "ASC" }]);
      sails.log.verbose(`Returned Timesheet records: ${records.length}`);
      sails.log.silly(records);

      // return the records
      return exits.success(records);
    } catch (e) {
      return exits.error(e);
    }
  },
};
