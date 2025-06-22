const { body } = require("express-validator");

const loginValidation = [
  body("email")
    .isEmail()
    .withMessage("Invalid valid Email address format")
    .trim()
    .toLowerCase(),
  body("password")
    .isLength({ min: 5, max: 100 })
    .withMessage("Password must be more than 5 characters long")
    .trim(),
];

const registerValidation = [];

module.exports = {
  loginValidation,
  registerValidation,
};
