module.exports = async function public(req, res) {
    sails.log.debug('Controller uab/timesheet/view called.');
    return res.view('uab/timesheet/home', {layout: 'uab/timesheet/layout', currentDate: DateTime.local().toFormat("MM-dd-yyyy")});
};