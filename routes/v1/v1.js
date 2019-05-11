const express = require('express')
const router = express.Router()

// var multer = require('multer')

const JUNKEIES_API = require('./api')

// router.post('/convert', multer({ dest: __dirname + '/../../temp/'}).single('myfile'), function (req, res) {
//   JUNKEIES_API.convertImage(req, res)
// })

router.post('/convert', function (req, res) {
  JUNKEIES_API.convertImage(req, res)
})

router.post('/run', function (req, res) {
  JUNKEIES_API.runCode(req, res)
})

router.get('/verify/:token', function (req, res) {
  JUNKEIES_API.verifyCode(req, res)
})

router.get('/search', function (req, res) {
  JUNKEIES_API.searchCode(req, res)
})

module.exports = router
