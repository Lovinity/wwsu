module.exports = {

  friendlyName: `Logs / get`,

  description: `Retrieve a list of log entries.`,

  inputs: {
    subtype: {
      type: `string`,
      defaultsTo: ``,
      description: `The log subtype to retrieve.`
    },

    attendanceID: {
      type: `number`,
      allowNull: true,
      description: `If provided, logs pertaining to this attendance record ID will be returned. This overwrites start, end, and date.`
    },

    date: {
      type: `string`,
      custom: function (value) {
        return moment(value).isValid()
      },
      allowNull: true,
      description: `moment() parsable string of a date to get logs.`
    },
    start: {
      type: `string`,
      custom: function (value) {
        return moment(value).isValid()
      },
      allowNull: true,
      description: `moment() parsable string of a date which the returned logs should start from.`
    },
    end: {
      type: `string`,
      custom: function (value) {
        return moment(value).isValid()
      },
      allowNull: true,
      description: `moment() parsable string of a date which the returned logs should end at.`
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug(`Controller logs/get called.`)

    try {
      // Get date range
      var start = inputs.date !== null ? moment(inputs.date).startOf(`day`) : moment().startOf(`day`)
      var end = moment(start).add(1, `days`)
      if (inputs.start !== null) { start = moment(inputs.start) }
      if (inputs.end !== null) { end = moment(inputs.end) }

      // Prepare query
      var query = { createdAt: { '>=': start.toISOString(true), '<': end.toISOString(true) } }
      if (inputs.attendanceID !== null && inputs.attendanceID > 0) { query = { attendanceID: inputs.attendanceID } }

      // Get issue logs if ISSUES was provided as the subtype
      if (inputs.subtype === `ISSUES`) {
        query.or = []
        query.or.push({ loglevel: [`warning`, `urgent`, `danger`] })
        query.or.push({ logtype: [`cancellation`, `director-cancellation`] })
      } else if (inputs.subtype !== `` && inputs.subtype !== null) {
        query.logsubtype = inputs.subtype
      }

      // Get records
      var records = await sails.models.logs.find(query).sort(`createdAt ASC`)

      sails.log.verbose(`Retrieved Logs records: ${records.length}`)
      sails.log.silly(records)

      // Join logs socket if applicable (ignores all filtering rules)
      if (this.req.isSocket) {
        sails.sockets.join(this.req, `logs`)
        sails.log.verbose(`Request was a socket. Joining logs.`)
      }

      return exits.success(records)
    } catch (e) {
      return exits.error(e)
    }
  }

}
