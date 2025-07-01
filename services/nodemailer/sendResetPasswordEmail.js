const transporter = require("./transporter"); // your nodemailer config

const sendResetPasswordEmail = async (email, userFirstName, token) => {
  const resetLink = `${process.env.client_domain}/reset-password/${token}`;

  const options = {
    to: email,
    subject: "Reset Your Password - CommercePlexus",
    from: "CommercePlexus <support@commerceplexus.com>",
    replyTo: "support@commerceplexus.com",
    html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Reset Password</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          max-width: 600px;
          margin: auto;
          background-color: #f9f9f9;
          color: #333;
        }
        .container {
          background-color: #fff;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 0 10px rgba(0,0,0,0.05);
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          margin: 20px 0;
          background-color: #3f51b5;
          color: #fff;
          text-decoration: none;
          border-radius: 5px;
        }
        .footer {
          font-size: 12px;
          text-align: center;
          margin-top: 30px;
          color: #777;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Hello ${userFirstName},</h2>
        <p>We received a request to reset your password for your CommercePlexus account.</p>
        <p>Please click the button below to reset your password:</p>
        <a href="${resetLink}" class="button">Reset Password</a>
        <p>If the button doesn't work, you can also copy and paste this URL into your browser:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>If you didn’t request this, you can safely ignore this email.</p>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} CommercePlexus. All rights reserved.
      </div>
    </body>
    </html>
    `,
    text: `Hi ${userFirstName},\n\nReset your CommercePlexus password using the following link:\n${resetLink}\n\nIf you didn’t request this, ignore this email.\n\n- CommercePlexus`
  };

  await transporter.sendMail(options);
};

module.exports = sendResetPasswordEmail;
