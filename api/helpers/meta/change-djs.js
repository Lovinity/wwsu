module.exports = {

    friendlyName: 'meta.changeDjs',

    description: 'Update meta DJ ID numbers based on provided show name. Create DJs that do not exist. Update DJ lastSeen records.',

    inputs: {
        show: {
            type: 'string',
            required: true,
            description: "The name of the show in the format hosts (separated by ;) - show name"
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper meta.changeDjs called.')

        var returnData = { dj: null, cohostDJ1: null, cohostDJ2: null, cohostDJ3: null };
        var show;
        var temp;

        var temp = [ "Unknown Hosts" ];
        
        if (inputs.show.includes(' - ')) {

            // Split DJ and show
            var temp = inputs.show.split(' - ')[ 0 ]
            show = inputs.show.split(' - ')[ 1 ]
            temp = temp.split("; ");

            // Determine who the DJs are and create them if they do not exist
            if (temp[ 0 ] && temp[ 0 ] !== 'Unknown Hosts')
                returnData.dj = await sails.models.djs.findOrCreate({ name: temp[ 0 ] }, { name: temp[ 0 ], lastSeen: moment().toISOString(true) })
            if (temp[ 1 ])
                returnData.cohostDJ1 = await sails.models.djs.findOrCreate({ name: temp[ 1 ] }, { name: temp[ 1 ], lastSeen: moment().toISOString(true) })
            if (temp[ 2 ])
                returnData.cohostDJ2 = await sails.models.djs.findOrCreate({ name: temp[ 2 ] }, { name: temp[ 2 ], lastSeen: moment().toISOString(true) })
            if (temp[ 3 ])
                returnData.cohostDJ3 = await sails.models.djs.findOrCreate({ name: temp[ 3 ] }, { name: temp[ 3 ], lastSeen: moment().toISOString(true) })

            // Update lastSeen record for the DJs
            if (returnData.dj !== null) { await sails.models.djs.update({ ID: dj.ID }, { lastSeen: moment().toISOString(true) }).fetch() }
            if (returnData.cohostDJ1 !== null) { await sails.models.djs.update({ ID: dj2.ID }, { lastSeen: moment().toISOString(true) }).fetch() }
            if (returnData.cohostDJ2 !== null) { await sails.models.djs.update({ ID: dj3.ID }, { lastSeen: moment().toISOString(true) }).fetch() }
            if (returnData.cohostDJ3 !== null) { await sails.models.djs.update({ ID: dj4.ID }, { lastSeen: moment().toISOString(true) }).fetch() }
        }

        await sails.helpers.meta.change.with(returnData);
        return exits.success(returnData);
    }

}
