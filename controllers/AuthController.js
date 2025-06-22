const dotenv = require("dotenv");
dotenv.config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const transporter = require("../config/nodemailer");
const AsyncHandler = require("express-async-handler");
const { StatusCodes } = require("http-status-codes");
const {SuccessResponse, PAGINATED} = require("../core/success.response")

const User = require("../models/User");
const UpdatedDriver = require("..//models/UpdatedDriver");
const ApiError = require("./error/ApiError");
const ApiResponse = require("./response/ApiResponse");

// Services
const { isUserExists, createUser } = require("../services/UserServices");
const { createDriver, createDriverUpdateRequest, getAllDriverUpdateRequests, approveDriverUpdateRequest, rejectDriverUpdateRequest } = require("../services/DriverServices");
const UpdatedPartner = require("../models/UpdatedPartner");
const { createPartner, createUpdateRequest, getAllUpdateRequests, approveUpdateRequest, rejectUpdateRequest, getUpdateRequestsByUserId } = require("../services/PartnerServices");

const {
  returnSingleFilePath,
  singleFileTransfer,
} = require("../helpers/fileHelpers");

const AuthService = require('../services/auth.service');
const EmailService = require('../services/email.service');

const register = async (req, res) => {
  const { name, email, password, role, phone } = req.body;

  // Kiểm tra dữ liệu đầu vào
  if (!name || !email || !password || !role || !phone) {
    return res.status(StatusCodes.BAD_REQUEST).json(
      ApiResponse('Missing required fields', null, StatusCodes.BAD_REQUEST, true)
    );
  }
  const result = await AuthService.register( name, email, password, role, phone );
  if (!result.isSuccess) {
    const error = result.error;
    return res.status(error.statusCode).json(
      ApiResponse(error.message, null, error.statusCode, true)
    );
  }

  const {user, otp} = result.value;

  // send OTP via email
  const emailResult = await EmailService.sendOtpEmail(email, otp);
  if (!emailResult.isSuccess) {
    return res.status(StatusCodes.CREATED).json(
      ApiResponse('Đăng ký thành công nhưng gửi OTP thất bại', user, StatusCodes.CREATED)
    );
  }

  res.status(StatusCodes.CREATED).json(
    ApiResponse('Đăng ký thành công', user, StatusCodes.CREATED)
  );
}

const driverRegister = AsyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    licensePlate,
    provinceId,
    districtId,
    communeId,
    detailAddress,
  } = req.body;

  const role = "driver";
  const userExists = await isUserExists(email, role);

  if (userExists)
    return res
      .status(StatusCodes.CONFLICT)
      .json(
        ApiResponse(
          "Địa chỉ email đã được đăng ký!",
          null,
          StatusCodes.CONFLICT,
          true
        )
      );

  // Hash password
  const salt = await bcrypt.genSalt();
  const hashedPassword = await bcrypt.hash(password, salt);

  // Generate OTP
  const { otp, otpExpires } = generateOtp();

  const user = await createUser(
    name,
    email,
    hashedPassword,
    role,
    phone,
    otp,
    otpExpires
  );

  if (!user) {
    throw new ApiError(
      "Internal Server Error! Server failed creating new user."
    );
  }

  transporter.sendMail(
    {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Xác thực OTP",
      text: `Mã OTP của bạn là: ${otp}`,
    },
    (error, info) => {
      if (error) {
        console.log("Error:", error);
      } else {
        console.log("Email sent:", info.response);
      }
    }
  );

  let profileUrl = "";
  let licenseFrontUrl = "";
  let licenseBackUrl = "";

  if (req.files) {
    profileUrl = req.files.profileUrl[0].path;
    licenseFrontUrl = req.files.licenseFrontUrl[0].path;
    licenseBackUrl = req.files.licenseBackUrl[0].path;
  }

  const newDriver = await createDriver(
    user._id,
    licensePlate,
    licenseFrontUrl,
    licenseBackUrl,
    profileUrl,
    provinceId,
    districtId,
    communeId,
    detailAddress
  );

  // const data = await getDriverWithUserDetails(newDriver._id);

  res
    .status(StatusCodes.CREATED)
    .json(
      ApiResponse(
        "Đăng ký tài xế thành công!",
        newDriver,
        StatusCodes.CREATED
      )
    );
});

