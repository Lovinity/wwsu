const bcrypt = require('bcrypt')
module.exports = {

  friendlyName: 'directors / add',

  description: 'Add a new director into the system.',

  inputs: {
    name: {
      type: 'string',
      required: true,
      description: 'The director to add.'
    },

    login: {
      type: 'string',
      required: true,
      description: 'The login used for the clock-in and clock-out computer.'
    },

    email: {
      type: 'string',
      required: true,
      isEmail: true,
      description: 'The email address of the director'
    },

    admin: {
      type: 'boolean',
      defaultsTo: false,
      description: 'Is this director an administrator? Defaults to false.'
    },

    assistant: {
      type: 'boolean',
      defaultsTo: false,
      description: 'Is this director an assistant director opposed to a main director? Defaults to false.'
    },

    position: {
      type: 'string',
      required: true,
      description: 'The description of the position of this director (such as general manager).'
    },

    emailEmergencies: {
      type: 'boolean',
      defaultsTo: false,
      description: 'Should this director receive emails of critical problems?'
    },

    emailDJs: {
      type: 'boolean',
      defaultsTo: false,
      description: 'Should this director receive emails regarding DJ shows, accountability, and analytics?'
    },

    emailDirectors: {
      type: 'boolean',
      defaultsTo: false,
      description: 'Should this director receive emails of director hours and timesheets?'
    },
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller directors/add called.')

    try {
      // Add the director and bcrypt the login
      await sails.models.directors.create({ name: inputs.name, login: bcrypt.hashSync(inputs.login, 10), admin: inputs.admin, assistant: inputs.assistant, position: inputs.position, present: false, since: moment().toISOString() }).fetch()
      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
