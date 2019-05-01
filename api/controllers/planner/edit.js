/* global _, sails, Planner */

module.exports = {

    friendlyName: 'Planner / add',

    description: 'Add a proposed show into the planner system.',

    inputs: {
        ID: {
          type: 'number',
          required: true
        },
        dj: {
            type: 'string',
        },
        show: {
            type: 'string',
        },
        priority: {
            type: 'number',
            min: 0,
            max: 100
        },
        proposal: {
            type: 'json',
            custom: (value) => {
                if (!_.isArray(value))
                    return false;
                if (value.length < 1)
                    return true;

                var valid = true;
                value.map((val) => {
                    if (!valid)
                        return null;

                    if (typeof val !== 'object')
                    {
                        valid = false;
                        return null;
                    }

                    if (typeof val.start === `undefined` || typeof val.end === `undefined`)
                    {
                        valid = false;
                        return null;
                    }
                });

                return valid;
            }
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller planner/add called.');

        try {
            var criteria = {};
            
            for (var key in inputs)
            {
                if (inputs.hasOwnProperty(key) && key !== `ID`)
                {
                    criteria[key] = inputs[key];
                }
            }
            
            var criteriaB = _.cloneDeep(criteria);
            
            await Planner.update({ID: inputs.ID}, criteriaB).fetch();
            
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};


