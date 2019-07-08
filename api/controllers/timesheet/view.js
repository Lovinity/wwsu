module.exports = async function public(req, res) {
    sails.log.debug('Controller timesheet/view called.');
    return res.view('timesheet/home', {layout: 'timesheet/layout', currentDate: moment().format('MM-DD-YYYY')});
};
