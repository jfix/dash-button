require('dotenv').config({path: '/home/pi/dash-button/.env'});
require('colors');

var client = require('twilio')(process.env.TWILIO_ACC_SID, process.env.TWILIO_AUTH_TOKEN);
var dash_button = require('node-dash-button');
var storage = require('node-persist').init({ttl: 8*60*60*1000});

var isMorning = function() {
    var currentHour = new Date().getHours();
    return currentHour > 6 && currentHour < 13
},
isEvening = function() {
    var currentHour = new Date().getHours();
    return currentHour > 13 && currentHour < 22
};

var dash = dash_button([process.env.MAC1], "wlan0", 60000, 'all'); //address from step above
dash.on("detected", function (dash_id){

    // OFFICE ARRIVAL/DEPARTURE

    if (dash_id === process.env.MAC1) {
        console.log("Button pressed!".yellow);

        var smsMessage = '';

        if (isMorning()) {
            if (storage.getItemSync("morning_sms") == null) {
                return;    
            } else {
                storage.setItemSync("morning_sms", true);
                smsMessage = process.env.SMS_MSG_MORNING;
            }
        } else if (isEvening()) {
            if (storage.getItemSync("evening_sms") == null) {
                return;
            } else {
                storage.setItemSync("evening_sms", true);
                smsMessage = process.env.SMS_MSG_EVENING;
            }
        } else {
	    smsMessage = process.env.SMS_MSG_UNSPECIFIED;
        }

        // TWILIO APPROACH
	client.messages.create({
	    to: process.env.TWILIO_TO_NUMBER,
            from: process.env.TWILIO_FROM_NUMBER,
            body: smsMessage
        }, function(err, msg) {
            if (err) {
                console.log(`Problem sending SMS ${JSON.stringify(err)}`.red);
            } else {
                console.log(`SMS sent with ID ${msg.sid}`.green);
            }
        });

        // IFTTT APPROACH
    	//request(process.env.IFTTT, function (err, res, body) {
	//    console.log(body);
        //})

    // COFFEE CONSUMED
    // TODO

    // NEW, UNKNOWN BUTTON FOUND

    } else {
        console.log("Found a new Button: " + dash_id);
    }
});
console.log("Listening for button presses ...".green)
