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
const randomFile = require('select-random-file')

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

storage.initSync({ttl: 8 * 60 * 60 * 1000})

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
        player.play('./assets/buzzer.mp3')
        doSend = false
      }
    } else if (isEvening()) {
      if (storage.getItemSync('evening_sms') == null) {
        smsMessage = process.env.SMS_MSG_EVENING
        storage.setItemSync('evening_sms', true)
      } else {
        console.log('✗ Not sending SMS as it already has been sent.'.yellow)
        player.play('./assets/buzzer.mp3')
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
          player.play('./assets/buzzer.mp3')
        } else {
          console.log(`SMS sent with ID ${msg.sid}`.green)
          player.play('./assets/swoosh.mp3')
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
        console.log('ERRROR: ' + JSON.stringify(err))
      }
      console.log(body)
    })

    // SAVE DATA INTO MONGO DB
    const date = moment()
    const mlabUrl = `${process.env.MLAB_URL}${process.env.MONGO_DB}/collections/${process.env.MONGO_COLLECTION}?apiKey=${process.env.MLAB_APIKEY}`

    const consommation = {
      date: {'$date': date},
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
        console.log('ERROR sending stuff to mlab via request: ' + JSON.stringify(err))
      } else {
        console.log(`💾  And another coffee consumption saved in db.`)
        // provide feedback
        const dir = path.join(__dirname, 'assets/coffee')
        randomFile(dir, (err, file) => {
          if (err) console.log(err)
          else player.play(path.join(dir, file))
        })
        // SEND NOTIFICATIONS TO SLACK
        request({
            'method': 'GET',
            'uri': `${process.env.MLAB_URL}${process.env.MONGO_DB}/collections/${process.env.MONGO_COLLECTION}?c=true&apiKey=${process.env.MLAB_APIKEY}`,
            'json': true
        }, (err, resp, count) => {
            if (err) console.error(err)
            request({
                'method': 'POST',
                'uri': process.env.SLACK_WEBHOOK,
                'body': {
                'text': `Just now, coffee number ${count} was poured. <http://www.lavazza.space|Find out more>.`,
                'icon_emoji': ':coffee:',
                'username': 'Lavazza ©',
                    'channel': '#drinks'
                },
                'json': true
            }, (err, resp, body) => {
                if (err) console.error('ERROR notifying via Slack ' + JSON.stringify(err))
                else console.log('Slack was correctly notified: ' + body /* should be 'ok' */)
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
