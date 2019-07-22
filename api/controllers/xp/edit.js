module.exports = {

  friendlyName: 'xp / edit',

  description: 'Edit xp record.',

  inputs: {
    ID: {
      type: 'number',
      required: true,
      description: 'The ID of the record to modify.'
    },
    dj: {
      type: 'number',
      description: 'The DJ ID this record belongs to. If provided, will overwrite the original value.'
    },
    type: {
      type: 'string',
      allowNull: true,
      description: 'The type of XP record (xp, or remote). If provided, will overwrite the original value.'
    },
    subtype: {
      type: 'string',
      allowNull: true,
      description: 'A monikor of what the XP was earned for. If provided, will overwrite the original value.'
    },
    description: {
      type: 'string',
      allowNull: true,
      description: 'If provided, the description for this record will be edited to what is provided.'
    },
    amount: {
      type: 'number',
      allowNull: true,
      description: 'If provided, the XP amount will be edited to this.'
    },
    date: {
      type: 'string',
      custom: function (value) {
        return moment(value).isValid()
      },
      allowNull: true,
      description: `If provided, the moment() parsable string of a date in which the XP was earned will be modified to this.`
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller xp/edit called.')

    try {
      // Determine what needs updating
      var criteria = {}
      if (inputs.dj !== null && typeof inputs.dj !== 'undefined') { criteria.dj = inputs.dj }
      if (inputs.type !== null && typeof inputs.type !== 'undefined') { criteria.type = inputs.type }
      if (inputs.subtype !== null && typeof inputs.subtype !== 'undefined') { criteria.subtype = inputs.subtype }
      if (inputs.description !== null && typeof inputs.description !== 'undefined') { criteria.description = inputs.description }
      if (inputs.amount !== null && typeof inputs.amount !== 'undefined') { criteria.amount = inputs.amount }
      if (inputs.date !== null && typeof inputs.date !== 'undefined') { criteria.createdAt = inputs.date }

      // We must clone the InitialValues object due to how Sails.js manipulates any objects passed as InitialValues.
      var criteriaB = _.cloneDeep(criteria)

      // Edit it
      await sails.models.xp.update({ ID: inputs.ID }, criteriaB).fetch()

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
