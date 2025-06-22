const dotenv = require("dotenv");
dotenv.config();
const AsyncHandler = require("express-async-handler");
const Driver = require("../models/Driver");
const UpdatedDriver = require("../models/UpdatedDriver");
const User = require("../models/User");
const ApiError = require("./error/ApiError");
const { StatusCodes } = require("http-status-codes");
const ApiResponse = require("./response/ApiResponse");
const {
  returnMultipleFilePath,
  multipleFilesTransfer,
  removeFile,
} = require("../helpers/fileHelpers");

const { getDriverByUserID, updateDriverStatus, getDriverUpdateRequestsByUserId, updateDriverLocation, getSuggestionForDriver, updateDriverLocation1 } = require("../services/DriverServices");
const { SuccessResponse } = require("../core/success.response");

const createDriver = AsyncHandler(async (req, res) => {
  const { userId, licensePlate } = req.body;

  // is user exists
  const user = await User.findById(userId);

  if (!user || user.role !== "driver") {
    // If user not found
    // throw new ApiError("Driver is not found");
    return res
      .status(StatusCodes.NOT_FOUND)
      .json(ApiResponse("Driver is not found", null, StatusCodes.NOT_FOUND));
  }

  // An array to store new image paths
  let newImagePaths = [];

  // Check if files are included in the request
  if (req.files && Object.keys(req.files).length > 0) {
    if (req.files.multiple) {
      const imagePaths = await returnMultipleFilePath(req.files);
      if (imagePaths.length) {
        newImagePaths = await multipleFilesTransfer(imagePaths, `${userId}`);
      }
    }
  }

  const newDriver = await Driver.create({
    userId: userId,
    profileUrl: newImagePaths[0] || "",
    CCCD: [
      { type: "front", url: newImagePaths[1] || "" },
      { type: "back", url: newImagePaths[2] || "" },
    ],
    licensePlate: licensePlate,
  });

  if (!newDriver) {
    throw new ApiError(
      "Internal Server Error! Server failed creating new driver."
    );
  }
  res
    .status(StatusCodes.CREATED)
    .json(
      ApiResponse(
        "Driver created successfully.",
        { newDriver },
        StatusCodes.CREATED
      )
    );
});

const deleteDriver = AsyncHandler(async (req, res) => {
  const { id } = req.params;

  // is driver exists
  const driver = await Driver.findByIdAndDelete(id);
  if (!driver) {
    // If not found, throw error
    throw new ApiError("Driver is not found");
  }
  // remove profile images
  removeFile(driver.CCCD[0].url);
  removeFile(driver.CCCD[1].url);
  removeFile(driver.profileUrl);

  res
    .status(StatusCodes.OK)
    .json(ApiResponse("Driver deleted successfully.", StatusCodes.OK));
});

const updateDateDriver = AsyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId, licensePlate } = req.body;

  // is driver exists
  const driver = await Driver.findById(id);
  if (!driver) {
    // If not found, throw error
    throw new ApiError("Driver is not found");
  }

  // An array to store new image paths
  let newImagePaths = [];

  // Check if files are included in the request
  if (req.files && Object.keys(req.files).length > 0) {
    if (req.files.multiple) {
      const imagePaths = await returnMultipleFilePath(req.files);
      if (imagePaths.length) {
        newImagePaths = await multipleFilesTransfer(imagePaths, `${userId}`);
      }
    }
  }
  if (newImagePaths[0]) {
    // remove old profileUrl
    removeFile(driver.profileUrl);
    driver.profileUrl = newImagePaths[0];
  }
  if (newImagePaths[1] || newImagePaths[2]) {
    // remove old CCCD url
    removeFile(driver.CCCD[0].url);
    removeFile(driver.CCCD[1].url);
    driver.CCCD = [
      { type: "front", url: newImagePaths[1] || driver.CCCD[0]?.url },
      { type: "back", url: newImagePaths[2] || driver.CCCD[1]?.url },
    ];
  }
  driver.licensePlate = licensePlate;
  await driver.save();
  res
    .status(StatusCodes.OK)
    .json(ApiResponse("Driver updated successfully.", StatusCodes.OK));
});

