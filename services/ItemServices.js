const ApiError = require("../controllers/error/ApiError");
const Item = require("../models/Item");
const ItemWithPrice = require("../models/ItemWithPrice");
const User = require("../models/User");
const { NotFoundError } = require("../core/error.response")
const { Types } = require("mongoose")
const { findAllByShopIdV2, findAllByShopIdForCustomer } = require("../models/repositories/toppingGroup.repo")

const { convertToOjectIdMongodb } = require('../utils')
const removeVietnameseTones = (str) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
};
const getItemsByCategoryId = async (categoryId, isDeleted) => {
  try {
    console.log("Retrieving items by category ID:", categoryId);
    const items = await ItemWithPrice.find({
      categoryId: convertToOjectIdMongodb(categoryId),
      // categoryId: new'683acd7984277f578e739bf2',
      isDeleted: "false",
    });



    if (items.length === 0) {
      console.log("No items found for this category.");
    } else {
      console.log("Items:", items);
    }

    return items;
  } catch (error) {
    console.error("Error retrieving items by category ID:", error.message);
    throw error;
  }
};
const getItemsByCategoryIdInCustomer = async (
  categoryId,
  isDeleted,
  status
) => {
  try {
    const items = await ItemWithPrice.find({
      categoryId: convertToOjectIdMongodb(categoryId),
      isDeleted: "false",
      status: true,
    });

    if (items.length === 0) {
      console.log("No items found for this category.");
    } else {
      console.log("Items:", items);
    }

    return items;
  } catch (error) {
    console.error("Error retrieving items by category ID:", error.message);
    throw error;
  }
};
const createNewItem = async (
  categoryId,
  itemName,
  price,
  description,
  status,
  itemImage,
  partnerId,
  normalizedItemName,
  quantity,
  keySearch,
  toppingGroupIds
) => {
  return await Item.create({
    categoryId,
    itemName,
    price,
    description,
    status,
    itemImage,
    partnerId,
    normalizedItemName, // Lưu tên không dấu
    quantity,
    keySearch,
    toppingGroupIds
  });
};

const updateItem = async (
  itemId,
  categoryId,
  itemName,
  price,
  description,
  status,
  itemImage,
  normalizedItemName,
  quantity,
  keySearch
) => {
  try {
    const updatedItem = await Item.findByIdAndUpdate(
      itemId,
      {
        categoryId,
        itemName,
        price,
        description,
        status,
        itemImage,
        normalizedItemName, // Cập nhật tên không dấu
        quantity,
        keySearch,
      },
      { new: true }
    );

    if (!updatedItem) {
      throw new Error("Item not found or update failed");
    }

    return updatedItem;
  } catch (error) {
    console.error("Error updating item:", error.message);
    throw error;
  }
};

const deleteItem = async (id) => {
  try {
    const deletedItem = await Item.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );
    return deletedItem;
  } catch (e) {
    throw new Error(e);
  }
};

const getItemById = async (itemId) => {
  try {
    const item = await Item.findById(itemId);

    if (!item) {
      console.log("Item not found.");
      return null;
    }

    console.log("Item:", item);
    return item;
  } catch (error) {
    console.error("Error retrieving item by ID:", error.message);
    throw error;
  }
};
const searchItemsByName = async (query, status, isDeleted) => {
  try {
    const normalizedQuery = removeVietnameseTones(query);

    const items = await Item.find({
      normalizedItemName: { $regex: normalizedQuery, $options: "i" },
      status,
      isDeleted
    });

    return items;
  } catch (error) {
    console.error("Error searching items by name:", error.message);
    throw new Error(error);
  }
};

const getItemByCategory = async (keySearch, status) => {
  try {
    if (typeof keySearch !== "string") {
      keySearch = String(keySearch);
    }
    console.log("keySearch:", keySearch);

    const items = await Item.find({
      keySearch: { $regex: keySearch, $options: "i" },
      status,
    });

    if (!items || items.length === 0) {
      console.log("No items found with the keySearch:", keySearch);
      return [];
    }

    return items;
  } catch (error) {
    console.error("Error retrieving items by keySearch:", error.message);
    throw error;
  }
};

const updateQuantity = async (itemId, newSales) => {
  try {
    const updatedItem = await Item.findByIdAndUpdate(
      id,
      { sales },
      { new: true, runValidators: true }
    );
  } catch (error) {
    console.error("Error updating sales item: ", error.message);
    throw error;
  }
};
const getTopItems = async () => {
  try {
    const topItems = await Item.aggregate([
      {
        $match: {
          isDeleted: "false",
          status: true,
        },
      },
      {
        $sort: { sales: -1 },
      },
      {
        $limit: 18,
      },
      {
        $project: {
          itemName: 1,
          price: 1,
          sales: 1,
          itemImage: 1,
          description: 1,
          partnerId: 1
        },
      },
    ]);

    return topItems;
  } catch (error) {
    throw new Error(`Error fetching top items: ${error.message}`);
  }
};

