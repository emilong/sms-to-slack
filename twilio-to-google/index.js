const datastore = require("@google-cloud/datastore")();
const twilio = require("twilio");
const MessagingResponse = twilio.twiml.MessagingResponse;
const request = require("requestretry");

/* Twilio-specific code */
function sendNullResponse(res) {
  res.status(200).type("text/xml").end(new MessagingResponse().toString());
}

function validateRequest(req, { twilioAuthToken, cloudFunctionUrl }) {
  return twilio.validateExpressRequest(req, twilioAuthToken, {
    url: cloudFunctionUrl
  });
}

function extractSms(req) {
  return {
    receiver: req.body.To,
    sender: req.body.From,
    message: req.body.Body
  };
}

/* Slack-specific code */
function sendSlackNotification(slackWebhookUrl, { receiver, sender, message }) {
  return request.post({
    url: slackWebhookUrl,
    json: true,
    body: {
      attachments: [
        {
          fallback: `${sender}: ${message}`,
          text: `Received SMS from ${sender}`,
          fields: [
            {
              title: "Sender",
              value: sender,
              short: true
            },
            {
              title: "Receiver",
              value: receiver,
              short: true
            },
            {
              title: "Message",
              value: message,
              short: false
            }
          ],
          color: "#5555AA"
        }
      ]
    }
  });
}

/* Google-specific code */

function getConfiguration() {
  const key = datastore.key(["cloud-function-secrets", "twilio-to-slack"]);
  return (
    datastore
      .get(key)
      // unwrap response from array
      .then(response => response[0])
  );
}

exports.entryPoint = (req, res) => {
  return getConfiguration()
    .then(configuration => {
      if (!validateRequest(req, configuration)) {
        console.log("validation failed");
        res.status(403).send("Failed to validate request").end();
        return;
      }

      const { slackWebhookUrl } = configuration;
      const sms = extractSms(req);

      return sendSlackNotification(slackWebhookUrl, sms).then(() =>
        sendNullResponse(res)
      );
    })
    .catch(err => {
      console.log("failed response: ", JSON.stringify(err));
      res.status(500).end();
    });
};
