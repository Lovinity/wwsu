module.exports = async function timesheet (req, res) {
  sails.log.debug('Controller timesheet/view called.')
  return res.view('timesheet/home', { layout: 'timesheet/layout', currentDate: DateTime.local().toFormat('MM-dd-yyyy') })
}