const getDriverById = async (req, res) => {
  try {
    const { id } = req.params;
    const driver = await UpdatedDriver.findOne({ userId: id }).populate("userId");

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found with provided userId",
      });
    }

    res.status(200).json({
      success: true,
      message: "Driver fetched successfully",
      data: driver,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error occurred",
    });
  }
};

const getDriverByUserId = AsyncHandler(async (req, res) => {
  const { userId } = req.params;

  const driver = await getDriverByUserID(userId);

  res
    .status(StatusCodes.OK)
    .json(ApiResponse("Successfully.", driver, StatusCodes.OK));
});

const updateStatus = AsyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;

  if (typeof status !== 'boolean') {
    return res.status(StatusCodes.BAD_REQUEST).json(
      ApiResponse("Status must be a boolean.", null, StatusCodes.BAD_REQUEST)
    );
  }

  try {
    const updatedDriver = await updateDriverStatus(userId, status);

    res.status(StatusCodes.OK).json(
      ApiResponse("Driver status updated successfully.", updatedDriver, StatusCodes.OK)
    );
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      ApiResponse("Error updating driver status.", null, StatusCodes.INTERNAL_SERVER_ERROR)
    );
  }
});
const getDriverUpdatedRequestsById = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        status: "error",
        message: "userId is required",
        data: null,
        statusCode: 400,
        hasError: true,
      });
    }

    let requests = await getDriverUpdateRequestsByUserId(userId);

    requests = requests.filter((req) => req.driverId?.userId);

    const filteredRequests = requests.map((req) => {
      const updatedFields = {};

      if (req.profileUrl) updatedFields.profileUrl = req.profileUrl;
      if (req.licenseBackUrl) updatedFields.licenseBackUrl = req.licenseBackUrl;
      if (req.licenseFrontUrl) updatedFields.licenseFrontUrl = req.licenseFrontUrl;
      if (req.licensePlate) updatedFields.licensePlate = req.licensePlate;
      if (req.name) updatedFields.name = req.name;
      if (req.phone) updatedFields.phone = req.phone;

      return {
        _id: req._id,
        driverId: req.driverId?._id,
        name: req.driverId?.userId?.name || "Không có tên tài xế",
        email: req.driverId?.userId?.email || "Không thấy email",
        phone: req.driverId?.userId?.phone || "Không thấy số điện thoại",
        userId: req.driverId?.userId?._id,
        status: req.status,
        createdAt: req.createdAt,
        updatedAt: req.updatedAt,
        updatedFields,
      };
    });

    res.status(200).json({
      status: "success",
      message: "Filtered driver update requests by userId fetched",
      data: filteredRequests,
      statusCode: 200,
      hasError: false,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch driver update requests",
      data: null,
      statusCode: 500,
      hasError: true,
    });
  }
};

const updateDriverLocationController = async (req, res, next) => {
  const { driverId } = req.params
  const { lat, lng, accuracy } = req.body
  new SuccessResponse(
    {
      message: "Cập nhật vị trí tài xế",
      data: await updateDriverLocation1(driverId, {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        accuracy: accuracy || 10
      })
    }
  ).send(res)
}

const getSuggestionForDriverController = async (req, res, next) => {
  const { driverId } = req.params
  new SuccessResponse(
    {
      message: "Danh sách đơn hàng có thể gộp",
      data: await getSuggestionForDriver(driverId)
    }
  ).send(res)
}
const updateLocation = AsyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { location } = req.body;

  if (!location || !location.coordinates || !location.type || location.type !== 'Point') {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(ApiResponse("Invalid location data.", null, StatusCodes.BAD_REQUEST));
  }

  try {
    const updatedDriver = await updateDriverLocation(userId, location);
    res
      .status(StatusCodes.OK)
      .json(ApiResponse("Driver location updated successfully.", updatedDriver, StatusCodes.OK));
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(ApiResponse("Error updating driver location.", null, StatusCodes.INTERNAL_SERVER_ERROR));
  }
});

module.exports = {
  getSuggestionForDriverController,
  createDriver,
  deleteDriver,
  updateDateDriver,
  getDriverByUserId,
  getDriverById,
  updateStatus,
  getDriverUpdatedRequestsById,
  updateDriverLocationController,
  updateLocation
};

