const { StatusCodes, ReasonPhrases } = require("../utils/httpStatusCode")

class SuccessResponse {
    constructor({ message, statusCode = StatusCodes.OK, reasonStatusCode = ReasonPhrases.OK, data = null }) {
        this.message = !message ? reasonStatusCode : message,
            this.status = statusCode,
            this.data = data
    }

    send(res, header = {}) {
        return res.status(this.status).json(this)
    }
}

class OK extends SuccessResponse {
    constructor({ message, data }) {
        super({ message, data })
    }
}

class CREATED extends SuccessResponse {
    constructor({ options = {}, message, statusCode = StatusCodes.CREATED, reasonStatusCode = ReasonPhrases.CREATED, data }) {
        super({ message, statusCode, reasonStatusCode, data })
        this.options = options
    }
}

class PAGINATED extends SuccessResponse {
    constructor({
        message,
        data = [],
        statusCode = StatusCodes.OK,
        reasonStatusCode = ReasonPhrases.OK,
        totalPages = 1,
        currentPage = 1,
        pageSize = 10,
        totalItems = 0,
    }) {
        super({ message, data, statusCode, reasonStatusCode });
        this.totalPages = totalPages;
        this.currentPage = currentPage;
        this.pageSize = pageSize;
        this.totalItems = totalItems;
    }
}

module.exports = {
    OK,
    CREATED,
    SuccessResponse,
    PAGINATED
}