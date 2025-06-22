const Config = require('../models/FeeConfig');
const ConfigType = require('../utils/config_type');
const { NotFoundError, BadRequestError } = require('../core/error.response');
const mongoose = require('mongoose');

class ConfigService {
  static async getConfigs() {
    try {
      const configs = await Config.find().limit(100).lean();
      return configs;
    } catch (error) {
      throw new Error(`Không thể lấy cấu hình: ${error.message}`, { statusCode: 500 });
    }
  }

  static async getDeliveryFeeConfig() {
    try {
      const config = await Config.findOne({ type: ConfigType.DELIVERY_FEE }).lean();
      if (!config) {
        throw new NotFoundError('Không tìm thấy cấu hình phí vận chuyển', 404);
      }
      return config;
    } catch (error) {
      throw error instanceof NotFoundError
        ? error
        : new Error(`Không thể lấy cấu hình phí vận chuyển: ${error.message}`, {
            statusCode: 500,
          });
    }
  }

  static async createConfig({ type, data, description }) {
    try {
      if (!type || !data) {
        throw new BadRequestError('Thiếu các trường bắt buộc: type, data', 400);
      }
      const validTypes = Object.values(ConfigType);
      const normalizedType = type.toUpperCase();
      if (!validTypes.includes(normalizedType)) {
        throw new BadRequestError(
          `Loại cấu hình không hợp lệ: ${type}. Các loại hợp lệ: ${validTypes.join(', ')}`,
          400
        );
      }

      if (normalizedType === ConfigType.DELIVERY_FEE) {
        // Kiểm tra dữ liệu
        if (
          typeof data.baseFee !== 'number' ||
          typeof data.additionalFeePerKm !== 'number' ||
          typeof data.surcharge !== 'number' ||
          data.baseFee < 0 ||
          data.additionalFeePerKm < 0 ||
          data.surcharge < 0
        ) {
          throw new BadRequestError(
            'Các trường baseFee, additionalFeePerKm, surcharge phải là số không âm',
            400
          );
        }

        // Kiểm tra xem cấu hình DELIVERY_FEE đã tồn tại
        const existingConfig = await Config.findOne({ type: ConfigType.DELIVERY_FEE });
        if (existingConfig) {
  
          return await this.updateConfig({
            id: existingConfig._id,
            type: normalizedType,
            data,
            description,
          });
        }
      }

      const config = await Config.create({ type: normalizedType, data, description });
      return config;
    } catch (error) {
      throw error instanceof BadRequestError
        ? error
        : new Error(`Không thể tạo/cập nhật cấu hình: ${error.message}`, { statusCode: 500 });
    }
  }

  static async updateConfig({ id, type, data, description }) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new BadRequestError(`ID không hợp lệ: ${id}`, 400);
      }
      if (!type || !data) {
        throw new BadRequestError('Thiếu các trường bắt buộc: type, data', 400);
      }
      const validTypes = Object.values(ConfigType);
      const normalizedType = type.toUpperCase();
      if (!validTypes.includes(normalizedType)) {
        throw new BadRequestError(
          `Loại cấu hình không hợp lệ: ${type}. Các loại hợp lệ: ${validTypes.join(', ')}`,
          400
        );
      }

      if (normalizedType === ConfigType.DELIVERY_FEE) {
        if (
          typeof data.baseFee !== 'number' ||
          typeof data.additionalFeePerKm !== 'number' ||
          typeof data.surcharge !== 'number' ||
          data.baseFee < 0 ||
          data.additionalFeePerKm < 0 ||
          data.surcharge < 0
        ) {
          throw new BadRequestError(
            'Các trường baseFee, additionalFeePerKm, surcharge phải là số không âm',
            400
          );
        }
      }

      const update = { type: normalizedType, data, description };
      const options = { new: true, runValidators: true };

      const config = await Config.findOneAndUpdate({ _id: id }, update, options);
      if (!config) {
        throw new NotFoundError(`Không tìm thấy cấu hình ${id}`, 404);
      }
      return config;
    } catch (error) {
      throw error instanceof BadRequestError || error instanceof NotFoundError
        ? error
        : new Error(`Không thể cập nhật cấu hình: ${error.message}`, { statusCode: 500 });
    }
  }

  static async deleteConfig(id) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new BadRequestError(`ID không hợp lệ: ${id}`, 400);
      }
      const config = await Config.findById(id);
      if (!config) {
        throw new NotFoundError(`Không tìm thấy cấu hình ${id}`, 404);
      }
      const deleted = await Config.findByIdAndDelete(id);
      return deleted;
    } catch (error) {
      throw error instanceof BadRequestError || error instanceof NotFoundError
        ? error
        : new Error(`Không thể xóa cấu hình: ${id}`, { statusCode: 500 });
    }
  }
}

module.exports = ConfigService;