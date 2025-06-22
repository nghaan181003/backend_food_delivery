const Category = require("../models/Category");
const UpdatedPartner = require("../models/UpdatedPartner");
const { findById: findPartnerById } = require("../services/PartnerServices")
const mongoose = require("mongoose");
const { Types } = require('mongoose')
const { BadRequestError, NotFoundError, ErrorResponse } = require('../core/error.response');
const Item = require("../models/Item");
const ApiError = require("../controllers/error/ApiError");



const deleteAllCategoriesOfPartner = async (partnerId) => {
  try {
    if (!partnerId) {
      throw new Error("Partner ID is required");
    }

    // Delete categories where the partnerId matches
    const result = await Category.deleteMany({ partnerId });

    await UpdatedPartner.updateOne(
      { _id: partnerId },
      { $set: { categoryOrderIdx: [] } }
    );

    if (result.deletedCount === 0) {
      console.log("No categories found for the specified partner.");
    } else {
      console.log(
        `${result.deletedCount} categories deleted for partner ${partnerId}.`
      );
    }

    return result;
  } catch (error) {
    console.error("Error deleting categories:", error.message);
    throw error;
  }
};

const getCategories = async (partnerId) => {
  try {
    const partner = await UpdatedPartner.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(partnerId) },
      },
      {
        $unwind: "$categoryOrderIdx",
      },
      {
        $lookup: {
          from: "categories",
          localField: "categoryOrderIdx",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      {
        $unwind: "$categoryDetails",
      },

      {
        $sort: {
          "categoryOrderIdx.orderIndex": 1,
        },
      },
      {
        $group: {
          _id: "$_id",
          categories: { $push: "$categoryDetails" },
        },
      },
    ]);

    return partner;
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error;
  }
};

const findById = async (id) => {
  return await Category.findOne({ _id: new Types.ObjectId(id) }).lean()
}


const createCategoryV2 = async ({ partnerId, name }) => {

  const partner = await UpdatedPartner.findById(partnerId);
  if (!partner) throw new NotFoundError(`Không tìm thấy Partner với ${partnerId}`)
  const normalizedName = name.trim().toLowerCase();
  const existingCategory = await Category.findOne({
    partnerId: partnerId,
    name: { $regex: `^${normalizedName}$`, $options: "i" },
    isDeleted: false
  });

  if (existingCategory) throw new NotFoundError(`Danh mục có tên ${name} đã tồn tại`)


  const newCategory = await Category.create({
    partnerId: partnerId,
    name: name,
  });

  if (!newCategory) {
    throw new ErrorResponse(
      "Internal Server Error! Server failed creating new category."
    );
  }

  partner.categoryOrderIdx.push(newCategory._id);
  await partner.save();

  console.log("Updated partner.categoryOrderIdx:", partner.categoryOrderIdx);

  return newCategory;

}

const deleteCategory = async (id) => {
  const foundCategory = await Category.findOne({ _id: new Types.ObjectId(id) })
  if (!foundCategory) throw new NotFoundError(`Không tìm thấy danh mục với ${id}`)

  const hasItmes = await Item.findOne({ categoryId: new Types.ObjectId(id), isDeleted: "false" })

  if (hasItmes) throw new NotFoundError("Đang có món thuộc danh mục này")

  const partner = await UpdatedPartner.findById(foundCategory.partnerId);
  if (!partner) throw new NotFoundError(`Không tìm thấy Partner với ID ${foundCategory.partnerId}`);
  partner.categoryOrderIdx.pull(id);
  foundCategory.isDelete = true
  await partner.save()
  return await foundCategory.save()
}

module.exports = { deleteAllCategoriesOfPartner, getCategories, findById, createCategoryV2, deleteCategory };
