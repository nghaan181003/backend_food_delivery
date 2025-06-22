const UpdatedDriver = require("../models/UpdatedDriver");
const DriverUpdateRequest = require("../models/DriverUpdateRequest");
const User = require("../models/User");
const CONSTANTS = require("../config/constants");
const { getRedis } = require("../dbs/init.redis")
const { getRouteDistance } = require("../services/openRoute.service")
const createDriver = async (
  userId,
  licensePlate,
  licenseFrontUrl,
  licenseBackUrl,
  profileUrl,
  provinceId,
  districtId,
  communeId,
  detailAddress
) => {
  return await UpdatedDriver.create({
    userId: userId,
    profileUrl: profileUrl,
    licensePlate,
    licenseFrontUrl: licenseFrontUrl,
    licenseBackUrl: licenseBackUrl,
    provinceId: provinceId,
    districtId: districtId,
    communeId: communeId,
    detailAddress: detailAddress,
  });
};

const getDriverByUserID = async (userId) => {
  try {
    const driver = await UpdatedDriver.findOne({ userId })
      .populate({
        path: "userId",
        model: "User",
      })
      .exec();

    if (!driver) {
      throw new Error("Driver not found for the given userId");
    }
    return driver;
  } catch (error) {
    console.error("Error fetching driver and user:", error);
    throw error;
  }
};

const updateDriverStatus = async (driverId, status) => {
  try {
    const updatedDriver = await UpdatedDriver.findOneAndUpdate(
      { _id: driverId },
      { status },
      { new: true }
    );

    if (!updatedDriver) {
      throw new Error("Driver not found.");
    }

    return updatedDriver;
  } catch (error) {
    console.error("Error updating driver status:", error);
    throw error;
  }
};

const createDriverUpdateRequest = async (data) => {
  return await DriverUpdateRequest.create(data);
};

const getAllDriverUpdateRequests = async () => {
  return await DriverUpdateRequest.find({ status: "pending" })
    .populate({
      path: "driverId",
      select: "licensePlate userId name",
      populate: {
        path: "userId",
        select: "name email phone",
      },
    })
    .select("licenseFrontUrl profileUrl licenseBackUrl licensePlate driverId status createdAt updatedAt name phone")
    .sort({ createdAt: -1 });
};

const approveDriverUpdateRequest = async (requestId) => {
  const request = await DriverUpdateRequest.findById(requestId).populate("driverId");
  if (!request) throw new Error("Yêu cầu cập nhật không tồn tại");

  if (request.status !== "pending") throw new Error("Yêu cầu đã được xử lý");

  const driver = await UpdatedDriver.findById(request.driverId._id);
  if (!driver) throw new Error("Không tìm thấy đối tác");

  const user = await User.findById(driver.userId);
  if (!user) throw new Error("Không tìm thấy người dùng");

  if (request.name) user.name = request.name;
  if (request.phone) user.phone = request.phone;
  await user.save();

  const updateFields = {};

  if (request.profileUrl) updateFields.profileUrl = request.profileUrl;
  if (request.licensePlate) updateFields.licensePlate = request.licensePlate;

  if (Object.keys(updateFields).length > 0) {
    await UpdatedDriver.updateOne(
      { _id: driver._id },
      { $set: updateFields }
    );
  }

  request.status = "approved";
  await request.save();

  const updatedDriver = await UpdatedDriver.findById(driver._id);

  return {
    message: "Yêu cầu cập nhật đã được duyệt",
    updatedDriver,
  };
};
const rejectDriverUpdateRequest = async (id) => {
  try {
    const updateRequest = await DriverUpdateRequest.findByIdAndUpdate(
      id,
      { status: "rejected" },
      { new: true }
    );

    if (!updateRequest) {
      return null;
    }

    return updateRequest;
  } catch (e) {
    throw new Error("Lỗi khi cập nhật trạng thái yêu cầu");
  }
};
const getDriverUpdateRequestsByUserId = async (userId) => {
  return await DriverUpdateRequest.find({})
    .populate({
      path: "driverId",
      select: "licensePlate userId name",
      populate: {
        path: "userId",
        select: "name email phone",
        match: { _id: userId },
      },
    })
    .select("licenseFrontUrl profileUrl licenseBackUrl licensePlate driverId status createdAt updatedAt name phone")
    .sort({ createdAt: -1 });
};


const updateDriverLocation1 = async (driverId, location) => {
  const key = CONSTANTS.KEYS.DRIVER_LOCATION + driverId;

  const locationData = {
    lat: location.lat,
    lng: location.lng,
    timestamp: Date.now(),
    accuracy: location.accuracy || 10
  };
  await getRedis().set(key, JSON.stringify(locationData));


  return locationData;


}

const getDriverLocation = async (driverId) => {
  const key = CONSTANTS.KEYS.DRIVER_LOCATION + driverId;
  const data = await getRedis().get(key);
  return data ? JSON.parse(data) : null;

}

const findNearByDrivers = async (location, radius) => {
  const pattern = CONSTANTS.KEYS.DRIVER_LOCATION + '*'
  const keys = await getRedis().keys(pattern)

  const nearbyDrivers = []

  for (const key of keys) {
    const driverId = key.replace(CONSTANTS.KEYS.DRIVER_LOCATION, '');
    const driverLocation = await getDriverLocation(driverId);

    if (driverLocation) {

      const distance = await getRouteDistance(
        [location.lng, location.lat], // start
        [driverLocation.lng, driverLocation.lat] // end

      )
      console.log("distance", distance)
      if (distance.distance_km <= radius) {
        nearbyDrivers.push({
          driverId,
          location: driverLocation,
          distance: distance.distance_km,
          duration_min: distance.duration_min,
        });
      }
    }


  }
  // return nearbyDrivers.sort((a, b) => a.distance - b.distance);
  return nearbyDrivers
}

const getSuggestionForDriver = async (driverId) => {
  const pattern = CONSTANTS.KEYS.ORDER_SUGGESTIONS + `${driverId}:*`;
  const redis = getRedis();

  const keys = await redis.keys(pattern);
  if (keys.length === 0) return [];

  const values = await redis.mget(keys);

  return values
    .map((val) => (val ? JSON.parse(val) : null))
    .filter((v) => v !== null);
}

const updateDriverLocation = async (userId, location) => {
  try {
    const updatedDriver = await UpdatedDriver.findOneAndUpdate(
      { userId },
      {
        $set: {
          location: {
            type: 'Point',
            coordinates: [location.coordinates[0], location.coordinates[1]],
            timestamp: new Date(location.timestamp),
          },
        },
      },
      { new: true, upsert: true } // Tạo mới nếu không tồn tại
    );

    if (!updatedDriver) {
      throw new Error("Driver not found.");
    }

    return updatedDriver;
  } catch (error) {
    console.error("Error updating driver location:", error);
    throw error;
  }
};


module.exports = {
  createDriver, getDriverByUserID, updateDriverStatus,
  createDriverUpdateRequest,
  getAllDriverUpdateRequests,
  approveDriverUpdateRequest,
  rejectDriverUpdateRequest,
  getDriverUpdateRequestsByUserId,
  updateDriverLocation1,
  getDriverLocation,
  findNearByDrivers,
  updateDriverLocation,
  getSuggestionForDriver
};


