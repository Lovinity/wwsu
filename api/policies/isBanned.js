/**
 * isAuthorized
 *
 * @description :: Policy to check if user is banned
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Policies
 */

module.exports = async function (req, res, next) {
  var moment = require('moment')
  var searchto = moment().subtract(1, 'days').toDate()
  var sh = require('shorthash')
  var theip = req.isSocket ? (typeof req.socket.handshake.headers['x-forwarded-for'] !== 'undefined' ? req.socket.handshake.headers['x-forwarded-for'] : req.socket.conn.remoteAddress) : req.ip
  var theid = sh.unique(theip + sails.config.custom.hostSecret)
  /*
     Discipline.findOne({where: {active: 1, or: [
     {action: 'permaban'},
     {action: 'dayban', createdAt: {'>': searchto}}
     ], IP: req.ip}, sort: 'createdAt DESC'}).exec(function (error, record)
     */
  try {
    var records = await sails.models.discipline.find({ where: { active: 1,
      or: [
        { action: 'permaban' },
        { action: 'dayban', createdAt: { '>': searchto } },
        { action: 'showban' }
      ],
      IP: [theip, `website-${theid}`] } }).sort(`createdAt DESC`)

      if (records.length > 0) {
        var json = {discipline: []}
        records.map((record) => {
          json.discipline.push({ID: record.ID, message: record.message, action: record.action, createdAt: record.createdAt})
        })
        return res.status(403).send(JSON.stringify(json))
      } else {
        return next()
      }
  } catch (e) {
    sails.log.error(e)
    return res.status(500).send('There was an error checking security protocols. Please try again in a few minutes. If this problem continues, email engineer@wwsu1069.org.')
  }
}
