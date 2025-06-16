const jwt = require("jsonwebtoken")
const dotenv = require("dotenv")
dotenv.config() 

const secretKey = process.env.jwt_secret

const expireIn = process.env.jwt_expires_in
 

const generateToken = (user)=>{
   try {
      const accessToken =  jwt.sign(
         {id:user._id, email:user.email},
            secretKey,
         {expiresIn:expireIn}
      )
      return accessToken
   } catch (error) {
      console.error("JWT generation error:", error);
      throw error; 
   }
}
module.exports = generateToken