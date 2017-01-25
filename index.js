require('dotenv').config({path: '/home/pi/dash-button/.env'});
require('colors');

var client = require('twilio')(process.env.TWILIO_ACC_SID, process.env.TWILIO_AUTH_TOKEN);
var dash_button = require('node-dash-button');
var greeting = require('greeting');
var request = require('request');
var storage = require('node-persist');

storage.initSync({ttl: 8*60*60*1000});

function isMorning() {
    var currentHour = new Date().getHours();
    return currentHour > 6 && currentHour < 13
}

function isEvening() {
    var currentHour = new Date().getHours();
    return currentHour > 13 && currentHour < 22
}

var dash = dash_button([process.env.MAC_SMS, process.env.MAC_COFFEE], "wlan0", 20000, 'all'); //address from step above
dash.on("detected", function (dash_id){

    // OFFICE ARRIVAL/DEPARTURE

    if (dash_id === process.env.MAC_SMS) {
        console.log("Button pressed!".yellow);

        var smsMessage = '';

        if (isMorning()) {
            if (storage.getItemSync("morning_sms") == null) {
                smsMessage = process.env.SMS_MSG_MORNING;
                storage.setItemSync("morning_sms", true);
            } else {
                return;    
            }
        } else if (isEvening()) {
            if (storage.getItemSync("evening_sms") == null) {
                smsMessage = process.env.SMS_MSG_EVENING;
                storage.setItemSync("evening_sms", true);
            } else {
                return;
            }
        } else {
	    smsMessage = process.env.SMS_MSG_UNSPECIFIED;
        }
        smsMessage = `${greeting.random()}, ${smsMessage}`;
        console.log(`We'll be sending this message: ${smsMessage}`);

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

    // COFFEE CONSUMED

    } else if (dash_id === process.env.MAC_COFFEE) {
        console.log("Somebody just poured a coffee.");

        // IFTTT APPROACH
    	request(process.env.IFTTT, function (err, res, body) {
	    console.log(body);
        })

    // NEW, UNKNOWN BUTTON FOUND

    } else {
        console.log("Found a new Button: " + dash_id);
    }
});
console.log("Listening for button presses ...".green)