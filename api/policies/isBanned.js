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
    var record = await Discipline.find({ where: { active: 1,
      or: [
        { action: 'permaban' },
        { action: 'dayban', createdAt: { '>': searchto } },
        { action: 'showban' }
      ],
      IP: [theip, `website-${theid}`] } }).sort(`createdAt DESC`).limit(1)
    if (typeof record !== 'undefined' && typeof record[0] !== 'undefined') {
      record = record[0]
      var references = record.ID
      var json = {}
      if (record.active) {
        if (record.action === 'permaban') {
          json.discipline = `Your interactions with WWSU have been placed under review. Please email engineer@wwsu1069.org for further assistance. Please include the following reference number(s) in your email: ${references}`
          return res.status(200).send(JSON.stringify(json))
        } else if (record.action === 'dayban') {
          json.discipline = `Your interactions with WWSU have been placed under review. Please email engineer@wwsu1069.org for further assistance. Please include the following reference number(s) in your email: ${references}`
          return res.status(200).send(JSON.stringify(json))
        } else if (record.action === 'showban') {
          json.discipline = `Your interactions with WWSU have been placed under review. Please email engineer@wwsu1069.org for further assistance. Please include the following reference number(s) in your email: ${references}`
          return res.status(200).send(JSON.stringify(json))
        }
      }
    }
    return next()
  } catch (e) {
    sails.log.error(e)
    return res.status(500).send('There was an error checking security protocols. Please try again in a few minutes. If this problem continues, email engineer@wwsu1069.org.')
  }
}
