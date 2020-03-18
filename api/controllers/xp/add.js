module.exports = {

  friendlyName: 'xp / add',

  description: 'Add an XP record.',

  inputs: {
    djs: {
      type: 'json',
      required: true,
      description: 'An array of DJ IDs earning this XP/remote.'
    },
    type: {
      type: 'string',
      required: true,
      description: 'The type of XP record (xp, or remote).'
    },
    subtype: {
      type: 'string',
      required: true,
      description: 'A monikor of what the XP was earned for.'
    },
    description: {
      type: 'string',
      allowNull: true,
      description: 'A description for this record.'
    },
    amount: {
      type: 'number',
      required: true,
      description: 'The amount of XP earned.'
    },
    date: {
      type: 'string',
      custom: function (value) {
        return DateTime.fromISO(value).isValid
      },
      allowNull: true,
      description: `ISO string of a date in which the XP was earned. Defaults to now.`
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller xp/add called.')

    // No dj nor djArray? Error!
    if ((!inputs.djs || inputs.djs.length <= 0)) { return exits.error('You are required to provide either a dj parameter, or a djArray array.') }

    try {
      var records = []

      // Process the records depending on whether we have a single dj, or an array in djArray.
      if ((!inputs.djs || inputs.djs.length <= 0)) {
        records.push({ dj: inputs.dj, type: inputs.type, subtype: inputs.subtype, description: inputs.description, amount: inputs.amount, createdAt: inputs.date !== null && typeof inputs.date !== 'undefined' ? inputs.date : DateTime.local().toISO() })
      } else {
        inputs.djs.map(dj => records.push({ dj: dj, type: inputs.type, subtype: inputs.subtype, description: inputs.description, amount: inputs.amount, createdAt: inputs.date !== null && typeof inputs.date !== 'undefined' ? inputs.date : DateTime.local().toISO() }))
      }

      // Add the records
      await sails.models.xp.createEach(records).fetch()

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