const addToFavorites = async (userId, itemId) => {
  try {
    console.log(`Thêm món ăn yêu thích | userId: ${userId}, itemId: ${itemId}`);

    const user = await User.findById(userId);
    if (!user) {
      console.log("Người dùng không tồn tại:", userId);
      throw new ApiError("Người dùng không tồn tại", 404);
    }

    const item = await Item.findById(itemId);
    if (!item) {
      console.log("Món ăn không tồn tại:", itemId);
      throw new ApiError("Món ăn không tồn tại", 404);
    }

    if (user.favoriteList.includes(itemId.toString())) {
      console.log("Món ăn đã có trong danh sách yêu thích:", itemId);
      throw new ApiError("Món ăn đã có trong danh sách yêu thích", 400);
    }

    user.favoriteList.push(itemId);
    await user.save();

    console.log("Món ăn đã được thêm vào danh sách yêu thích!");
    return user;
  } catch (error) {
    console.error("Lỗi khi thêm vào danh sách yêu thích:", error.message);
    throw error;
  }
};
const removeFromFavorites = async (userId, itemId) => {
  try {
    console.log(`Xóa món ăn khỏi yêu thích | userId: ${userId}, itemId: ${itemId}`);

    const user = await User.findById(userId);
    if (!user) {
      console.log("Người dùng không tồn tại:", userId);
      throw new ApiError("Người dùng không tồn tại", 404);
    }

    const favoriteListBefore = user.favoriteList.length;
    user.favoriteList = user.favoriteList.filter(id => id.toString() !== itemId);

    if (user.favoriteList.length === favoriteListBefore) {
      console.log("Món ăn không có trong danh sách yêu thích:", itemId);
      throw new ApiError("Món ăn không có trong danh sách yêu thích", 400);
    }

    await user.save();
    console.log("Món ăn đã được xóa khỏi danh sách yêu thích!");

    return user;
  } catch (error) {
    console.error("Lỗi khi xóa khỏi danh sách yêu thích:", error.message);
    throw error;
  }
};

const getFavorite = async (userId) => {
  try {
    console.log("Fetching favorite list for user:", userId);

    const user = await User.findById(userId);
    if (!user) {
      console.log("User not found:", userId);
      return [];
    }

    if (!user.favoriteList || user.favoriteList.length === 0) {
      console.log("No favorite items found for user:", userId);
      return [];
    }

    const favoriteItems = await Item.find({
      _id: { $in: user.favoriteList }, isDeleted: "false"
    }).select("_id partnerId itemName price description itemImage sales isDeleted");

    return favoriteItems;
  } catch (error) {
    console.error("Error retrieving favorite items:", error.message);
    throw error;
  }
};

const getLinkedToppingGroupsByProductId = async ({ id, limit = 20, page = 1 }) => {

  const foundItem = await Item.findOne({ _id: new Types.ObjectId(id) });

  if (!foundItem) throw new NotFoundError(`Không tìm thấy Item với ${id}`)

  const linkedIds = foundItem.toppingGroupIds || []

  if (linkedIds.length == 0) return []

  const filter = { _id: { $in: linkedIds }, tpShopId: foundItem.partnerId, isDelete: false }

  return await findAllByShopIdV2({ filter, limit, page, select: ["_id", "tpGroupName", "toppings", "isRequired", "maxSelect"] })

}

const getToppingGroupsByProductIdForCustomer = async ({ id, limit = 20, page = 1 }) => {

  const foundItem = await Item.findOne({ _id: new Types.ObjectId(id) });

  if (!foundItem) throw new NotFoundError(`Không tìm thấy Item với ${id}`)

  const linkedIds = foundItem.toppingGroupIds || []

  if (linkedIds.length == 0) return []

  const filter = { _id: { $in: linkedIds }, tpShopId: foundItem.partnerId, isDelete: false }

  return await findAllByShopIdForCustomer({ filter, limit, page, select: ["_id", "tpGroupName", "toppings", "isRequired", "maxSelect"] })

}

const getUnlinkedToppingGroupsByProductId = async ({ id, limit = 20, page = 1 }) => {

  const foundItem = await Item.findOne({ _id: new Types.ObjectId(id) });

  if (!foundItem) throw new NotFoundError(`Không tìm thấy Item với ${id}`)

  const linkedIds = foundItem.toppingGroupIds || []


  const filter = { _id: { $nin: linkedIds }, tpShopId: foundItem.partnerId, isDelete: false }

  return await findAllByShopIdV2({ filter, limit, page, select: ["_id", "tpGroupName", "toppings", "isRequired", "maxSelect"] })

}

const linkToppingGroup = async ({ id, toppingGroupIds }) => {
  const result = await Item.updateOne(
    { _id: new Types.ObjectId(id), }, { $set: { toppingGroupIds } })

  if (result.matchedCount === 0) {
    throw new NotFoundError(`Không tìm thấy Item với ID: ${id}`);
  }
  return result;
}

const getItemsByPartnerId = async (partnerId) => {
  const items = await Item.find({
    partnerId,
    isDeleted: false,
  });
  return items;
}
const getTopSellingItemsByPartner = async (partnerId, limit = 10) => {
  return await Item.find({
    partnerId,
    isDeleted: false,
  })
    .sort({ sales: -1 })
    .limit(limit)
    .select("itemName sales itemImage price");
};

const openItem = async (id) => {
  return Item.findByIdAndUpdate(id, { status: true }, { new: true });
}

const closeItem = async (id) => {
  return Item.findByIdAndUpdate(id, { status: false }, { new: true });
}

const updateSchedule = async (id, newSchedule) => {
  return Item.findByIdAndUpdate(
    id,
    { schedule: newSchedule },
    { new: true }
  );
}
module.exports = {
  getItemsByCategoryId,
  createNewItem,
  getItemById,
  deleteItem,
  updateItem,
  searchItemsByName,
  getItemsByCategoryIdInCustomer,
  getItemByCategory,
  getTopItems,
  addToFavorites,
  removeFromFavorites,
  getFavorite,
  getLinkedToppingGroupsByProductId,
  getUnlinkedToppingGroupsByProductId,
  linkToppingGroup,
  getToppingGroupsByProductIdForCustomer,
  getItemsByPartnerId,
  getTopSellingItemsByPartner,
  openItem,
  closeItem,
  updateSchedule
};
