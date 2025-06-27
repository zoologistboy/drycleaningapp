const express = require("express")
const app = express()
require("./config/connectDb")()
require("dotenv").config()

const portNumber = process.env.PORT_NUMBER

app.listen(portNumber,()=>{
    console.log("app is listening to port");
})


const cors = require("cors")
const morgan = require("morgan")
app.use(morgan("dev"))


app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended: true}))


require("./services/nodemailer/transporter")

const errorHandler = require("./middleware/errorHandler")
const authRouter = require("./routes/authRouter")
const userRouter = require("./routes/userRouter")





app.use("/api/auth", authRouter)


app.use("/api/users", userRouter)

app.all("{*any}", (req, res)=>{
   res.send(`${req.method} ${req.originalUrl} is not an endpoint on this server`)
})

app.use(errorHandler)



