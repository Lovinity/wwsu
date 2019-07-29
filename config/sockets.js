/**
 * WebSocket Server Settings
 * (sails.config.sockets)
 *
 * Use the settings below to configure realtime functionality in your app.
 * (for additional recommended settings, see `config/env/production.js`)
 *
 * For all available options, see:
 * https://sailsjs.com/config/sockets
 */

module.exports.sockets = {

  /***************************************************************************
     *                                                                          *
     * `transports`                                                             *
     *                                                                          *
     * The protocols or "transports" that socket clients are permitted to       *
     * use when connecting and communicating with this Sails application.       *
     *                                                                          *
     * > Never change this here without also configuring `io.sails.transports`  *
     * > in your client-side code.  If the client and the server are not using  *
     * > the same array of transports, sockets will not work properly.          *
     * >                                                                        *
     * > For more info, see:                                                    *
     * > https://sailsjs.com/docs/reference/web-sockets/socket-client           *
     *                                                                          *
     ***************************************************************************/

  // transports: ['polling', 'websocket'],

  /***************************************************************************
     *                                                                          *
     * `beforeConnect`                                                          *
     *                                                                          *
     * This custom beforeConnect function will be run each time BEFORE a new    *
     * socket is allowed to connect, when the initial socket.io handshake is    *
     * performed with the server.                                               *
     *                                                                          *
     * https://sailsjs.com/config/sockets#?beforeconnect                        *
     *                                                                          *
     ***************************************************************************/

  beforeConnect: async function (handshake, proceed) {
    // `true` allows the socket to connect.
    // (`false` would reject the connection)
    // console.dir(handshake);

    // Reject immediately if this is a disciplined host
    var moment = require('moment')
    var searchto = moment().subtract(1, 'days').toDate()
    var sh = require('shorthash')
    var theip = typeof handshake.headers['x-forwarded-for'] !== 'undefined' ? handshake.headers['x-forwarded-for'] : handshake.address
    var theid = sh.unique(theip + sails.config.custom.hostSecret)
    try {
      var record = await sails.models.discipline.find({
        where: {
          active: 1,
          or: [
            { action: 'permaban' },
            { action: 'dayban', createdAt: { '>': searchto } },
            { action: 'showban' }
          ],
          IP: [theip, `website-${theid}`]
        }
      }).sort(`createdAt DESC`).limit(1)
      if (typeof record !== 'undefined' && typeof record[0] !== 'undefined') {
        record = record[0]
        var references = record.ID
        if (record.active === 1) {
          if (record.action === 'permaban' || record.action === 'dayban' || record.action === 'showban') {
            return proceed(new Error(`Your interactions with WWSU have been placed under review. Please email engineer@wwsu1069.org for further assistance. Please include the following reference number(s) in your email: ${references}`), false)
          }
        }
      }
    } catch (e) {
      sails.log.error(e)
      return proceed(new Error(`An internal server error occurred when attempting to authorize this websocket connection.`), false)
    }

    // Allow requests from origin baseUrl and certain IPs and domains, otherwise require an authorized host header
    if (handshake.headers && handshake.headers.origin && (handshake.headers.origin.startsWith(sails.config.custom.baseUrl || `http://localhost:${sails.config.port}`) || handshake.headers.origin.startsWith(`http://130.108.128.116`) || handshake.headers.origin.startsWith(`https://wwsu.wolform.me`))) {
      return proceed(undefined, true)
    } else {
      if (typeof handshake._query === 'undefined' || typeof handshake._query.host === 'undefined') {
        return proceed(new Error(`You must provide a host query parameter to authorize this websocket connection.`), false)
      }

      record = await sails.models.hosts.findOrCreate({ host: handshake._query.host }, { host: handshake._query.host, friendlyname: handshake._query.host })

      if (!record.authorized) {
        return proceed(new Error(`The provided host is not yet authorized to connect to WWSU. Please have an administrator authorize this host.`), false)
      }
    }

    // At this point, allow the connection
    return proceed(undefined, true)
  },

  /***************************************************************************
     *                                                                          *
     * `afterDisconnect`                                                        *
     *                                                                          *
     * This custom afterDisconnect function will be run each time a socket      *
     * disconnects                                                              *
     *                                                                          *
     ***************************************************************************/

  afterDisconnect: async function (session, socket, cb) {
    try {
      await sails.helpers.recipients.remove(socket.id)
    } catch (e) {
      sails.log.error(e)
    }
    return cb()
  }

  /***************************************************************************
     *                                                                          *
     * Whether to expose a 'GET /__getcookie' route that sets an HTTP-only      *
     * session cookie.                                                          *
     *                                                                          *
     ***************************************************************************/

  // grant3rdPartyCookie: true,

}
