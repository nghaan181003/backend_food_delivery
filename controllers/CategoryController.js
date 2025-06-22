const AsyncHandler = require("express-async-handler");
const Category = require("../models/Category");
const UpdatetedPartner = require("../models/UpdatedPartner");
const Item = require("../models/Item")
const { StatusCodes } = require("http-status-codes");
const ApiError = require("./error/ApiError");
const ApiResponse = require("./response/ApiResponse");
const { SuccessResponse, PAGINATED } = require("../core/success.response")

const CategoryServices = require("../services/CategoryServices");

const addCategory = AsyncHandler(async (req, res) => {
  const { partnerId, name } = req.body;

  const partner = await UpdatetedPartner.findById(partnerId);

  if (!partner) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json(ApiResponse("Partner is not found", null, StatusCodes.NOT_FOUND));
  }

  const existingCategory = await Category.findOne({
    partnerId: partnerId,
    name,
  });

  if (existingCategory) {
    return res
      .status(StatusCodes.CONFLICT)
      .json({ message: "Category name already exists." });
  }

  const newCategory = await Category.create({
    partnerId: partnerId,
    name: name,
  });

  if (!newCategory) {
    throw new ApiError(
      "Internal Server Error! Server failed creating new category."
    );
  }

  partner.categoryOrderIdx.push(newCategory._id);
  await partner.save();

  res
    .status(StatusCodes.CREATED)
    .json(
      ApiResponse(
        "Category created successfully.",
        newCategory,
        StatusCodes.CREATED
      )
    );
});

const addCategoryV2 = async (req, res, next) => {
  new SuccessResponse(
    {
      message: "Thêm danh mục thành công!",
      data: await CategoryServices.createCategoryV2(req.body)
    }
  ).send(res)
}

const reorderCategoryIndex = AsyncHandler(async (req, res) => {
  const { partnerId, categoryOrderIdx } = req.body;

  // Validate partnerId and categoryOrderIdx
  if (!partnerId || !Array.isArray(categoryOrderIdx)) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(
        ApiResponse(
          "Invalid partnerId or categoryOrderIdx",
          null,
          StatusCodes.BAD_REQUEST,
          true
        )
      );
  }

  // Find the partner
  const partner = await UpdatetedPartner.findById(partnerId);

  if (!partner) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json(
        ApiResponse("Partner is not found", null, StatusCodes.NOT_FOUND, true)
      );
  }

  // Update the categoryOrderIdx
  partner.categoryOrderIdx = categoryOrderIdx;

  // Save the updated partner
  await partner.save();

  // Respond with the updated partner
  res
    .status(StatusCodes.OK)
    .json(
      ApiResponse(
        "Category order updated successfully.",
        partner,
        StatusCodes.OK,
        false
      )
    );
});

const updateCategory = AsyncHandler(async (req, res) => {
  const { categoryId } = req.params; // Get the category ID from the URL
  const { name } = req.body;

  if (!name) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(
        ApiResponse(
          "Category name is required",
          null,
          true,
          StatusCodes.BAD_REQUEST
        )
      );
  }

  const updatedCategory = await Category.findByIdAndUpdate(
    categoryId,
    { name },
    { new: true } // return the updated category
  );

  if (!updatedCategory) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json(
        ApiResponse("Category not found", null, true, StatusCodes.BAD_REQUEST)
      );
  }
  return res
    .status(StatusCodes.OK)
    .json(
      ApiResponse(
        "Category updated successfully",
        updatedCategory,
        StatusCodes.CREATED
      )
    );
});

const getCategoriesByPartnerId = AsyncHandler(async (req, res) => {
  const { partnerId } = req.params;

  const partner = await CategoryServices.getCategories(partnerId);

  if (!partner || partner.length === 0) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json(ApiResponse("Partner not found", null, StatusCodes.NOT_FOUND));
  }

  res
    .status(StatusCodes.OK)
    .json(
      ApiResponse(
        "Categories retrieved successfully.",
        partner[0].categories,
        StatusCodes.OK
      )
    );
});

const deleteCategory = AsyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await Category.findByIdAndDelete(id);
  if (!category) {
    throw new ApiError("Category is not found");
  }

  const hasItems = await Item.exists({ categoryId: id, isDeleted: false });
  if (hasItems) {
    throw new ApiError("Đang có món thuộc danh mục này!", StatusCodes.BAD_REQUEST);
  }

  res
    .status(StatusCodes.OK)
    .json(ApiResponse("Category deleted successfully.", StatusCodes.OK));
});

const deleteCategoryV2 = async (req, res, next) => {
  new SuccessResponse(
    {
      message: "Xóa danh mục thành công!",
      data: await CategoryServices.deleteCategory(req.params.id)
    }
  ).send(res)
}



const deleteAllCategoriesOfPartner = AsyncHandler(async (req, res) => {
  const { partnerId } = req.params;

  await CategoryServices.deleteAllCategoriesOfPartner(partnerId);

  res
    .status(StatusCodes.OK)
    .json(ApiResponse("Category deleted successfully.", StatusCodes.OK));
});

module.exports = {
  addCategory,
  getCategoriesByPartnerId,
  deleteCategory,
  deleteAllCategoriesOfPartner,
  updateCategory,
  reorderCategoryIndex,
  addCategoryV2,
  deleteCategoryV2
};
