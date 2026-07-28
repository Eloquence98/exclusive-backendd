const { BrevoClient } = require('@getbrevo/brevo');

// Initialize the client with your API key
const brevoClient = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY,
});

// Export the transactional emails service directly
module.exports = brevoClient.transactionalEmails;
