const mongoose = require("mongoose")
require("dotenv").config()

const mongoURL = process.env.MONGODB_URL

const connectToDatabase = async()=>{
   try {
      const connected = await mongoose.connect(mongoURL)
      if (connected) {
        console.log("mongodb is connected");
        
      }
   } catch (error) {
    console.log(error);
    
   }
}
module.exports = connectToDatabase