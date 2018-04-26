const path = require('path')
require('dotenv').config({path: path.join(__dirname, '.env')})
const client = require('twilio')(process.env.TWILIO_ACC_SID, process.env.TWILIO_AUTH_TOKEN)
require('colors')
const greeting = require('greeting')
const dashButton = require('node-dash-button')
const moment = require('moment')
const storage = require('node-persist')
const player = require('play-sound')()
const request = require('request')

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

storage.initSync({ttl: 8 * 60 * 60 * 1000, forgiveParseErrors: true, logging: true})

function isMorning () {
  const currentHour = new Date().getHours()
  return currentHour > 6 && currentHour < 13
}

function isEvening () {
  const currentHour = new Date().getHours()
  return currentHour > 13 && currentHour < 22
}

const dash = dashButton([process.env.MAC_SMS, process.env.MAC_COFFEE], process.env.NETWORK_INTERFACE, 20000, 'all')
dash.on('detected', function (dashId) {
  // OFFICE ARRIVAL/DEPARTURE
  if (dashId === process.env.MAC_SMS) {
    console.log('🛎  Button pressed!'.yellow)

    let smsMessage = ''
    let doSend = true

    if (isMorning()) {
      if (storage.getItemSync('morning_sms') == null) {
        smsMessage = process.env.SMS_MSG_MORNING
        storage.setItemSync('morning_sms', true)
      } else {
        console.log('✗ Not sending SMS as it already has been sent.'.yellow)
        player.play(path.join(__dirname, 'assets/buzzer.mp3'))
        doSend = false
      }
    } else if (isEvening()) {
      if (storage.getItemSync('evening_sms') == null) {
        smsMessage = process.env.SMS_MSG_EVENING
        storage.setItemSync('evening_sms', true)
      } else {
        console.log('✗ Not sending SMS as it already has been sent.'.yellow)
        player.play(path.join(__dirname, 'assets/buzzer.mp3'))
        doSend = false
      }
    } else {
      smsMessage = process.env.SMS_MSG_UNSPECIFIED
    }
    if (doSend) {
      smsMessage = `${greeting.random()}, ${smsMessage}`
      console.log(`We'll be sending this message: ${smsMessage}`)

      // TWILIO APPROACH
      client.messages.create({
        to: process.env.TWILIO_TO_NUMBER,
        from: process.env.TWILIO_FROM_NUMBER,
        body: smsMessage
      }, function (err, msg) {
        if (err) {
          console.log(`Problem sending SMS ${JSON.stringify(err)}`.red)
          player.play(path.join(__dirname, 'assets/buzzer.mp3'))
        } else {
          console.log(`SMS sent with ID ${msg.sid}`.green)
          player.play(path.join(__dirname, 'assets/swoosh.mp3'))
        }
      })
    }

  // COFFEE CONSUMED
  } else if (dashId === process.env.MAC_COFFEE) {
    const formattedDate = moment().format('YYYY-MM-DD')
    const formattedTime = moment().format('HH:mm')
    console.log(`☕️  ${formattedDate} ${formattedTime}: Somebody just poured a coffee.`)

    // IFTTT APPROACH
    request({
      url: process.env.IFTTT,
      method: 'POST',
      json: {'value1': formattedDate, 'value2': formattedTime, 'value3': 1}
    }, function (err, res, body) {
      if (err) {
        console.log(`IFTTT error: ${JSON.stringify(err)}`.error)
      }
      console.log(`IFTTT success: ${body}`.green)
    })

    // SAVE DATA INTO MONGO DB
    const date = moment()
    const mlabUrl = `${process.env.MLAB_URL}${process.env.MONGO_DB}/collections/${process.env.MONGO_COLLECTION}?apiKey=${process.env.MLAB_APIKEY}`

    const consommation = {
      date: {'$date': date.toISOString()},
      month: date.month(),
      week: date.week(),
      weekday: weekdays[date.weekday()],
      hour: date.hour()
    }
    request({
      url: mlabUrl,
      method: 'POST',
      json: consommation
    }, function (err, res, body) {
      if (err) {
        console.log(`MLAB Error: Send stuff to mlab via request: ${JSON.stringify(err)}`.error)
      } else {
        console.log(`💾  And another coffee consumption saved in db.`.green)
        // provide feedback that button press was taken into account
        player.play(path.join(__dirname, 'assets/water-drop.mp3'), (err) => {
		if (err) console.log(`Sound play error: ${err}.`.error)
	})

        // SEND NOTIFICATIONS TO SLACK
        request({
          'method': 'GET',
          'uri': `${process.env.MLAB_URL}${process.env.MONGO_DB}/collections/${process.env.MONGO_COLLECTION}?c=true&apiKey=${process.env.MLAB_APIKEY}`,
          'json': true
        }, (err, resp, count) => {
          if (err) console.error(`MLAB Error retrieving count from mLab: ${err}`.red)
          else console.log(`MLAB Success: current coffee count: ${count}.`.green)

          const slackOptions = { username: 'Lavazza ©', channel: '#lavazza', icon_emoji: ':coffee:', 'text': `Someone just poured coffee #${count}!` }
          request({
            'method': 'POST',
            'uri': `${process.env.SLACK_WEBHOOK}`,
            'json': slackOptions
          }, (err, resp) => {
            if (err) console.log(`Slack Error: ${JSON.stringify(err)}`.red)
            else console.log(`Slack Success: ${JSON.stringify(resp.body)}.`.green)
          })
        })
      }
    })

  // NEW, UNKNOWN BUTTON FOUND
  } else {
    console.log('Found a new Button: ' + dashId)
  }
})
console.log('👂  Listening for button presses ...'.green)
