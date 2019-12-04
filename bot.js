const Botkit = require('botkit');
// Load process.env values from .env file
require('dotenv').config();

const dialogflowMiddleware = require('botkit-middleware-dialogflow')({
  keyFilename: './dialogflow-service-account.json',  // service account private key file from Google Cloud Console
  lang: 'en'
});

const dashbot = require('dashbot')(process.env.DASHBOT_TOKEN).slack;

const Botanalytics = require('botanalytics').SlackEventApi(process.env.BOTANALYTICS_TOKEN, process.env.BOT_TOKEN);

let config = {
  json_file_store: './data_store/',
  debug: true,
  clientSigningSecret: process.env.CLIENT_SIGNING_SECRET
};

if (process.env.MONGO_URI) {
    var BotkitStorage = require('botkit-storage-mongo');
    config['storage'] = BotkitStorage({mongoUri: process.env.MONGO_URI});
}

const controller = new Botkit.slackbot(config);

controller.configureSlackApp({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  clientSigningSecret: process.env.CLIENT_SIGNING_SECRET,
  scopes: ['bot'],
})

controller.setupWebserver(process.env.PORT || 3000,function(err,webserver) {
    controller.createWebhookEndpoints(controller.webserver);

    controller.createOauthEndpoints(controller.webserver,function(err,req,res) {
        if (err) {
            res.status(500).send('ERROR: ' + err);
        } else {
            res.send('Success!');
        }
    });
});

controller.middleware.send.use(function(bot, message, next) {
  Botanalytics.log(message);
  dashbot.send(bot, message, next);
});

controller.middleware.receive.use(function(bot, message, next) {
  Botanalytics.log(message);
  dashbot.receive(bot, message, function() {
    dialogflowMiddleware.receive(bot, message, next);
  });
});

// BEGIN EDITING HERE!

controller.on('bot_channel_join', function (bot, message) {
    bot.reply(message, "I'm here!")
});

controller.on('direct_message', function (bot, message) {
  let txt = 'Can you repeat it again!'

  if (message.nlpResponse && message.nlpResponse.queryResult && message.nlpResponse.queryResult.fulfillmentText) {
    txt = message.nlpResponse.queryResult.fulfillmentText;
  }
    bot.reply(message, txt);
});
