var path = require('path');
require('dotenv').config({path: path.join(__dirname, '.env')});
require('colors');
var client = require('twilio')(process.env.TWILIO_ACC_SID, process.env.TWILIO_AUTH_TOKEN);
var Conso = require('./models/conso');
var dash_button = require('node-dash-button');
var greeting = require('greeting');
var moment = require('moment');
var request = require('request');
var storage = require('node-persist');

var weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];


storage.initSync({ttl: 8*60*60*1000});

function isMorning() {
    var currentHour = new Date().getHours();
    return currentHour > 6 && currentHour < 13
}

function isEvening() {
    var currentHour = new Date().getHours();
    return currentHour > 13 && currentHour < 22
}

var dash = dash_button([process.env.MAC_SMS, process.env.MAC_COFFEE], "wlan0", 20000, 'all');
dash.on("detected", function (dash_id){

    // OFFICE ARRIVAL/DEPARTURE

    if (dash_id === process.env.MAC_SMS) {
        console.log("🛎  Button pressed!".yellow);

        var smsMessage = '';
        var doSend = true;

        if (isMorning()) {
            if (storage.getItemSync("morning_sms") == null) {
                smsMessage = process.env.SMS_MSG_MORNING;
                storage.setItemSync("morning_sms", true);
            } else {
                console.log('✗ Not sending SMS as it already has been sent.'.yellow);
                doSend = false;
            }
        } else if (isEvening()) {
            if (storage.getItemSync("evening_sms") == null) {
                smsMessage = process.env.SMS_MSG_EVENING;
                storage.setItemSync("evening_sms", true);
            } else {
                console.log('✗ Not sending SMS as it already has been sent.'.yellow);
                doSend = false;
            }
        } else {
            smsMessage = process.env.SMS_MSG_UNSPECIFIED;
        }
        if (doSend) {
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
        }

    // COFFEE CONSUMED

    } else if (dash_id === process.env.MAC_COFFEE) {
        var formattedDate = moment().format('YYYY-MM-DD');
        var formattedTime = moment().format('HH:mm'); 
        console.log(`☕️  ${formattedDate} ${formattedTime}: Somebody just poured a coffee.`);

        // IFTTT APPROACH
        request({
            url: process.env.IFTTT,
            method: "POST",
            json: {"value1": formattedDate, "value2": formattedTime, "value3": 1}
        }, function (err, res, body) {
           if (err) {
               console.log('ERRROR: ' + JSON.stringify(err));
           }
           console.log(body);
        });

        // SAVE DATA INTO MONGO DB
        var date = moment();

        var aConso = new Conso({
            date,
            month: date.month(),
            week: date.week(),
            weekday: weekdays[date.weekday()],
            hour: date.hour()
        })

        aConso.save(function (err, conso) {
            if (err) return console.error(err)
            else console.log(`💾  And another coffee consumption saved in db.`)
        })

    // NEW, UNKNOWN BUTTON FOUND

    } else {
        console.log("Found a new Button: " + dash_id);
    }
});
console.log("👂  Listening for button presses ...".green)
