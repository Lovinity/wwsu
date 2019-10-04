var sh = require('shorthash')

module.exports = {

    friendlyName: 'Discipline / Acknowledge',

    description: 'Mark a discipline as acknowledged by the client.',

    inputs: {
        ID: {
            type: 'number',
            required: true,
            description: 'The ID of the disciplinary record to mark acknowledged.'
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('controller discipline/acknowledge called.')

        try {

            var fromIP = this.req.isSocket ? (typeof this.req.socket.handshake.headers[ 'x-forwarded-for' ] !== 'undefined' ? this.req.socket.handshake.headers[ 'x-forwarded-for' ] : this.req.socket.conn.remoteAddress) : this.req.ip
            var host = sh.unique(fromIP + sails.config.custom.hostSecret)

            await sails.models.discipline.update({
                ID: inputs.ID,
                IP: [ fromIP, `website-${host}` ]
            }, { acknowledged: 1 }).fetch()

            return exits.success()
        } catch (e) {
            return exits.error(e)
        }
    }

}