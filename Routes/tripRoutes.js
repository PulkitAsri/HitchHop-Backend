const express = require("express");

var router = express.Router()
const { drive, ride, requestRide, cancelTrip, tripDone, tripHistory, activeTrip, isDriver, listTrips } = require("../Controllers/trip.js");

router.post("/ride/request", requestRide)

// working
router.post("/drive", drive)  // Swagger Api done
router.post("/listTrips", listTrips)
router.delete("/cancel", cancelTrip) // Swagger Api pending
router.post("/done", tripDone) // Swagger Api pending
router.post("/history", tripHistory)// Swagger Api pending



//buffer
router.post("/ride", ride)
router.get("/isdriver", isDriver)
router.get("/activetrip", activeTrip)

module.exports = router;
