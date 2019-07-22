module.exports = async function chat (req, res) {
  sails.log.debug(`Controller listen/chat called.`)
  return res.view(`listen/chat`, { layout: `listen/layout`, timestamp: moment().format(`YYYYMMDD`), requestLimit: sails.config.custom.requests.dailyLimit })
}
