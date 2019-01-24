/* global moment */

var theTime = null;
$.ajax('/meta/get', {})
        .then(
                function success(resHTML) {
                    theTime = moment.utc(resHTML.time);
                    setInterval(function () {
                        theTime = moment(theTime).add(1, 'seconds');
                        var temp = document.querySelector(`#aaup-strike`);
                        if (temp)
                            temp.innerHTML = moment.duration(moment.utc(theTime).diff(moment.utc("2019-01-22 08:00:00"))).format("d [days], h:mm:ss");
                    }, 1000);
                },
                function fail(data, status) {
                    var temp = document.querySelector(`#aaup-strike`);
                    if (temp)
                        temp.innerHTML = `ERROR: TRY AGAIN`;
                }
        );


