var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');

var SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'gmail-api-quickstart.json';

var CODEWORD = "codeword"

// Load client secrets from a local file.
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the
  // Gmail API.
  authorize(JSON.parse(content), listLabels);
});

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

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listLabels(auth) {
  var gmail = google.gmail('v1')

  // get all messages from the INBOX
  gmail.users.messages.list({
    auth: auth,
    userId: 'me',
    id: 'INBOX'
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err)
      return
    }
    var messages = response.messages

    if (messages.length == 0) {
      console.log('No messages found.')
    } else {
      var alreadyRactedTo = JSON.parse(fs.readFileSync("alreadyRactedTo.json", 'utf8'));

      console.log('Messages:')
      for (var i = 0; i < messages.length; i++) {
        var message = messages[i]

        // get this message contents
        gmail.users.messages.get({
          auth: auth,
          userId: 'me',
          id: message.id
        }, function(err, response) {
          if (err) {
            console.log('The API returned an error: ' + err)
            return
          }

          if (response.payload.body.data && haveNotReactedToThisId (message.id, alreadyRactedTo))
            var email_contents = new Buffer (response.payload.body.data, 'base64').toString()

            if (email_contents && email_contents.indexOf(CODEWORD) >= 0) {
              console.log ("      ID: " + message.id)
              console.log ("Contents: " + email_contents)

              alreadyRactedTo.push ({"id":message.id})

              fs.writeFile("alreadyRactedTo.json", JSON.stringify(alreadyRactedTo), function(err) {
                  if(err) {
                      return console.log(err)
                  }

                  console.log("The file was saved!")
              })
            }
        })
      }
    }
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