const partnerRegister = AsyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    provinceId,
    districtId,
    communeId,
    detailAddress,
    fullAddress,
    latitude,
    longitude,
    description,
  } = req.body;

  const role = "partner";
  const userExists = await isUserExists(email, role, false);

  if (userExists)
    return res
      .status(StatusCodes.CONFLICT)
      .json(
        ApiResponse(
          "Địa chỉ email đã được đăng ký",
          null,
          StatusCodes.CONFLICT,
          true
        )
      );

  // Hash password
  const salt = await bcrypt.genSalt();
  const hashedPassword = await bcrypt.hash(password, salt);

  // Generate OTP
  const { otp, otpExpires } = generateOtp();

  const user = await createUser(
    name,
    email,
    hashedPassword,
    role,
    phone,
    otp,
    otpExpires
  );

  if (!user) {
    throw new ApiError(
      "Internal Server Error! Server failed creating new user."
    );
  }

  transporter.sendMail(
    {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Xác thực OTP",
      text: `Mã OTP của bạn là: ${otp}`,
    },
    (error, info) => {
      if (error) {
        console.log("Error:", error);
      } else {
        console.log("Email sent:", info.response);
      }
    }
  );

  let avatarUrl = "";
  let storeFront = "";
  let CCCDFrontUrl = "";
  let CCCDBackUrl = "";

  if (req.files) {
    avatarUrl = req.files.avatarUrl[0].path;
    storeFront = req.files.storeFront[0].path;
    CCCDFrontUrl = req.files.CCCDFrontUrl[0].path;
    CCCDBackUrl = req.files.CCCDBackUrl[0].path;
  }

  const newPartner = await createPartner(
    user._id,
    description,
    provinceId,
    districtId,
    communeId,
    detailAddress,
    fullAddress,
    latitude,
    longitude,
    avatarUrl,
    storeFront,
    CCCDFrontUrl,
    CCCDBackUrl
  );

  // const data = await getDriverWithUserDetails(newDriver._id);
  console.log("REGISTER newPartner:", newPartner);
  res
    .status(StatusCodes.CREATED)
    .json(
      ApiResponse(
        "Đăng ký đổi tác thành công",
        newPartner,
        StatusCodes.CREATED
      )
    );
});
/**
 * @desc authenticate user (login)
 * @route POST /api/v1/auth/login
 * @access public
 */
const login = AsyncHandler(async (req, res) => {
  const { email, password, role } = req.body;

  // check for user email
  const user = await isUserExists(email, role);
  const authenticate = user && (await bcrypt.compare(password, user.password));

  if (!authenticate) {
    res
      .status(StatusCodes.UNAUTHORIZED)
      .json(
        ApiResponse(
          "Tài khoản không tồn tại!",
          null,
          StatusCodes.UNAUTHORIZED,
          true
        )
      );
  }

  if (user.otp !== null || user.otpExpires !== null) {
    // throw new ApiError("User is unauthorized!", StatusCodes.UNAUTHORIZED);
    res
      .status(StatusCodes.UNAUTHORIZED)
      .json(
        ApiResponse(
          "Tài khoản chưa xác thực",
          null,
          StatusCodes.UNAUTHORIZED,
          true
        )
      );
  }

  if (!user.status || user.isDeleted) {
    // throw new ApiError("Pending...", StatusCodes.UNAUTHORIZED);
    res
      .status(StatusCodes.UNAUTHORIZED)
      .json(
        ApiResponse(
          "Hồ sơ đang chờ duyệt...",
          null,
          StatusCodes.UNAUTHORIZED,
          true
        )
      );
  }

  const responseData = {
    user,
    token: generateToken(user._id),
  };

  res
    .status(StatusCodes.OK)
    .json(ApiResponse("Đăng nhập thành công!", responseData));
});

const resendOTP = AsyncHandler(async (req, res) => {
  const { email, role } = req.body;

  // is user exists
  const userExists = await isUserExists(email, role);

  if (!userExists) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json(
        ApiResponse(
          "Địa chỉ email chưa được đăng ký!",
          null,
          StatusCodes.UNAUTHORIZED,
          true
        )
      );
  }

  if (userExists.otp == null || userExists.otpExpires == null)
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json(
        ApiResponse(
          "Tài khoản đã được xác thực!",
          null,
          StatusCodes.UNAUTHORIZED,
          true
        )
      );

  // Generate OTP
  const { otp, otpExpires } = generateOtp();

  userExists.otp = otp;
  userExists.otpExpires = otpExpires;

  await userExists.save();

  // send OTP via email
  transporter.sendMail(
    {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Xác thực OTP",
      text: `Mã OTP của bạn là: ${otp}`,
    },
    (error, info) => {
      if (error) {
        console.log("Error:", error);
      } else {
        console.log("Email sent:", info.response);
      }
    }
  );

  res.status(StatusCodes.OK).json(ApiResponse("Mã OTP đã được gửi lại!"));
});

