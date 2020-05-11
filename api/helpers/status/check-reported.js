module.exports = {

    friendlyName: 'status.checkReported',

    description: 'Check if any issues were reported and update status accordingly.',

    inputs: {

    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug(`helper sails.helpers.status.checkReported called.`)
        var reports = await sails.models.logs.find({ logtype: 'status-reported', acknowledged: false });
        if (reports.length > 0) {
            await sails.helpers.status.change.with({ name: 'reported', label: 'Reported Problems', data: `<ul><li>${reports.map((report) => `${report.title} (${moment(report.createdAt).format("llll")}): ${report.event}`).join('</li><li>')}</li></ul>`, status: 2 })
        } else {
            await sails.helpers.status.change.with({ name: 'reported', label: 'Reported Problems', data: `No problems have been reported at this time.`, status: 5 })
        }

        return exits.success();
    }

}