module.exports = {

  friendlyName: 'Planner / add',

  description: 'Add a proposed show into the planner system.',

  inputs: {
    dj: {
      type: 'string',
      required: true
    },
    show: {
      type: 'string',
      required: true
    },
    priority: {
      type: 'number',
      required: true,
      min: 0,
      max: 1000
    },
    proposal: {
      type: 'json',
      required: true,
      custom: (value) => {
        if (!_.isArray(value)) { return false }
        if (value.length < 1) { return true }

        var valid = true
        value.map((val) => {
          if (!valid) { return null }

          if (typeof val !== 'object') {
            valid = false
            return null
          }

          if (typeof val.start === `undefined` || typeof val.end === `undefined`) {
            valid = false
            return null
          }
        })

        return valid
      }
    },
    actual: {
      type: 'json',
      custom: (value) => {
        for (var key in value) {
          if (!Object.prototype.hasOwnProperty.call(value, key)) {
            return false
          }
          if (key !== 'start' && key !== 'end') {
            return false
          }
        }
        return true
      }
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller planner/add called.')

    try {
      await sails.models.planner.create({ inputs }).fetch()

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
