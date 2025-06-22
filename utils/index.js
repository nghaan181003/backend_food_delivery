const { Types } = require("mongoose")

const getSelectData = (select = []) => {
    return Object.fromEntries(select.map(el => [el, 1]))
}

const unGetSelectData = (select = []) => {
    return Object.fromEntries(select.map(el => [el, 0]))
}

const removeUnderfinedObject = obj => {
    Object.keys(obj).forEach(k => {
        if (obj[k] == null) {
            delete obj[k]
        }
    })

    return obj
}

const convertToOjectIdMongodb = id => new Types.ObjectId(id)

module.exports = {
    getSelectData,
    unGetSelectData,
    removeUnderfinedObject,
    convertToOjectIdMongodb
}