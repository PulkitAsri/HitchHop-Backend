const express = require("express");
const { isSignedin } = require("../Controllers/authenticate");
const authRoutes = require("./authentication.js");
const tripRoutes = require("./tripRoutes.js");
const { allusersRoutes } = require("../Controllers/allusersRoutes");

var router = express.Router()

router.use("/", authRoutes);
router.use("/trip", isSignedin, tripRoutes);
router.use("/user", allusersRoutes);

module.exports = router;
