const handleduplicateError = (err)=>{
    const errorKey = Object.keys(err.keyValue)[0]
    const errorValue = Object.values(err.keyValue)[0]
    const error = new Error(`${errorKey} of ${errorValue} already exists`)


    return{
        statusCode: 400,
        message: error.message
    }
}


const errorHandler = (err, req, res, next)=>{
    if(err.code === 11000){
        const error = handleduplicateError(err)
        res.status(error.statusCode).json({
            message: error.message
        })}
    else if (err.name === "ValidationError") {
        res.json("its a validation error")
    }
    else if (err.name === "CastError") {
        res.json("its a Cast error")
    }    
    else{
        res.status(500).json({
            message: "something went wrong",
            errorName: err.name,
            errorCode: err.code
        })
    }
}
module.exports= errorHandler