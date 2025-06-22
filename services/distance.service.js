const { getRoadDistanceBetweenPoints } = require('./location.service');
const logger = require('../utils/logger');

class DistanceService {
  static async calculateDistance({ point1, point2 }) {
    try {
      if (!point1 || !point2 || !point1.lat || !point1.lng || !point2.lat || !point2.lng) {
        throw new Error('Thiếu tọa độ hợp lệ cho point1 hoặc point2');
      }

      const result = await getRoadDistanceBetweenPoints(point1, point2);
      logger.info(`Tính khoảng cách: ${result.distance} km`);

      return {
        distance: result.distance,
        distanceUnit: result.distanceUnit,
        duration: result.duration,
        formattedDuration: result.formattedDuration,
      };
    } catch (error) {
      logger.error(`Lỗi khi tính khoảng cách: ${error.message}`);
      throw new Error(`Không thể tính khoảng cách: ${error.message}`);
    }
  }
}

module.exports = DistanceService;