module.exports = {

  friendlyName: 'Planner / edit',

  description: 'edit a proposed show in the planner system.',

  inputs: {
    ID: {
      type: 'number',
      required: true
    },
    dj: {
      type: 'string'
    },
    show: {
      type: 'string'
    },
    priority: {
      type: 'number',
      min: 0,
      max: 100
    },
    proposal: {
      type: 'json',
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
    sails.log.debug('Controller planner/edit called.')

    try {
      var criteria = {}

      // Determine what needs editing and edit it
      for (var key in inputs) {
        if (Object.prototype.hasOwnProperty.call(inputs, key) && key !== `ID`) {
          criteria[key] = inputs[key]
        }
      }

      if (inputs.clearActual) { criteria.actual = null }

      var criteriaB = _.cloneDeep(criteria)

      await sails.models.planner.update({ ID: inputs.ID }, criteriaB).fetch()

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
