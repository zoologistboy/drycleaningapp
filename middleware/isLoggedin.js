const jwt = require("jsonwebtoken");
const userModel = require("../models/users");

const isLoggedIn = async(req, res, next)=>{
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")){
        token = req.headers.authorization.split(" ")[1]
        console.log(token);
        
    }
    if (!token) {
        return res.status(403).json({
            status: "error",
            message:"you need a token to access this page/ you need to log in"
        })
    }
    const decoded = jwt.verify(token, process.env.jwt_secret)
    console.log(decoded);

     const user = await userModel.findById(decoded.id)
     if(!user){
        return res.status(404).json({
            status:"error",
            message:"this token belongs to no one"
        })
     }
     req.user = user
     next()

    

    // return res.send("testing token")
    // next()
}
module.exports = isLoggedIn