const AsyncHandler = require("express-async-handler");
const UserService = require("../services/user.service")

const createUser = async (req, res) => {
    const result = await UserService.createUser(req.body);

    if (!result.isSuccess) {
        return res.status(result.error.StatusCodes).json(
            ApiResponse('Missing required fields', null, StatusCodes.BAD_REQUEST, true)
        );
    }
}