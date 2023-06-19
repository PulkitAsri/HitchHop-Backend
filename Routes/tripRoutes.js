const express = require("express");

var router = express.Router()
const { drive, ride, requestRide, cancelTrip, tripDone, tripHistory, activeTrip, isDriver, listTrips } = require("../Controllers/trip.js");

router.post("/drive", drive)  // Swagger Api done
router.post("/ride", ride)    //Swagger Api done
router.post("/ride/request", requestRide)
router.post("/listTrips", listTrips)
router.delete("/", cancelTrip) // Swagger Api pending
router.post("/done", tripDone) // Swagger Api pending
router.get("/history", tripHistory)// Swagger Api pending
router.get("/isdriver", isDriver)
router.get("/activetrip", activeTrip)

module.exports = router;
