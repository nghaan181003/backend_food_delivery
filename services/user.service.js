const ApiError = require("../controllers/error/ApiError");
const User = require("../models/User");
const { Result } = require("../utils/result");
const BaseService = require("./base.service");

class UserService extends BaseService {
    constructor() {
        super(User)
    }

    async createUser(data) {
        try {
            const existingUser = await this.isExisting(data.email, data.role);
            if (existingUser) {
                return Result.failure(new ApiError("User already exists", 409));
            }
            else {
                const result = await this.create(data);
                return Result.success(result);
            }
        }
        catch (e) {
            return Result.failure(new Error(e))
        }
    }

    async isExisting({ email, role }) {
        try {
            return await this.schema.findOne({ email, role, isDeleted: false });
        }
        catch (error) {
            throw new Error(error.message);
        }
    }


}

module.exports = new UserService();