const resetPassword = AsyncHandler(async (req, res) => {
  const { email, role } = req.body;

  // is user exists
  const userExists = await isUserExists(email, role);

  if (!userExists) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json(
        ApiResponse(
          "Địa chỉ email chưa được đăng ký!",
          null,
          StatusCodes.UNAUTHORIZED,
          true
        )
      );
  }

  // Generate password as OTP
  const { otp, otpExpires } = generateOtp();

  // Hash password
  const salt = await bcrypt.genSalt();
  const hashedPassword = await bcrypt.hash(otp, salt);
  userExists.password = hashedPassword;

  await userExists.save();

  // send OTP via email
  transporter.sendMail(
    {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Reset mật khẩu",
      text: `Mật khẩu mới của bạn là: ${otp}`,
    },
    (error, info) => {
      if (error) {
        console.log("Error:", error);
      } else {
        console.log("Email sent:", info.response);
      }
    }
  );

  res.status(StatusCodes.OK).json(ApiResponse("Reset mật khẩu thành công!"));
});

const verifyOtp = AsyncHandler(async (req, res) => {
  const { email, otp, role } = req.body;

  const userExists = await isUserExists(email, role);
  if (!userExists)
    throw new ApiError("User not found!", StatusCodes.UNAUTHORIZED);

  if (userExists.otp !== otp) throw new ApiError("Mã OTP không hợp lệ");

  if (new Date() > new Date(userExists.otpExpires))
    throw new ApiError("OTP hết hạn");

  userExists.otp = null;
  userExists.otpExpires = null;

  await userExists.save();

  res.status(StatusCodes.OK).json(ApiResponse("Xác thực OTP thành công"));
});

const changePassword = AsyncHandler(async (req, res) => {
  const { id, oldPassword, newPassword } = req.body;

  const user = await User.findById(id);

  const authenticate =
    user && (await bcrypt.compare(oldPassword, user.password));

  if (!authenticate) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json(
        ApiResponse(
          "Mật khẩu cũ không đúng!",
          null,
          StatusCodes.UNAUTHORIZED,
          true
        )
      );
  }
  // Hash password
  const salt = await bcrypt.genSalt();
  const hashedPassword = await bcrypt.hash(newPassword, salt);
  user.password = hashedPassword;
  await user.save();

  return res
    .status(StatusCodes.OK)
    .json(ApiResponse("Đổi mật khẩu thành công", user, StatusCodes.OK));
});

/**
 * @desc get currently authenticated user (login)
 * @route GET /api/v1/auth/me
 * @access private
 */
const getCurrentUser = AsyncHandler(async (req, res) => {
  const responseData = req.user;

  res
    .status(StatusCodes.OK)
    .json(ApiResponse("Current user data.", { user: responseData }));
});

/**
 * @desc generate JWT
 */
const generateToken = (id) => {
  const options = {
    expiresIn: "1d",
  };
  return jwt.sign({ id }, process.env.JWT_SECRET, options);
};

const generateOtp = () => {
  const otp = crypto.randomInt(1000, 9999).toString(); // Random 6-digit OTP
  const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry
  return { otp, otpExpires };
};

module.exports = generateOtp;

