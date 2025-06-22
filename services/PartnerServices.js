const UpdatedPartner = require("../models/UpdatedPartner");
const PartnerUpdateRequest = require("../models/PartnerUpdateRequest");
const User = require("../models/User");
const mongoose = require('mongoose');
const { Types } = require('mongoose')
const createPartner = async (
  userId,
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
  CCCDBackUrl,


) => {
  return await UpdatedPartner.create({
    userId: userId,
    description: description,
    categoryOrderIdx: [],
    provinceId: provinceId,
    districtId: districtId,
    communeId: communeId,
    detailAddress: detailAddress,
    fullAddress: fullAddress,
    latitude: latitude,
    longitude: longitude,
    avatarUrl: avatarUrl,
    storeFront: storeFront,
    CCCDFrontUrl: CCCDFrontUrl,
    CCCDBackUrl: CCCDBackUrl,

  });
};

const getPartnerByUserID = async (userId) => {
  try {
    const partner = await UpdatedPartner.findOne({ userId })
      .populate({
        path: "userId", // Reference to User model
        model: "User", // Ensure the correct model is used for population
      })
      .exec();

    if (!partner) {
      throw new Error("Partner not found for the given userId");
    }
    return partner;
  } catch (error) {
    console.error("Error fetching partner and user:", error);
    throw error;
  }
};
const getDetailPartnerByPartnerId = async (id) => {
  try {
    const objectId = new mongoose.Types.ObjectId(id.trim());

    const partner = await UpdatedPartner.findById(objectId)
      .populate('userId', 'name phone')
      .exec();

    if (!partner) {
      throw new Error('Không tìm thấy partner với ID cung cấp');
    }

    partner.categoryOrderIdx = undefined;

    return partner;
  } catch (error) {
    throw new Error(`Lỗi khi lấy partner: ${error.message}`);
  }
};

const updatePartnerStatus = async (partnerId, status) => {
  try {
    const updatedPartner = await UpdatedPartner.findOneAndUpdate(
      { _id: partnerId },
      { status },
      { new: true }
    );
    console.log(partnerId);
    if (!updatedPartner) {
      throw new Error("Partner not found.");
    }
    return updatedPartner;
  } catch (error) {
    console.error("Error updating partner status:", error);
    throw error;
  }
};

const findById = async (id) => {
  return await UpdatedPartner.findOne({ _id: new Types.ObjectId(id) }).lean()
}

const approveUpdateRequest = async (requestId) => {
  const request = await PartnerUpdateRequest.findById(requestId).populate("partnerId");
  if (!request) throw new Error("Yêu cầu cập nhật không tồn tại");

  if (request.status !== "pending") throw new Error("Yêu cầu đã được xử lý");

  const partner = await UpdatedPartner.findById(request.partnerId._id);
  if (!partner) throw new Error("Không tìm thấy đối tác");

  const user = await User.findById(partner.userId);
  if (!user) throw new Error("Không tìm thấy người dùng");

  if (request.name) user.name = request.name;
  if (request.phone) user.phone = request.phone;
  await user.save();

  const updateFields = {};

  if (request.avatarUrl) updateFields.avatarUrl = request.avatarUrl;
  if (request.storeFront) updateFields.storeFront = request.storeFront;
  if (request.description) updateFields.description = request.description;

  if (Object.keys(updateFields).length > 0) {
    await UpdatedPartner.updateOne(
      { _id: partner._id },
      { $set: updateFields }
    );
  }

  request.status = "approved";
  await request.save();

  const updatedPartner = await UpdatedPartner.findById(partner._id);

  return {
    message: "Yêu cầu cập nhật đã được duyệt",
    updatedPartner,
  };
};


const createUpdateRequest = async (data) => {
  return await PartnerUpdateRequest.create(data);
};

const getAllUpdateRequests = async () => {
  return await PartnerUpdateRequest.find({status: "pending"})
    .populate({
      path: "partnerId",
      select: "description userId name",
      populate: {
        path: "userId",
        select: "name email phone",
      },
    })
    .select("avatarUrl storeFront CCCDFrontUrl CCCDBackUrl description schedule status createdAt updatedAt partnerId name phone")
    .sort({ createdAt: -1 });
};

const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371; // Earth radius in km

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in km
};

const getNearbyRestaurantsService = async (latitude, longitude, maxDistance = 5, limit = 10) => {
  try {
    // Lấy danh sách partner có tọa độ hợp lệ và trạng thái true
    const partners = await UpdatedPartner.find({
      status: true,
      latitude: { $ne: null },
      longitude: { $ne: null },
    }).populate('userId', 'name phone').lean();

    // Tính khoảng cách và lọc theo maxDistance (km)
    const nearby = partners
      .map(partner => {
        const distance = haversineDistance(latitude, longitude, partner.latitude, partner.longitude);
        return { ...partner, distance };
      })
      .filter(p => p.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    return nearby;
  } catch (error) {
    throw new Error(`Error fetching nearby restaurants: ${error.message}`);
  }
};
const rejectUpdateRequest = async (id) => {
  try {
      const updateRequest = await PartnerUpdateRequest.findByIdAndUpdate(
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

const getPartnerUpdateRequestsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const requests = await PartnerUpdateRequest.find({ status: "pending" })
      .populate({
        path: "partnerId",
        match: { userId: userId },  
        select: "description userId name",
        populate: {
          path: "userId",
          select: "name email phone",
        },
      })
      .select("avatarUrl storeFront CCCDFrontUrl CCCDBackUrl description schedule status createdAt updatedAt partnerId name phone")
      .sort({ createdAt: -1 });

    const filteredRequests = requests.filter(r => r.partnerId !== null);

    res.status(200).json(filteredRequests);
  } catch (error) {
    console.error("Error getting update requests by userId:", error);
    res.status(500).json({ message: "Server error" });
  }
};
const getUpdateRequestsByUserId = async (userId) => {
  const requests = await PartnerUpdateRequest.find({})
    .populate({
      path: "partnerId",
      select: "description userId name",
      match: { userId: userId },
      populate: {
        path: "userId",
        select: "name email phone",
      },
    })
    .select("avatarUrl storeFront CCCDFrontUrl CCCDBackUrl description schedule status createdAt updatedAt partnerId name phone")
    .sort({ createdAt: -1 });

  const filteredRequests = requests
    .filter((req) => req.partnerId !== null)
    .map((req) => {
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

  return filteredRequests;
};

const openPartner = async (partnerId) => {
  return UpdatedPartner.findByIdAndUpdate(partnerId, { status: true }, { new: true });
}

const closePartner = async (partnerId) => {
  return UpdatedPartner.findByIdAndUpdate(partnerId, { status: false }, { new: true });
}

const updatePartnerSchedule = async (partnerId, newSchedule) => {
  return UpdatedPartner.findByIdAndUpdate(
    partnerId,
    { schedule: newSchedule },
    { new: true }
  );
}

module.exports = { createPartner, getPartnerByUserID, getDetailPartnerByPartnerId, updatePartnerStatus, findById,
  createUpdateRequest,
  approveUpdateRequest,
  getAllUpdateRequests,
  getNearbyRestaurantsService,
  rejectUpdateRequest,
  getPartnerUpdateRequestsByUserId,
  getUpdateRequestsByUserId,
  openPartner,
  closePartner,
  updatePartnerSchedule
 };
