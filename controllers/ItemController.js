const AsyncHandler = require("express-async-handler");
const { StatusCodes } = require("http-status-codes");
const ApiError = require("./error/ApiError");
const ApiResponse = require("./response/ApiResponse");
const ItemServices = require("../services/ItemServices");
const Category = require("../models/Category");
const Partner = require("../models/UpdatedPartner");
const Item = require("../models/Item");
const { PAGINATED, SuccessResponse } = require("../core/success.response")
const removeVietnameseTones = (str) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
};
const addItemToCategory = AsyncHandler(async (req, res) => {
  const {
    categoryId,
    itemName,
    price,
    description,
    status,
    partnerId,
    quantity,
    keySearch,
    toppingGroupIds
  } = req.body;

  const category = await Category.findById(categoryId);
  const partner = await Partner.findById(partnerId);

  if (!category || !partner) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json(
        ApiResponse(
          "Category or Partner is not found",
          null,
          StatusCodes.NOT_FOUND
        )
      );
  }

  let itemImage = "";

  if (req.files && req.files.itemImage && req.files.itemImage.length > 0) {
    itemImage = req.files.itemImage[0].path;
  }

  const parsedToppingGroupIds = JSON.parse(toppingGroupIds || '[]');

  const newItem = await ItemServices.createNewItem(
    categoryId,
    itemName,
    price,
    description,
    status,
    itemImage,
    partnerId,
    removeVietnameseTones(itemName),
    quantity,
    keySearch,
    parsedToppingGroupIds
  );

  res
    .status(StatusCodes.CREATED)
    .json(
      ApiResponse("Thêm món thành công.", newItem, StatusCodes.CREATED)
    );
});

const updateItemInCategory = AsyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const {
    categoryId,
    itemName,
    price,
    description,
    status,
    quantity,
    keySearch,
  } = req.body;

  const item = await ItemServices.getItemById(itemId);
  const category = categoryId ? await Category.findById(categoryId) : null;

  if (!item) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json(ApiResponse("Không tìm thấy món", null, StatusCodes.NOT_FOUND));
  }

  if (categoryId && !category) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json(ApiResponse("Không tìm thấy danh mục", null, StatusCodes.NOT_FOUND));
  }

  let itemImage = item.itemImage;
  if (req.files && req.files.itemImage && req.files.itemImage.length > 0) {
    itemImage = req.files.itemImage[0].path;
  }

  try {
    const updatedItem = await ItemServices.updateItem(
      itemId,
      categoryId || item.categoryId,
      itemName || item.itemName,
      price || item.price,
      description || item.description,
      status !== undefined ? status : item.status,
      itemImage,
      itemName ? removeVietnameseTones(itemName) : item.normalizedItemName, // Cập nhật tên không dấu
      quantity || item.quantity,
      keySearch || keySearch
    );

    res
      .status(StatusCodes.OK)
      .json(
        ApiResponse("Cập nhật món thành công", updatedItem, StatusCodes.OK)
      );
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(
        ApiResponse(
          "Lỗi khi cập nhật món",
          null,
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
  }
});

const deleteItem = AsyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const deletedItem = await ItemServices.deleteItem(id);
    if (!deletedItem) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(ApiResponse("Không tìm thấy món", null, StatusCodes.NOT_FOUND));
    }
    res
      .status(StatusCodes.OK)
      .json(
        ApiResponse("Xóa món thành công", deleteItem, StatusCodes.OK)
      );
  } catch (e) {
    throw new ApiError(e);
  }
});

const getItemById = AsyncHandler(async (req, res) => {
  const { itemId } = req.params;

  try {
    const item = await ItemServices.getItemById(itemId);

    if (!item) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(ApiResponse("Không tìm thấy món", null, StatusCodes.NOT_FOUND));
    }

    res
      .status(StatusCodes.OK)
      .json(ApiResponse("Lấy thông tin chi tiết món thành công", item, StatusCodes.OK));
  } catch (error) {
    console.error("Lỗi lấy chi tiết món", error.message);
    throw new Error("Lỗi lấy chi tiết món");
  }
});

