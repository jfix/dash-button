const path = require('path')
require('dotenv').config({path: path.join(__dirname, '.env')})

const mongoose = require('mongoose')
const db = mongoose.connect(`mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PWD}@${process.env.MONGO_HOST}/${process.env.MONGO_DB}`)

const consoSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  month: Number,
  week: Number,
  weekday: String,
  hour: Number
})

module.exports = db.model('Conso', consoSchema)

