module.exports = async function calendar (req, res) {
  sails.log.debug(`Controller listen/calendar called.`)
  return res.view(`listen/calendar`, { layout: `listen/layout`, timestamp: moment().format(`YYYYMMDD`), requestLimit: sails.config.custom.requests.dailyLimit })
}