const createPartnerUpdateRequest = async (req, res) => {
  try {
    const {
      description,
      provinceId,
      districtId,
      communeId,
      detailAddress,
      name,
      phone
    } = req.body;

    const userId = req.params.userId;

    if (!userId) {
      return res.status(400).json(
        ApiResponse("userId is required in URL params", null, 400, true)
      );
    }

    const partner = await UpdatedPartner.findOne({ userId });
    if (!partner) {
      return res
        .status(404)
        .json(ApiResponse("Partner not found for this userId", null, 404, true));
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json(ApiResponse("User not found", null, 404, true));
    }

    const files = req.files || {};
    const avatarUrl = files.avatarUrl?.[0]?.path || "";
    const storeFront = files.storeFront?.[0]?.path || "";
    const CCCDFrontUrl = files.CCCDFrontUrl?.[0]?.path || "";
    const CCCDBackUrl = files.CCCDBackUrl?.[0]?.path || "";

    const updatedFields = {};
    let hasNameChanged = false;
    let hasPhoneChanged = false;

    if (description && description !== partner.description) {
      updatedFields.description = description;
    }

    if (provinceId && provinceId !== String(partner.provinceId)) {
      updatedFields.provinceId = provinceId;
    }

    if (districtId && districtId !== String(partner.districtId)) {
      updatedFields.districtId = districtId;
    }

    if (communeId && communeId !== String(partner.communeId)) {
      updatedFields.communeId = communeId;
    }

    if (detailAddress && detailAddress !== partner.detailAddress) {
      updatedFields.detailAddress = detailAddress;
    }

    if (avatarUrl && avatarUrl !== partner.avatarUrl) {
      updatedFields.avatarUrl = avatarUrl;
    }

    if (storeFront && storeFront !== partner.storeFront) {
      updatedFields.storeFront = storeFront;
    }

    if (CCCDFrontUrl && CCCDFrontUrl !== partner.CCCDFrontUrl) {
      updatedFields.CCCDFrontUrl = CCCDFrontUrl;
    }

    if (CCCDBackUrl && CCCDBackUrl !== partner.CCCDBackUrl) {
      updatedFields.CCCDBackUrl = CCCDBackUrl;
    }

    if (name && name !== user.name) {
      hasNameChanged = true;
    }

    if (phone && phone !== user.phone) {
      hasPhoneChanged = true;
    }

    if (Object.keys(updatedFields).length === 0 && !hasNameChanged && !hasPhoneChanged) {
      return res
        .status(400)
        .json(ApiResponse("Không có trường nào được thay đổi", null, 400, true));
    }

    const request = await createUpdateRequest({
      partnerId: partner._id,
      ...updatedFields,
      ...(hasNameChanged ? { name } : {}),
      ...(hasPhoneChanged ? { phone } : {}),
      status: "pending",
    });

    return res
      .status(201)
      .json(ApiResponse("Update request submitted", request, 201));
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json(ApiResponse("Internal server error", null, 500, true));
  }
};

const getAllPartnerUpdateRequests = async (req, res) => {
  try {
    const requests = await getAllUpdateRequests();

    const filteredRequests = requests.map((req) => {
      const updatedFields = {};

      if (req.avatarUrl) updatedFields.avatarUrl = req.avatarUrl;
      if (req.storeFront) updatedFields.storeFront = req.storeFront;
      if (req.CCCDFrontUrl) updatedFields.CCCDFrontUrl = req.CCCDFrontUrl;
      if (req.CCCDBackUrl) updatedFields.CCCDBackUrl = req.CCCDBackUrl;
      if (req.description) updatedFields.description = req.description;
      if (req.schedule && req.schedule.length > 0) updatedFields.schedule = req.schedule;
      if (req.name) updatedFields.name = req.name;
      if (req.phone) updatedFields.phone = req.phone;

      return {
        _id: req._id,
        partnerId: req.partnerId?._id,
        name: req.partnerId?.userId?.name || "Không có tên quán",
        email: req.partnerId?.userId?.email || "Không thấy email",
        phone: req.partnerId?.userId?.phone || "Không thấy số điện thoại",
        userId: req.partnerId?.userId?._id,
        status: req.status,
        createdAt: req.createdAt,
        updatedAt: req.updatedAt,
        updatedFields,
      };
    });

    res.status(200).json({
      status: "success",
      message: "Filtered update requests fetched",
      data: filteredRequests,
      statusCode: 200,
      hasError: false,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch update requests",
      data: null,
      statusCode: 500,
      hasError: true,
    });
  }
};
const handleApproveRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    if (!requestId) {
      return res.status(400).json({
        status: "error",
        message: "Thiếu requestId trong params",
        data: null,
        statusCode: 400,
        hasError: true,
      });
    }

    const result = await approveUpdateRequest(requestId);

    return res.status(200).json({
      status: "success",
      message: result.message,
      data: result.updatedPartner,
      statusCode: 200,
      hasError: false,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message || "Lỗi server",
      data: null,
      statusCode: 500,
      hasError: true,
    });
  }
};

const rejectPartnerUpdateRequest = async (req, res) => {
  try {
    const updateRequest = await rejectUpdateRequest(req.params.id);
      
    if (!updateRequest) {
      return res.status(404).json({ message: "Không tìm thấy yêu cầu" });
    }

    new SuccessResponse({
      message: "Đã từ chối thành công",
    }).send(res);
  } catch (e) {
    return res.status(500).json({ message: "Lỗi khi xóa yêu cầu" });
  }
};