const getItemsByCategory = AsyncHandler(async (req, res) => {
  const { categoryId } = req.params;

  try {
    // Fetch items by category ID
    const items = await ItemServices.getItemsByCategoryId(categoryId, false);

    if (items.length === 0) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(
          ApiResponse(
            "Không có món nào trong danh mục này",
            [],
            StatusCodes.NOT_FOUND
          )
        );
    }

    // Respond with the list of items
    res
      .status(StatusCodes.OK)
      .json(
        ApiResponse("Items retrieved successfully.", items, StatusCodes.OK)
      );
  } catch (error) {
    console.error("Error retrieving items by category ID:", error.message);
    throw new Error("Failed to retrieve items.");
  }
});
const searchItemsByName = AsyncHandler(async (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(
        ApiResponse(
          "Query parameter is required",
          null,
          StatusCodes.BAD_REQUEST
        )
      );
  }

  try {
    const normalizedQuery = removeVietnameseTones(query);

    const items = await Item.find({
      status: true,
      isDeleted: false,
      $or: [
        { itemName: { $regex: query, $options: "i" } },
        { normalizedItemName: { $regex: normalizedQuery, $options: "i" } },
      ],
    });

    if (items.length === 0) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(
          ApiResponse("No items match your search.", [], StatusCodes.NOT_FOUND)
        );
    }

    res
      .status(StatusCodes.OK)
      .json(
        ApiResponse(
          "Search results retrieved successfully.",
          items,
          StatusCodes.OK
        )
      );
  } catch (error) {
    console.error("Error searching items:", error.message);
    throw new ApiError("Failed to retrieve search results.");
  }
});
const getItemsByCategoryInCustomer = AsyncHandler(async (req, res) => {
  const { categoryId } = req.params;

  try {
    // Fetch items by category ID
    const items = await ItemServices.getItemsByCategoryIdInCustomer(
      categoryId,
      false,
      true
    );

    if (items.length === 0) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(
          ApiResponse(
            "Không tìm thấy món nào trong danh mục này.",
            [],
            StatusCodes.NOT_FOUND
          )
        );
    }

    // Respond with the list of items
    res
      .status(StatusCodes.OK)
      .json(
        ApiResponse("Lấy danh sách món thành công.", items, StatusCodes.OK)
      );
  } catch (error) {
    console.error("Error retrieving items by category ID:", error.message);
    throw new Error("Failed to retrieve items.");
  }
});
const getItemByCategoryInHome = AsyncHandler(async (req, res) => {
  const { keySearch } = req.query;

  if (!keySearch) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "Tham số keySearch là bắt buộc.",
    });
  }

  try {
    const items = await ItemServices.getItemByCategory(keySearch, true);

    if (items.length === 0) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(
          ApiResponse(
            "Không tìm thấy món nào với keySearch được cung cấp.",
            [],
            StatusCodes.NOT_FOUND
          )
        );
    }

    return res
      .status(StatusCodes.OK)
      .json(
        ApiResponse("Lấy danh sách món thành công.", items, StatusCodes.OK)
      );
  } catch (error) {
    console.error("Error retrieving items:", error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to retrieve items.",
    });
  }
});

const decreaseQuantity = AsyncHandler(async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;

  try {
    const item = await Item.findById(id);

    if (!item) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(ApiResponse("Không tìm thấy món", null, StatusCodes.NOT_FOUND));
    }

    if (item.quantity <= 0) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          ApiResponse(
            "Số lượng không được nhỏ hơn 0",
            null,
            StatusCodes.NOT_FOUND
          )
        );
    }

    item.quantity -= quantity;

    await item.save();

    return res
      .status(StatusCodes.OK)
      .json(
        ApiResponse(
          "Giảm số lượng món thành công.",
          item,
          StatusCodes.OK
        )
      );
  } catch (error) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(
        ApiResponse(
          "Không thể giảm số lượng.",
          null,
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
  }
});

