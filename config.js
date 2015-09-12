module.exports.CODEWORD       = process.argv[2]
module.exports.SCRIPT         = "bash " + process.argv[3]
module.exports.EMAIL_PROVIDER = 'Gmail'
module.exports.EMAIL_USER     = 'youremail'
module.exports.EMAIL_PASSWORD = 'yourpassword'
module.exports.EMAIL_LIST     = process.argv.splice(4)
