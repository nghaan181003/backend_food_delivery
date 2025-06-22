class AppError {
    constructor(message, statusCode = 500) {
        this.message = message;
        this.statusCode = statusCode;
    }
}

class Result {
    constructor(isSuccess, value, error) {
      this.isSuccess = isSuccess;
      this.value = value;   
      this.error = error;   
    }
  
    static success(value) {
      return new Result(true, value, null);
    }
  
    static failure(error) {
      return new Result(false, null, error);
    }
  }
  
module.exports = { Result, AppError };