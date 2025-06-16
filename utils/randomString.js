const crypto = require("crypto")

const generateRandomString =(num=6)=>{
      const token = crypto.randomBytes(num).toString("hex")
      return token

}
module.exports = generateRandomString