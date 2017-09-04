const https = require("https");

// Make sure to declare SLACK_WEBHOOK_PATH in your Environment
// variables at // https://www.twilio.com/console/runtime/functions/configure

exports.handler = (context, event, callback) => {
  // Extract the bits of the message we want
  const { To, From, Body } = event;

  // Construct a payload for slack's incoming webhooks
  const slackBody = JSON.stringify({
    attachments: [
      {
        fallback: `${From}: ${Body}`,
        text: `Received SMS from ${From}`,
        fields: [
          {
            title: "Sender",
            value: From,
            short: true
          },
          {
            title: "Receiver",
            value: To,
            short: true
          },
          {
            title: "Message",
            value: Body,
            short: false
          }
        ],
        color: "#5555AA"
      }
    ]
  });

  // Form our request specification
  const options = {
    host: "hooks.slack.com",
    port: 443,
    path: context.SLACK_WEBHOOK_PATH,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": slackBody.length
    }
  };

  // send the request
  const post = https.request(options, res => {
    // only respond once we're done, or Twilio's functions
    // may kill our execution before we finish.
    res.on("end", () => {
      // respond with an empty message
      callback(null, new Twilio.twiml.MessagingResponse());
    });
  });
  post.write(slackBody);
  post.end();
};
