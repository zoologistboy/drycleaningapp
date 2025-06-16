const transporter = require("./transporter");

const sendVerificationEmail = (email, userFirstName, token) => {
    const verificationLink = `${process.env.client_domain}/auth/verify/${token}`;
    
    const options = {
  to: email,
  subject: "Verify Your CommercePlexus Account",
  from: "CommercePlexus <support@commerceplexus.com>",
  replyTo: "support@commerceplexus.com",
  html: `
  <!DOCTYPE html>
  <html>
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification</title>
      <style>
          body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f4f4f4;
          }
          .container {
              background-color: #ffffff;
              padding: 30px;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          }
          .header {
              text-align: center;
              margin-bottom: 20px;
          }
          .logo {
              max-width: 160px;
          }
          .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #0d9488;
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              margin-top: 20px;
          }
          .footer {
              text-align: center;
              font-size: 12px;
              color: #888;
              margin-top: 30px;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">
              <img src="https://example.com/logo.png" alt="CommercePlexus Logo" class="logo" />
          </div>
          <h2>Hello ${userFirstName},</h2>
          <p>Welcome to <strong>CommercePlexus</strong> — your trusted dry cleaning and laundry partner.</p>
          <p>Before we get started, please verify your email address to activate your account:</p>

          <p style="text-align: center;">
              <a href="${verificationLink}" class="button">Verify My Email</a>
          </p>

          <p>If the button above doesn’t work, simply copy and paste the link below into your browser:</p>
          <p><a href="${verificationLink}">${verificationLink}</a></p>

          <p>If you didn’t sign up for a CommercePlexus account, no worries — you can safely ignore this message.</p>

          <div class="footer">
              <p>&copy; ${new Date().getFullYear()} CommercePlexus. All rights reserved.</p>
              <p>CommercePlexus, 101 Clean Street, Freshville, CPX 12345</p>
          </div>
      </div>
  </body>
  </html>
  `,
  text: `Hello ${userFirstName},

Welcome to CommercePlexus — your trusted dry cleaning and laundry partner.

Please verify your email by clicking the link below to activate your account:
${verificationLink}

If you didn’t create an account with us, you can safely ignore this message.

Best regards,  
The CommercePlexus Team`
};


    transporter.sendMail(options, (err, info) => {
        if (err) {
            console.error("Error sending verification email:", err.message);
        } else {
            console.log("Verification email sent successfully:", info.response);
        }
    });
};

module.exports = sendVerificationEmail;