module.exports = {

    friendlyName: 'rest / Remove music',

    description: 'Remove all music-type tracks from the active RadioDJ queue.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        var removetrack = async function (cb) {
            // Get current queue
            var queue = await sails.helpers.rest.queue();
            if (queue === null)
            {
                cb();
                return null;
            }
            // If there's nothing in the queue, it returns NOT Array. If there is something in queue, it returns Array. Convert to Array if not array to be consistent.
            if (Array.isArray(queue.ArrayOfSongData.SongData))
            {
                var thequeue = queue.ArrayOfSongData.SongData;
            } else {
                var thequeue = [];
                thequeue.push(queue.ArrayOfSongData.SongData);
            }
            var terminateloop = false;
            var loopposition = 1;

            // Loop through all the tracks in the queue
            while (!terminateloop && loopposition < thequeue.length)
            {
                // If the track is a music track, remove it
                if (thequeue[loopposition].TrackType == 'Music' && thequeue[loopposition].Elapsed == 0 && thequeue[loopposition].ID != 0)
                {
                    terminateloop = true;
                    await sails.helpers.rest.cmd('RemovePlaylistTrack', loopposition - 1);
                    
                    // We have to re-execute the entire function again after each time we remove something so we can load the new queue in memory and have correct position numbers.
                    setTimeout(function () {
                        removetrack(cb);
                    }, 100);
                }
                loopposition += 1;
            }
            if (!terminateloop)
                cb();
        }
        removetrack(exits.success);
    }


};

