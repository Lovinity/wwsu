module.exports = {

  friendlyName: 'genre.start',

  description: 'Start a RadioDJ rotation.',

  inputs: {
    event: {
      type: 'json',
      description: 'Event object triggering the genre.'
    },
    ignoreChangingState: {
      type: 'boolean',
      defaultsTo: false,
      description: 'Set to true to ignore sails.models.meta.changingState conflict detection.'
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Helper genre.start called.')
    try {

      // Do not start a genre if we're not in genre rotation or automation.
      if (sails.models.meta.memory.state === 'automation_on' || (sails.models.meta.memory.state === 'automation_genre')) {
        // Do not start this genre if it was already started
        if (sails.models.meta.memory.calendarUnique !== (inputs.event === null ? null : inputs.event.unique) || inputs.ignoreChangingState) {
          // Do not start a genre if we are in the middle of changing states, unless ignoreChangingState was provided true.
          if (sails.models.meta.memory.changingState === null || inputs.ignoreChangingState) {
            // Lock future state changes until we are done if ignoreChangingState is false.
            if (!inputs.ignoreChangingState) { await sails.helpers.meta.change.with({ changingState: `Switching to genre` }) }

            // Find the manual RadioDJ event for Node to trigger
            var query = inputs.event !== null ? { type: 3, ID: inputs.event.eventID, enabled: 'True' } : { type: 3, name: "Default", enabled: 'True' };
            var event = await sails.models.events.find(query);
            sails.log.verbose(`sails.models.events returned ${event.length} matched events, but we're only going to use the first one.`)
            sails.log.silly(event)

            // We cannot find the event. Throw an error.
            if (event.length <= 0) {
              if (!inputs.ignoreChangingState) { await sails.helpers.meta.change.with({ changingState: null }) }
              return exits.error(new Error(`The provided event name was not found as an active manual event in RadioDJ.`))
            }

            await sails.helpers.rest.cmd('RefreshEvents', 0, 10000) // Reload events in RadioDJ just in case

            await sails.helpers.rest.cmd('EnableAutoDJ', 0) // Don't want RadioDJ queuing tracks until we have switched rotations
            await sails.helpers.songs.remove(true, sails.config.custom.subcats.noClearGeneral, true) // We want the rotation change to be immediate; clear out any music tracks in the queue. But, leave requested tracks in the queue.
            await sails.helpers.rest.cmd('EnableAssisted', 0)

            await sails.helpers.rest.cmd('RunEvent', event[ 0 ].ID, 5000) // This triggers the change in rotation.
            await sails.helpers.rest.cmd('EnableAutoDJ', 1)

            // If we are going back to default rotation, we don't want to activate genre mode; leave in automation_on mode
            if (inputs.event !== null) {
              await sails.helpers.meta.change.with({ state: 'automation_genre', genre: inputs.event.name, playlistPlayed: moment().toISOString(true) })
              await sails.helpers.meta.newShow();
            } else {
              await sails.helpers.meta.change.with({ state: 'automation_on', genre: 'Default', playlistPlayed: moment().toISOString(true) })
              await sails.helpers.meta.newShow();
              await sails.models.logs.create({ attendanceID: sails.models.meta.memory.attendanceID, logtype: 'sign-on', loglevel: 'primary', logsubtype: '', logIcon: `fas fa-music`, title: `Default rotation started.`, event: '' }).fetch()
                .tolerate((err) => {
                  sails.log.error(err)
                })
            }
            if (!inputs.ignoreChangingState) { await sails.helpers.meta.change.with({ changingState: null }) }
          }
        }
        return exits.success(true);
      } else {
        return exits.success(false);
      }
    } catch (e) {
      if (!inputs.ignoreChangingState) { await sails.helpers.meta.change.with({ changingState: null }) }
      return exits.error(e)
    }
  }

}
