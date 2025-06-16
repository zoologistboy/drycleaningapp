const express = require("express")
const { addUser, getAllUsers, getSingleUser, getUserByQuery } = require("../controllers/user")
const userRouter= express.Router()

userRouter.post("/", addUser)

userRouter.get("/", getAllUsers)

userRouter.get("/:id", getSingleUser)

userRouter.get("", getUserByQuery)


module.exports= userRouter