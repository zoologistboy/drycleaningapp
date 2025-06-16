// const jwt = require("jsonwebtoken");
const userModel = require("../models/users");

const upload = (req, res, next)=>{

        if (!req.file) {
        return res.status(403).json({
            status: "error",
            message:"image is required"
        })
     }
    //  return res.send("testing seller")

    //  req.user = user
     next()
     console.log(req.body); 
     

}
module.exports = upload