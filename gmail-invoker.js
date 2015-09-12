var CONFIG          = require("./config"),
    fs              = require('fs'),
    sys             = require('sys'),
    exec            = require('child_process').exec,
    nodemailer      = require("nodemailer"),
    alreadyRactedTo = JSON.parse(fs.readFileSync("alreadyRactedTo.json", 'utf8'))

// Load client secrets from a local file.
fs.readFile('client_secret.json', function processClientSecrets(error, content) {
  if (error) {
    return console.log('Error loading client secret file: ' + error)
  }

  // Authorize a client with the loaded credentials, then call the
  // Gmail API.
  authorize(JSON.parse(content), checkInboxForMessages)
})

/**
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function checkInboxForMessages(auth) {
  gmail.users.messages.list({
    auth: auth,
    userId: 'me',
    id: 'INBOX'
  }, function(error, response) {
    if (error) {
      return console.log('The API returned an error: ' + error)
    }

    iterateThruEmails (auth, response.messages)
  })
}

function iterateThruEmails (auth, messages) {
  if (messages.length == 0) {
    console.log('No messages found.')
  } else {
    console.log('Messages:')
    for (var i = 0; i < messages.length; i++) {
      var message = messages[i]

      getEmailContents (auth, message.id)
    }
  }
}

function getEmailContents (auth, message_id) {
  gmail.users.messages.get({
    auth: auth,
    userId: 'me',
    id: message_id
  }, function(error, response) {
    if (error) {
      return console.log('The API returned an error: ' + error)
    }

    processEmail (message_id, response)
  })
}

function processEmail (message_id, response) {
  if (response.payload.body.data && haveNotReactedToThisId (getHeaders ("Date", response.payload.headers), alreadyRactedTo)) {
    var email_contents = new Buffer (response.payload.body.data, 'base64').toString()

    if (email_contents && email_contents.indexOf(CONFIG.CODEWORD) >= 0) {
      console.log ("      ID: " + message_id)
      console.log ("Contents: " + email_contents)

      sendEmail ("Script Started", email_contents)
      addCurrentIdToAlreadyRactedTo (getHeaders ("Date", response.payload.headers))

      runScript (function (stdout) {
        sendEmail ("Script Finished", stdout.replace(/(?:\r\n|\r|\n)/g, '<br />'))
      })
    }
  }
}

function addCurrentIdToAlreadyRactedTo (id) {
  alreadyRactedTo.push ({"id":id})
  fs.writeFile("alreadyRactedTo.json", JSON.stringify(alreadyRactedTo), function(error) {
    if (error) {
      return console.log(error)
    }

    console.log("The alreadyRactedTo.json has been updated")
  })
}

function runScript (callback) {
  exec(CONFIG.SCRIPT, function (error, stdout, stderr) {
    if (error) {
      return console.log (error)
    } else {
      console.log (stdout)

      callback (stdout)
    }
  })
}

function sendEmail (subject, body) {
  var transporter  = nodemailer.createTransport({
    service: CONFIG.EMAIL_PROVIDER,
    auth: {
      user: CONFIG.EMAIL_USER,
      pass: CONFIG.EMAIL_PASSWORD
    }
  })

  CONFIG.EMAIL_LIST.forEach (function (emailAddress, index, array) {
    var mailOptions = {
      from: "gmail-invoker ✔ <stevenharradine@gmail.com>",
      to: emailAddress,
      subject: subject,
      text: body,
      html: body
    }

    // send mail with defined transport object
    transporter.sendMail(mailOptions, function(error, info){
      if (error){
        return console.log(error);
      } else {
        console.log("Message sent: " + info.response);
      }
    })
  })
}

function haveNotReactedToThisId (id, list) {
  for (i in list) {
    if (id == list[i].id) {
      return false
    }
  }

  return true
}

function getHeaders (name, headers) {
  for (i in headers) {
    if (name == headers[i].name) {
      return headers[i].value
    }
  }

  return undefined
}

/*****************************************************************************
 *                          Start Google OAuth                               *
 *****************************************************************************/
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var gmail = google.gmail('v1');

var SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'gmail-api-quickstart.json'

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}