const express = require("express");
const { isSignedin } = require("../Controllers/authenticate");

var router = express.Router()
const { drive, ride, cancelTrip, tripDone, tripHistory, activeTrip, isDriver, listTrips } = require("../Controllers/trip.js");

router.post("/trip/drive", isSignedin, drive)  // Swagger Api done
router.post("/trip/ride", isSignedin, ride)    //Swagger Api done
router.get("/trip/listTrips", isSignedin, listTrips)
router.delete("/trip", isSignedin, cancelTrip) // Swagger Api pending
router.post("/trip/done", isSignedin, tripDone) // Swagger Api pending
router.get("/trip/history", isSignedin, tripHistory)// Swagger Api pending
router.get("/trip/isdriver", isSignedin, isDriver) 
router.get("/trip/activetrip", isSignedin, activeTrip)
module.exports = router;