const createDriverUpdatedRequest = async (req, res) => {
  try {
    const {
      licensePlate,
      provinceId,
      districtId,
      communeId,
      detailAddress,
      name,
      phone 
    } = req.body;

    const userId = req.params.userId;

    if (!userId) {
      return res.status(400).json(
        ApiResponse("userId is required in URL params", null, 400, true)
      );
    }

    const driver = await UpdatedDriver.findOne({ userId });
    if (!driver) {
      return res
        .status(404)
        .json(ApiResponse("Driver not found for this userId", null, 404, true));
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json(ApiResponse("User not found", null, 404, true));
    }

    const files = req.files || {};
    const profileUrl = files.profileUrl?.[0]?.path || "";
    const licenseFrontUrl = files.licenseFrontUrl?.[0]?.path || "";
    const licenseBackUrl = files.licenseBackUrl?.[0]?.path || "";

    const updatedFields = {};
    let hasNameChanged = false;
    let hasPhoneChanged = false;

    if (licensePlate && licensePlate !== driver.licensePlate) {
      updatedFields.licensePlate = licensePlate;
    }

    if (provinceId && provinceId !== String(driver.provinceId)) {
      updatedFields.provinceId = provinceId;
    }

    if (districtId && districtId !== String(driver.districtId)) {
      updatedFields.districtId = districtId;
    }

    if (communeId && communeId !== String(driver.communeId)) {
      updatedFields.communeId = communeId;
    }

    if (detailAddress && detailAddress !== driver.detailAddress) {
      updatedFields.detailAddress = detailAddress;
    }

    if (profileUrl && profileUrl !== driver.profileUrl) {
      updatedFields.profileUrl = profileUrl;
    }

    if (licenseFrontUrl && licenseFrontUrl !== driver.licenseFrontUrl) {
      updatedFields.licenseFrontUrl = licenseFrontUrl;
    }

    if (licenseBackUrl && licenseBackUrl !== driver.licenseBackUrl) {
      updatedFields.licenseBackUrl = licenseBackUrl;
    }

    if (name && name !== user.name) {
      hasNameChanged = true;
    }

    if (phone && phone !== user.phone) {
      hasPhoneChanged = true;
    }

    if (Object.keys(updatedFields).length === 0 && !hasNameChanged && !hasPhoneChanged) {
      return res
        .status(400)
        .json(ApiResponse("Không có trường nào được thay đổi", null, 400, true));
    }

    const request = await createDriverUpdateRequest({
      driverId: driver._id,
      ...updatedFields,
      ...(hasNameChanged ? { name } : {}),
      ...(hasPhoneChanged ? { phone } : {}),
      status: "pending",
    });

    return res
      .status(201)
      .json(ApiResponse("Update request submitted", request, 201));
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json(ApiResponse("Internal server error", null, 500, true));
  }
};

const getAllDriverUpdatedRequests = async (req, res) => {
  try {
    const requests = await getAllDriverUpdateRequests();

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
        name: req.driverId?.userId?.name || "Không có tên quán",
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
      message: "Filtered update requests fetched",
      data: filteredRequests,
      statusCode: 200,
      hasError: false,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch update requests",
      data: null,
      statusCode: 500,
      hasError: true,
    });
  }
};
const handleDriverApproveRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    if (!requestId) {
      return res.status(400).json({
        status: "error",
        message: "Thiếu requestId trong params",
        data: null,
        statusCode: 400,
        hasError: true,
      });
    }

    const result = await approveDriverUpdateRequest(requestId);

    return res.status(200).json({
      status: "success",
      message: result.message,
      data: result.updatedDriver,
      statusCode: 200,
      hasError: false,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message || "Lỗi server",
      data: null,
      statusCode: 500,
      hasError: true,
    });
  }
};

const handleRejectDriverUpdateRequest = async (req, res) => {
  try {
    const updateRequest = await rejectDriverUpdateRequest(req.params.id);
      
    if (!updateRequest) {
      return res.status(404).json({ message: "Không tìm thấy yêu cầu" });
    }

    new SuccessResponse({
      message: "Đã từ chối thành công",
    }).send(res);
  } catch (e) {
    return res.status(500).json({ message: "Lỗi khi từ chối yêu cầu" });
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
  verifyOtp,
  resendOTP,
  driverRegister,
  partnerRegister,
  changePassword,
  resetPassword,
  createPartnerUpdateRequest,
  getAllPartnerUpdateRequests,
  handleApproveRequest,
  rejectPartnerUpdateRequest,
  createDriverUpdatedRequest,
  getAllDriverUpdatedRequests,
  handleDriverApproveRequest,
  handleRejectDriverUpdateRequest,
};
