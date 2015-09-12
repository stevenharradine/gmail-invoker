# GMail Invoker
Will run scripts based on codewords in your gmail

## Clone the repo
```
git clone https://github.com/stevenharradine/gmail-invoker.git
```

## install npm modules
```
npm install
```

## enable the google API and get client_secret.json
 - Use [this wizard](https://console.developers.google.com/start/api?id=drive) to create or select a project in the Google Developers Console and automatically enable the API. Click the **Go to credentials** button to continue.
 - At the top of the page, select the **OAuth consent screen** tab. Select an **Email address**, enter a **Product name** if not already set, and click the **Save** button.
 - Back on the **Credentials** tab, click the **Add credentials** button and select **OAuth 2.0 client ID**.
 - Select the application type **Other** and click the **Create** button.
 - Click **OK** to dismiss the resulting dialog.
 - Click the  (Download JSON) button to the right of the client ID. Move this file to your working directory and rename it `client_secret.json`.

Source: https://developers.google.com/drive/web/quickstart/nodejs

## update your username and password in config.js to send emails
```
module.exports.EMAIL_USER     = 'youremail'
module.exports.EMAIL_PASSWORD = 'yourpassword'
```

## run gmail invoker
```
node gmail-invoker {{ codeword }} {{ script_path }} [{{ email_addresses }}]
```

Example:
```
node gmail-invoker TOPSECRET ./scripts/hello.sh first@email.com second@email.com third@email.com
```