var unirest = require('unirest')
var multiparty = require('multiparty')
var fs = require('fs')
var Jimp = require('jimp')
const async = require('async')
const sharp = require('sharp')
require('dotenv').config()
var googleAuth = require('google-auto-auth');

/**
 * convertImage
 * Convert given flowchart image to real source code like C or Python
 * 
 * STEPS
 * 1. Receive image from client
 * 2. Store image as file
 * 3. Analyze image to find object
 * 4. Check object is same with what we expected
 * 5. Extract text py
 * 6. Extract object
 * 7. Save texts and objects to array
 * 8. Compare array length count
 * 9. Convert step by step
 * 10. Save codes as array
 * 11. Present whole codes
 */

const convertImage = function (req, res) {
  var {
    img_url
  } = req.body
  async.waterfall([
    (callback) => {
      unirest.post('https://vision.googleapis.com/v1/images:annotate')
        .header('Authorization', 'Bearer ya29.GlwHB1BBsKApWM-MxjUtLLKesbW_isoRIt6Aj_Ktj9RGO3wmYBOVyf8cKtbem6nWa6aFBi9iV0rNoNTxTg0Nr5VibvlvAee2x2BcQrdoh2RcGlIZlsXAjp7_Ys3mOg')
        .header('Content-Type', 'application/json; charset=utf-8')
        .send(`{'requests':[{'image':{'source':{'imageUri':'${img_url}'}},'features':[{'type':'DOCUMENT_TEXT_DETECTION'}]}]}`)
        .end(function (result) {
          if (result) {
            result = JSON.stringify(result) 
            result = JSON.parse(result)
            var textResult = result.body.responses[0].fullTextAnnotation.text
            var textResultArr = textResult.split('\n')
            var codeArr = []
            for (var i = 0; i < textResultArr.length; i ++) {
              var resultPlainLoc = textResultArr[i].lastIndexOf('.')
              var resultPlain = String(textResultArr[i]).substring(parseInt(resultPlainLoc + 2))
              if (i == 0 || i == textResultArr.length - 2) {
                codeArr[i] = ''
              } else if (checkStartCode(textResultArr[i]) == true && checkStartCode(textResultArr[i + 1]) == false) { 
                codeArr[i] = 'if(' + resultPlain + '):\n'
              } else if (checkStartCode(textResultArr[i]) == false && checkStartCode(textResultArr[i + 1]) == false) {
                codeArr[i] = '\t' + resultPlain + '\n'
                codeArr[i] = String(codeArr[i]).replace(/print /gm, 'print(')
                codeArr[i] = String(codeArr[i]).replace(/!/gm, `')`)
              } else if (checkStartCode(textResultArr[i]) == false && checkStartCode(textResultArr[i + 1]) == true) {
                codeArr[i] = 'else:\n\t' + resultPlain + '\n'
                codeArr[i] = String(codeArr[i]).replace(/print /gm, 'print(')
                codeArr[i] = String(codeArr[i]).replace(/!/gm, `')`)
              } else if (checkStartCode(textResultArr[i]) == true && checkStartCode(textResultArr[i + 1]) == true) {
                codeArr[i] = resultPlain + '\n'
              }
              console.log(codeArr[i])
            }
            for (var i = 0; i < codeArr.length; i ++) {
              codeArr[i] = codeArr[i].replace(/(^\s*)|(\s*$)/, '')
              if (codeArr[i].length == 0) {
                codeArr.splice(i, 1)
              }
            }
            callback(null, codeArr)
          } else {
            callback('err')
          }
        })
    }
  ],
  (err, results) => {
    if (err) {
      res.json({ code: 500, v: 'v1', status: 'ERR_SERVER_GET_ROOM' })
    } else {
      res.json({ code: 200, v: 'v1', status: 'SUCCESS', data: results })
    }
  })
}

module.exports.convertImage = convertImage

// function getToken () {
//   var authConfig = {};

//   // path to a key:
//   authConfig.keyFilename = __dirname + '/../../CODRAW-f9fa2cb0d75b.json';

//   // Create a client
//   var auth = googleAuth(authConfig);

//   auth.authorizeRequest({/*...*/}, function (err, authorizedReqOpts) {})
//   auth.getToken(function (err, token) {
//     console.log('aaa')
//     console.log(token)
//     return token
//   })
// }

function checkStartCode (command) {
  if (String(command).split('.').length - 1 == 1) { 
    return true
  } else if (String(command).split('.').length - 1 == 2) {
    return false
  } else {
    return false // error
  }
}

/**
 * runCode
 * Run given code (and saved input variable array) and if we face input statement, return input statement
 * 
 * STEPS
 * 1. Receive codes from clinet
 * 2. Run code
 * 3. If we face some input, return current count
 * 4. Receive code with array from client
 * 5. Run code with saved input variable
 * 6. Return result with end code
*/

const runCode = function (req, res) {
  var {
    code,
    language
  } = req.body
  async.waterfall([
    (callback) => {
      unirest.post('https://judge0.p.rapidapi.com/submissions')
        .header('X-RapidAPI-Host', 'judge0.p.rapidapi.com')
        .header('X-RapidAPI-Key', process.env.RAPID_API_KEY)
        .header('Content-Type', 'application/json')
        .send({'source_code':'#include <stdio.h>\n\nint main(void) {\n  printf(\'hello, world\\n\');\n  return 0;\n}','language_id':'4'})
        .end(function (result) {
          if (result) {
            callback(null, {token: result.body.token})
          } else {
            callback('err')
          }
        })
    }
  ],
  (err, results) => {
    if (err) {
      res.json({ code: 500, v: 'v1', status: 'ERR_SERVER_GET_ROOM' })
    } else {
      res.json({ code: 200, v: 'v1', status: 'SUCCESS', data: results })
    }
  })
}

module.exports.runCode = runCode

const verifyCode = function (req, res) {
  var {
    token
  } = req.params
  async.waterfall([
    (callback) => {
      unirest.get(`https://judge0.p.rapidapi.com/submissions/${token}`)
        .header('X-RapidAPI-Host', 'judge0.p.rapidapi.com')
        .header('X-RapidAPI-Key', process.env.RAPID_API_KEY)
        .end(function (result) {
          if (result) {
            callback(null, {token: token, result: result.body})
          } else {
            callback('err')
          }
        })
    }
  ],
  (err, results) => {
    if (err) {
      res.json({ code: 500, v: 'v1', status: 'ERR_SERVER_GET_ROOM' })
    } else {
      res.json({ code: 200, v: 'v1', status: 'SUCCESS', data: results })
    }
  })
}

module.exports.verifyCode = verifyCode

const searchCode = function (req, res) {
  var {
    q
  } = req.query
  async.waterfall([
    (callback) => {
      unirest.get(`https://contextualwebsearch-websearch-v1.p.rapidapi.com/api/Search/WebSearchAPI?autoCorrect=true&pageNumber=1&pageSize=10&q=${q}&safeSearch=false`)
        .header('X-RapidAPI-Host', 'contextualwebsearch-websearch-v1.p.rapidapi.com')
        .header('X-RapidAPI-Key', process.env.RAPID_API_KEY)
        .end(function (result) {
          console.log(result.status, result.headers, result.body)
        })
    }
  ],
  (err, results) => {
    if (err) {
      res.json({ code: 500, v: 'v1', status: 'ERR_SERVER_GET_ROOM' })
    } else {
      res.json({ code: 200, v: 'v1', status: 'SUCCESS', data: results })
    }
  })
}

module.exports.searchCode = searchCode