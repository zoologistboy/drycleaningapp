const nodemailer = require("nodemailer")

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    service: "gmail",
    sucure:false,
    port:587,
    auth:{
        user: process.env.nodemailer_email,
        pass: process.env.nodemailer_pass
    }
})

module.exports = transporter