const increaseSales = AsyncHandler(async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;

  try {
    const item = await Item.findById(id);

    if (!item) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(ApiResponse("Không tìm thấy món", null, StatusCodes.NOT_FOUND));
    }

    item.sales += quantity;

    await item.save();

    return res
      .status(StatusCodes.OK)
      .json(
        ApiResponse("Tăng số lượng bán thành công.", item, StatusCodes.OK)
      );
  } catch (error) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(
        ApiResponse(
          "Fail to decrease successfully.",
          null,
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
  }
});
const getTopItem = async (req, res) => {
  try {
    const topItems = await ItemServices.getTopItems();
    return res.status(200).json({
      message: "Ratings retrieved successfully.",
      data: topItems,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};
const addFavorite = async (req, res) => {
  const { userId, itemId } = req.body;
  try {
    const user = await ItemServices.addToFavorites(userId, itemId);

    const favoriteItems = await Item.find({ _id: { $in: user.favoriteList } })
      .select("_id partnerId itemName price description itemImage sales");

    res.status(200).json({
      message: "Add to favorite list successfully.",
      data: favoriteItems
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};


const removeFavorite = async (req, res) => {
  try {
    const { userId, itemId } = req.params;

    const user = await ItemServices.removeFromFavorites(userId, itemId);

    res.status(200).json({
      message: "Removed from favorite list successfully.",
      data: user
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message,
    });
  }
};
const getFavoriteList = async (req, res) => {
  const { userId } = req.params;

  try {
    const favoriteItems = await ItemServices.getFavorite(userId);
    res.status(200).json({
      message: "Lấy danh sách món ăn yêu thích thành công.",
      data: favoriteItems,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getLinkedToppingGroup = async (req, res, next) => {
  const result = await ItemServices.getLinkedToppingGroupsByProductId(req.query)

  new PAGINATED({
    message: "Lấy danh sách các nhóm Topping liên kết thành công!",
    data: result.data,
    currentPage: result.page,
    pageSize: result.limit,
    totalItems: result.totalItems,
    totalPages: result.totalPages
  }).send(res)
}

const getToppingGroupForCustomer = async (req, res, next) => {
  const result = await ItemServices.getToppingGroupsByProductIdForCustomer(req.query)

  new PAGINATED({
    message: "Lấy danh sách các nhóm Topping cho sản phẩm thành công!",
    data: result.data,
    currentPage: result.page,
    pageSize: result.limit,
    totalItems: result.totalItems,
    totalPages: result.totalPages
  }).send(res)
}

const getUnlinkedToppingGroup = async (req, res, next) => {
  const result = await ItemServices.getUnlinkedToppingGroupsByProductId(req.query)

  new PAGINATED({
    message: "Lấy danh sách các nhóm Topping chưa liên kết thành công!",
    data: result.data,
    currentPage: result.page,
    pageSize: result.limit,
    totalItems: result.totalItems,
    totalPages: result.totalPages
  }).send(res)
}

const linkToppingGroup = async (req, res, next) => {
  const { id } = req.params
  const { toppingGroupIds } = req.body
  const result = await ItemServices.linkToppingGroup({ id, toppingGroupIds })

  new SuccessResponse({
    message: "Liên kết nhóm Topping thành công!",
    data: result
  }).send(res)
}

const getItemsByPartnerId = async (req, res, next) => {
  const { partnerId } = req.params

  const result = await ItemServices.getItemsByPartnerId(partnerId)

  new SuccessResponse({
    message: "Lấy danh sách món ăn thành công!",
    data: result
  }).send(res)
}
const getTopSellingItems = async (req, res) => {
  try {
    const { partnerId } = req.params;

    if (!partnerId) {
      return res.status(400).json({ message: "partnerId is required" });
    }

    const topItems = await ItemServices.getTopSellingItemsByPartner(partnerId);

    return res.status(200).json({ data: topItems });
  } catch (error) {
    console.error("Error fetching top selling items:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const openStatus = async (req, res) => {
  try {
    const partner = await ItemServices.openItem(req.params.partnerId);
    if (!partner) return res.status(404).json({ message: "ID not found" });
    res.json(partner);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
const closeStatus = async (req, res) => {
  try {
    const partner = await ItemServices.closeItem(req.params.partnerId);
    if (!partner) return res.status(404).json({ message: "ID not found" });
    res.json(partner);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

const updateSchedule = async(req, res) => {
  try {
    const { id } = req.params;
    const newSchedule = req.body.schedule; 

    if (!Array.isArray(newSchedule)) {
      return res.status(400).json({ message: "Schedule phải là một mảng" });
    }

    const item = await ItemServices.updateSchedule(id, newSchedule);

    if (!item) return res.status(404).json({ message: "ID không tồn tại" });

    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
module.exports = {
  addItemToCategory,
  getItemById,
  getItemsByCategory,
  deleteItem,
  updateItemInCategory,
  searchItemsByName,
  getItemsByCategoryInCustomer,
  getItemByCategoryInHome,
  decreaseQuantity,
  increaseSales,
  getTopItem,
  addFavorite,
  removeFavorite,
  getFavoriteList,
  getLinkedToppingGroup,
  getUnlinkedToppingGroup,
  linkToppingGroup,
  getToppingGroupForCustomer,
  getItemsByPartnerId,
  getTopSellingItems,
  openStatus,
  closeStatus,
  updateSchedule
};
