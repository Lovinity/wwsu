module.exports = {

  friendlyName: 'songs.remove',

  description: 'Remove tracks from the automation queue that fall (or do not fall) in the specified subcategories.',

  inputs: {
    exclusive: {
      type: 'boolean',
      required: true,
      description: `If false, tracks in the specified subcategories will be removed. If true, tracks NOT in the specified subcategories will be removed.`
    },
    subcategories: {
      type: 'ref',
      required: true,
      description: `An array of subcategory IDs.`
    },
    keepRequests: {
      type: 'boolean',
      defaultsTo: false,
      description: 'If true, we will not delete any tracks that are in the queue that were requested.'
    },
    noRequeue: {
      type: 'boolean',
      defaultsTo: true,
      description: 'If false, system will clear the entire queue and re-queue tracks that meet criteria. If true, system will remove tracks that fail specified criteria one by one instead of clearing the entire queue and re-queuing appropriate tracks.'
    }
  },

  fn: async function (inputs, exits) {
    // API NOTE: This should never throw an error unless we have to stop all execution.
    sails.log.debug('Helper songs.remove called.')

    // TODO: Due to a bug, we are temporarily forcing noRequeue to be false.
    inputs.noRequeue = false;

    try {
      // Get rid of all the null entries
      try {
        inputs.subcategories = inputs.subcategories.filter(subcategory => subcategory && subcategory !== null)
      } catch (unusedE2) {
        inputs.subcategories = []
      }

      // Get a snapshot of the current queue.
      var queue = await sails.helpers.rest.getQueue()

      // If we want to clear and requeue with the new track list rather than removing matched tracks one by one
      if (!inputs.noRequeue) {
        // Remove the entire queue.
        await sails.helpers.rest.cmd('ClearPlaylist')

        // Remove applicable items from our queue snapshot
        for (var i = queue.length - 1; i > 0; i -= 1) {
          if (parseInt(queue[ i ].ID) !== 0 && ((inputs.exclusive && inputs.subcategories.indexOf(parseInt(queue[ i ].IDSubcat)) === -1) || (!inputs.exclusive && inputs.subcategories.indexOf(parseInt(queue[ i ].IDSubcat)) !== -1))) {
            // If it was requested to keep track requests in the queue, skip over any tracks that were requested.
            if (!inputs.keepRequests || sails.models.requests.pending.indexOf(parseInt(queue[ i ].ID)) === -1) {
              sails.log.verbose(`REMOVING`)
              queue.splice(i, 1)
            }
          }
        }

        // Re-queue the remaining tracks
        if (queue.length > 0) {
          // LINT: await necessary for Sails.js
          // eslint-disable-next-line no-return-await
          var maps = queue.map(async track => await sails.helpers.rest.cmd('LoadTrackToBottom', track.ID))
          await Promise.all(maps)
        }

        // Remove tracks one at a time instead of re-queuing a new playlist
      } else {
        await new Promise(async (resolve) => {
          var stopLoop = false;
          while (!stopLoop) {
            queue = await sails.helpers.rest.getQueue();
            if (queue.length <= 1) stopLoop = true;
            for (var i2 = queue.length - 1; i2 > 0; i2 -= 1) {
              stopLoop = true;
              sails.log.verbose(`songs.remove: checking ${i2}`);
              if (parseInt(queue[ i2 ].ID) !== 0 && ((inputs.exclusive && inputs.subcategories.indexOf(parseInt(queue[ i2 ].IDSubcat)) === -1) || (!inputs.exclusive && inputs.subcategories.indexOf(parseInt(queue[ i2 ].IDSubcat)) !== -1))) {
                // If it was requested to keep track requests in the queue, skip over any tracks that were requested.
                if (!inputs.keepRequests || sails.models.requests.pending.indexOf(parseInt(queue[ i2 ].ID)) === -1) {
                  stopLoop = false;
                  sails.log.verbose(`songs.remove: removing ${i2}`);
                  await sails.helpers.rest.cmd('RemovePlaylistTrack', i2);
                }
              }
            }
            sails.log.verbose(`songs.remove: stopLoop is ${stopLoop}`);
          }
          resolve();
        });
      }

      return exits.success()
    } catch (unusedE) {
      // Do not error
      return exits.success()
    }
  }

}
