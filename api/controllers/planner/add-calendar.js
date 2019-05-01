/* global Recipients, sails, Planner, Calendar, moment, Promise */

module.exports = {

    friendlyName: 'Planner / add-calendar',

    description: 'Add all of the shows and prerecords that currently exist on the Google Calendar in the next 7 days.',

    inputs: {
        finalized: {
            type: 'boolean',
            defaultsTo: false
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller planner/add-calendar called.');
        try {
            // Get calendar records
            var records = await Calendar.find({or: [{title: {startsWith: 'Show: '}}, {title: {startsWith: 'Prerecord: '}}], start: {'<=': moment().add(7, 'days').toISOString(true)}});
            var maps = records.map(async (record) => {
                
                // Determine DJ and show name
                var dj = `Unknown`;
                var show = record.title;
                if (record.title !== null && record.title.includes(" - "))
                {
                    var temp = record.title.replace(`Show: `, ``).replace(`Prerecord: `, ``).split(` - `);
                    dj = temp[0];
                    show = temp[1];
                }
                
                // Covert start and end times to week integers
                var start = await sails.helpers.weekToInt(moment(record.start).day(), moment(record.start).hour(), moment(record.start).minute());
                var end = await sails.helpers.weekToInt(moment(record.end).day(), moment(record.end).hour(), moment(record.end).minute());
                
                // Create the planner record
                await Planner.create({dj: dj, show: show, actual: {start: start, end: end}, finalized: inputs.finalized});
            });
            
            await Promise.all(maps);

            return exits.success(records);
        } catch (e) {
            return exits.error(e);
        }
    }


};


