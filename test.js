require('dotenv').config();

var moment = require('moment');
var request = require('request')

console.log("Somebody just poured a coffee.");
var date = moment().format('YYYY-MM-DD');
var time = moment().format('HH:mm'); 

// IFTTT APPROACH
request({
    url: process.env.IFTTT,
    method: "POST",
    json: {"value1": date, "value2": time, "value3": 1}
}, function (err, res, body) {
       if (err) {
           console.log('ERRROR: ' + JSON.stringify(err));
       } else {
           console.log('SUCCESS: ' + JSON.stringify(body));
       }
       console.log("RES: " + JSON.stringify(res));
});
