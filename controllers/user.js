const userModel = require("../models/users")

const addUser = async(req, res)=>{
            console.log(req.body);
            

    try {


        const user = await userModel.create(req.body)
        if(!user){
            return res.status(400).json({
                status: "error",
                message: "user was not created"
            })
        }
        res.status(200).json({
            status: "sucessful",
            message:"user was created",
            user
        })
    } catch (error) {
        console.log(error);
        res.status(500)
        
    }
    
    console.log(user);
    
    
}

const getAllUsers = async (req, res)=>{
    try {


        const user = await userModel.find()
        if(!user){
            return res.status(400).json({
                status: "error",
                message: "users not fetched"
            })
        }
        res.status(200).json({
            status: "sucessful",
            message:"user fetched!",
            user
        })
    } catch (error) {
        console.log(error);
        res.status(500)
        
    }
    
    
    
    // console.log(user);
}

const getSingleUser = async(req, res)=>{
    const {id} = req.params
    if (!id || id.length < 24) {
        return res.status(400).json({
            status: "error",
            message: "Please enter a valid user ID"
        });
    }
    try {
        const user = await userModel.findById(id);
        if (!user) {
            return res.status(404).json({
                status:"error",
                message: "User not found"

            })
        }
        res.status(200).json({
            status: "successful",
            message:"user fetched!",
            user
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({
            status: "error",
            message: "Server error"
        })
        
    }
}

const getUserByQuery = async(req, res)=>{
    const {email} = req.query

    if (!email) {
        return res.status(400).json({
            message: "email not found!"
        })
    }
    try {
        const user = await userModel.findOne({email})
        if (!user) {
            return res.status(404).json({
                status: "error",
                message: "user not found!"
            })
            
        }
        res.status(200).json({
            status: "successful",
            message: "user fetched!",
            user
        })

    } catch (error) {
        console.log(error);
        res.status(500).json({
            status:'Error',
            message:'server error'
        })
        
    }
}




const deleteUser = (req, res)=>{
    res.json("deleted user")
}

module.exports = {
    getAllUsers,
    getSingleUser,
    deleteUser,
    addUser,
    getUserByQuery
}



