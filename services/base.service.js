class BaseService {
    constructor(schema) {
        this.schema = schema
    }

    async getById(id) {
        try {
            return await this.schema.findById(id).exec();
        }
        catch (error) {
            throw new Error(error.message);
        }
    }

    async create(data) {
        try {
            const newItem = new this.schema(data);
            await newItem.save();
            return newItem;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async update(id, data) {
        try {
            return await this.schema.findByIdAndUpdate(id, data, { new: true }).exec();
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async delete(id) {
        try {
            return await this.schema.findByIdAndDelete(id).exec();
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async getAll() {
        try {
            return await this.schema.find().exec();
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = BaseService;