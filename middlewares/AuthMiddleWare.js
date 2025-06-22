const dotenv = require("dotenv");
dotenv.config();
const jwt = require("jsonwebtoken");
const AsyncHandler = require("express-async-handler");
// const ApiError = require("../controllers/error/ApiError")
const User = require("../models/User");

const Auth = AsyncHandler(async (request, response, next) => {
    try {
        const token = request.headers.authorization.split(" ")[1]
        
        if (!token) {
            // return ApiError("Ban chua dang nhap",403)
            return response.status(403).json({
                message: "Ban chua dang nhap"
            })
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await User.findById(decoded.id)

        if (!user) {
            return response.status(403).json(
               {
                 message: "Token loi!"
               }
            )
        }

        if (user.role !== "admin") {
            response.status(400).json({
                message: "Ban khong co quyen lam viec nay"
            })
        }
        next()
    }
    catch(e){
        return response.json({
            name: e.name,
            message: e.message
        })
    }
});

module.exports = Auth;