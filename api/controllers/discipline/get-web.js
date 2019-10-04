var sh = require('shorthash')

module.exports = {

    friendlyName: 'Discipline / Get-web',

    description: 'Get an array of discipline assigned to the requested IP that have not been acknowledged yet.',

    inputs: {

    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('controller discipline/get-web called.')

        try {

            var fromIP = this.req.isSocket ? (typeof this.req.socket.handshake.headers[ 'x-forwarded-for' ] !== 'undefined' ? this.req.socket.handshake.headers[ 'x-forwarded-for' ] : this.req.socket.conn.remoteAddress) : this.req.ip
            var host = sh.unique(fromIP + sails.config.custom.hostSecret)
            var searchto = moment().subtract(1, 'days').toDate()

            var records = await sails.models.discipline.find({
                where: {
                    acknowledged: 0,
                    or: [
                        { action: 'permaban', active: 1 },
                        { action: 'dayban', createdAt: { '>': searchto }, active: 1 },
                        { action: 'showban', active: 1 },
                        { action: 'permaban', acknowledged: 0 },
                        { action: 'dayban', acknowledged: 0 },
                        { action: 'showban', acknowledged: 0 }
                    ],
                    IP: [ fromIP, `website-${host}` ]
                }
            }).sort(`createdAt DESC`)

            if (records.length > 0) {
                var discipline = []
                records.map((record) => {
                  discipline.push({ID: record.ID, active: record.active, acknowledged: record.acknowledged, message: record.message, action: record.action, createdAt: record.createdAt})
                })
                return exits.success(discipline)
              } else {
                return exits.success([])
              }
        } catch (e) {
            return exits.error(e)
        }
    }

}