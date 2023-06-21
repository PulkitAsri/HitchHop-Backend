const _ = require('lodash');
const Trip = require("../Models/tripModel");
const User = require("../Models/user");
const RideRequest = require("../Models/rideRequest");
const dotenv = require("dotenv");
const { Client } = require("@googlemaps/google-maps-services-js");
var polylineUtil = require('@mapbox/polyline');
const mapsClient = new Client({});
const { PolyUtil } = require("node-geometry-library");
const { default: axios } = require("axios");
dotenv.config()


// const MS_PER_MINUTE = 60000;
const offsetDurationInMinutes = 45;
const pct = .3; // Percent of route points for source (others are checked for destination)
const radiusOffset = 50;    //TODO: TUNE

async function calculateTripDurationFromLatLng(source, destination, waypoints) {
    const { lat: sourceLat, lng: sourceLng } = source;
    const { lat: destLat, lng: destLng } = destination;

    const sourceArg = `${sourceLat},${sourceLng}`;
    const destinationArg = `${destLat},${destLng}`;
    const waypointsParam = waypoints.map(waypoint => `${waypoint.lat},${waypoint.lng}`).join("|");

    const requestUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${sourceArg}&destination=${destinationArg}&waypoints=${waypointsParam}&key=${process.env.MAPS_API_KEY}`;

    try {
        const response = await axios.get(requestUrl);
        // console.log('response', response.data)
        const route = response.data.routes[0];
        const duration = route.legs.reduce((acc, leg) => acc + leg.duration.value, 0);
        // console.log({ duration })
        return { duration };
    } catch (error) {
        console.error("Error calculating trip duration:", error);
        return { duration: null };
    }
}

// @Testing - done
exports.drive = (req, res) => {
    // User.findById(req.auth._id, (err, user) => {
    User.findById(req.body.userId, (err, user) => {
        if (err)
            return res.status(500).end();
        if (user.active_trip == undefined || user.active_trip == null) {
            const tripObj = new Trip({
                // driver: req.auth._id,
                driver: req.body.userId,
                source: req.body.source,
                destination: req.body.destination,
                route: req.body.route,
                dateTime: new Date(req.body.dateTime),
                max_riders: req.body.max_riders,
            });
            tripObj.save((err, trip) => {
                if (err) // TODO: ?Handle error coming due to not selecting all the required fields?
                    return res.status(500).end();
                res.status(200).json({ trip, success: true });

                user.active_trip = trip._id;
                user.trip_role_driver = true;
                user.save((err) => {
                    if (err) {
                        trip.deleteOne();
                        return res.status(500).end();
                    }
                    return res;
                })
                return res.status(500).end();
            })
        } else {
            //TODO: revert
            res.statusMessage = "A trip is already active";
            return res.status(400).end();
        }
    })
}

// @Testing- done
exports.listTrips = async (req, res) => {
    const { source, destination } = req.body;
    const wayPoints = [source, destination]

    const ans = []
    Trip.find({
        completed: false,   //trip is active
        available_riders: true,
        // date: {
        //     $gte: startDateTime,
        //     $lte: endDateTime
        // },
    }, async function (err, trips) {
        if (err) {
            res.statusMessage = "No matches found. No trips around your time.";
            return res.status(400).end();
        }
        // console.log(trips)
        try {
            await Promise.all(trips.map(async (trip) => {
                const { source: driverSource, destination: driverDestination, driver } = trip;
                console.log({ driverSource, driverDestination, driver });
                const driverDetails = await User.findById(driver)
                console.log({ driverDetails });
                const riderTrip = await calculateTripDurationFromLatLng(driverSource, driverDestination, wayPoints);
                const driverTrip = await calculateTripDurationFromLatLng(driverSource, driverDestination, []);

                if (!_.isNil(riderTrip.duration) && !_.isNil(driverTrip.duration)) {
                    const detourTime = Math.abs(riderTrip.duration - driverTrip.duration) / 60;
                    ans.push({
                        ...trip._doc,
                        detourTime,
                        driver: driverDetails,
                        // Include other relevant trip information
                    });
                } else {
                    console.log("ERROR");
                }
            }));
            res.status(200)
            res.json({
                success: true,
                trips: ans
            });
        } catch (e) {
            console.log({ error: e })
            res.status(500).json({ msg: "some error in backene", error: e });
        }

    })
    return res
}

exports.tripDone = (req, res) => {
    User.findById(req.body.userId, (err, user) => {
        // if (err)
        //     return res.status(500).end();
        // else {

        if (user.active_trip == undefined || user.active_trip == null) {
            res.statusMessage = "No active trip";
            return res.status(400).end();
        } else {
            Trip.findById(user.active_trip, (err, trip) => {
                // if (err)
                //     return res.status(500).end();
                // else {
                trip.completed = true;
                trip.save((err) => {    //1
                    // if (err) {
                    //     res.statusMessage = "Error in saving trip status.";
                    //     return res.status(500).end();
                    // }
                });
                user.trips.push(trip._id);
                user.active_trip = null;
                user.trip_role_driver = null;
                user.save((err) => {    //2
                    // if (err) {
                    //     res.statusMessage = "Error in saving trip to table.";
                    //     return res.status(500).end();
                    // }
                });
                trip.riders.forEach(rider => {  //3
                    User.findById(rider, (err, user_rider) => {
                        // if (err)
                        //     return res.status(500).end();
                        // else {
                        user_rider.trips.push(trip._id);
                        user_rider.active_trip = null;
                        user_rider.trip_role_driver = null;
                        user_rider.save((err) => {
                            // if (err) {
                            //     //TODO: revert
                            //     res.statusMessage = "Error in saving user data for a rider.";
                            //     return res.status(500).end();
                            // }
                        })
                        // }
                    })
                });
                //POTENTIAL ISSUE (should not be since foreach is NOT async): Need to return 200 when 1, 2, 3 (all) are done
                return res.status(200).end();
                // }
            })
        }
        // }
    })
}

exports.cancelTrip = (req, res) => {
    User.findById(req.body.userId, (err, user) => {
        // if (err)
        //     return res.status(500).end();
        console.log({ user })
        if (user.active_trip == undefined || user.active_trip == null) {
            res.statusMessage = "No active trip";
            return res.status(400).end();
        } else {
            Trip.findById(user.active_trip, (err, trip) => {
                // if (err)
                //     return res.status(500).end();
                if (trip) {
                    if (user.trip_role_driver) {
                        trip.riders.forEach(rider => {  //3
                            User.findById(rider, (err, user_rider) => {
                                if (err)
                                    return res.status(500).end();
                                else {
                                    user_rider.active_trip = null;
                                    user_rider.trip_role_driver = null;
                                    user_rider.save((err) => {
                                        // if (err) {
                                        //     //TODO: revert
                                        //     res.statusMessage = "Error in saving user data for a rider.";
                                        //     return res.status(500).end();
                                        // }
                                    })
                                }
                            })
                        });
                        trip.deleteOne((err) => {
                            // if (err) {
                            //     res.statusMessage = "Error in deleting trip object";
                            //     return res.status(500).end();
                            // }
                        });
                    } else {
                        const riderIndex = trip.riders.indexOf(user._id);
                        trip.waypoints.splice(riderIndex * 2, 2);
                        mapsClient.directions({
                            params: {
                                origin: trip.source,
                                destination: trip.destination,
                                waypoints: trip.waypoints,
                                drivingOptions: {
                                    departureTime: new Date(trip.dateTime),  // for the time N milliseconds from now.
                                },
                                optimize: true,
                                key: process.env.MAPS_API_KEY
                            },
                            timeout: 2000, // milliseconds
                        })
                            .then((r) => {
                                const routeArray = polylineUtil.decode(r.data.routes[0].overview_polyline.points);
                                trip.route = Object.values(routeArray)
                                    .map(item => ({ lat: item[0], lng: item[1] }));
                                trip.riders.splice(riderIndex);
                                trip.available_riders = true;
                                trip.save((err) => {
                                    if (err)
                                        return res.status(500).end();
                                });
                            })
                            .catch((e) => {
                                res.statusMessage = e.response.data.error_message;
                                return res.status(400).end();
                            });
                    }
                }
                user.active_trip = null;
                user.trip_role_driver = null;
                user.save((err) => {
                    // if (err) {
                    //     res.statusMessage = "Error in saving user. Trip was deleted/modified.";
                    //     return res.status(500).end();
                    // }
                    res.status(200).json({
                        success: true,
                        trips: ans
                    });
                    return res;
                });
            });
        }
    })
}


exports.tripHistory = (req, res) => {
    User.findById(req.body.userId, (err, user) => {
        Trip.find({ '_id': { $in: user.trips } }, (err, trips) => {
            // if (err)
            //     return res.status(500).end();
            res.status(200).json(trips);
            return res;
        })
        // }
    })
}

exports.activeTrip = (req, res) => {
    var riderArray = [];
    User.findById(req.userId, (err, user) => {

        if (user.active_trip == undefined || user.active_trip == null) {
            res.statusMessage = "No active trip";
            return res.status(400).end();
        }
        Trip.findById(user.active_trip, (err, trip) => {
            User.findById(trip.driver, (err, user_driver) => {
                const riders = trip.riders;

                if (riders.length === 0) {
                    res.status(200).json({
                        ...trip._doc,
                        riders: riderArray,
                        driver: user_driver.name + ' ' + user_driver.lastname
                    })
                }

                var i = 0;
                riders.forEach(rider => {
                    User.findById(rider, (err, user_rider) => {

                        if (err)
                            return res.status(500).end();
                        riderArray.push(String(user_rider.name + ' ' + user_rider.lastname));
                        i++;
                        if (i == riders.length) {
                            return res.status(200).json({
                                ...trip._doc,
                                riders: riderArray,
                                driver: user_driver.name + ' ' + user_driver.lastname
                            })
                        }
                    })
                })
            });
        });
    });
}

//DONT SEE BENEATH THIS POINT

exports.ride = async (req, res) => {
    //body, tridId, userId
    const { userId, tripId, source, destination } = req.body;

    try {

        const riderUser = await User.findById(userId);
        // console.log({ riderUser })
        const tripToJoin = await Trip.findById(tripId);
        // console.log({ tripToJoin })

        if (_.isNil(riderUser)) {
            return res.status(400).json({
                success: false,
                msg: "no user found with this id"
            })
        }
        if (_.isNil(tripToJoin)) {
            return res.status(400).json({
                success: false,
                msg: "no trip found with this id"
            })
        }

        const driverUserPk = tripToJoin.driver

        tripToJoin.waypoints = [...tripToJoin.waypoints, source, destination];
        tripToJoin.riders.push(userId);
        tripToJoin.available_riders = !(tripToJoin.riders.length === tripToJoin.max_riders);

        riderUser.active_trip = tripToJoin._id;
        riderUser.trip_role_driver = false;

        await tripToJoin.save();
        res.status(200).json({
            success: true,
            msg: "successfully riding the trip",
            updatedTrip: tripToJoin
        })


    } catch (error) {
        console.log({ error })
        res.status(500).json({ msg: 'An error occurred while creating the ride request', error });
    }


}

exports.ride2 = (req, res) => {
    User.findById(req.us, (err, user) => {
        // if (err)
        //     return res.status(500).end();
        if (user.active_trip == undefined || user.active_trip == null) {
            //Matching logic START
            let startDateTime = new Date(req.body.dateTime);
            startDateTime.setMinutes(startDateTime.getMinutes() - offsetDurationInMinutes);
            let endDateTime = new Date(req.body.dateTime);
            endDateTime.setMinutes(endDateTime.getMinutes() + offsetDurationInMinutes);
            Trip.find({
                completed: false,   //trip is active
                available_riders: true,
                date: {
                    $gte: startDateTime,
                    $lte: endDateTime
                },
            }, function (err, trips) {
                if (err) {
                    res.statusMessage = "No matches found. No trips around your time.";
                    return res.status(400).end();
                }
                var trip;
                trips.forEach(tempTrip => {
                    const pctLen = parseInt(tempTrip.route.length * pct)
                    let found = PolyUtil.isLocationOnPath(
                        req.body.src,
                        tempTrip.route.slice(0, pctLen),
                        radiusOffset
                    );
                    if (found) {
                        found = PolyUtil.isLocationOnPath(
                            req.body.dst,
                            tempTrip.route.slice(pctLen),
                            radiusOffset
                        );
                        if (found) {
                            trip = tempTrip;
                            return;
                        }
                    }
                });
                //Matching logic END
                if (trip == undefined || trip == null) {
                    res.statusMessage = "No match found";
                    return res.status(400).end();
                }
                trip.waypoints = [...trip.waypoints, req.body.src, req.body.dst];
                mapsClient.directions({
                    params: {
                        origin: trip.source,
                        destination: trip.destination,
                        waypoints: trip.waypoints,
                        drivingOptions: {
                            departureTime: new Date(trip.dateTime),  // for the time N milliseconds from now.
                        },
                        optimize: true,
                        key: process.env.MAPS_API_KEY
                    },
                    timeout: 2000, // milliseconds
                })
                    .then((r) => {
                        const routeArray = polylineUtil.decode(r.data.routes[0].overview_polyline.points);
                        trip.route = Object.values(routeArray)
                            .map(item => ({ lat: item[0], lng: item[1] }));
                        trip.riders.push(user._id);
                        trip.available_riders = !(trip.riders.length === trip.max_riders);
                        trip.save((err, trip) => {
                            // if (err)
                            //     return res.status(500).end();
                            res.status(200).json(trip);
                            user.active_trip = trip._id;
                            user.trip_role_driver = false;
                            user.save((err) => {
                                // if (err) {
                                //     //TODO: revert
                                //     return res.status(500).end();
                                // }
                                return res;
                            })
                            return res.status(500).end();
                        });
                    })
                    // .catch((e) => {
                    //     res.statusMessage = e.response.data.error_message;
                    //     return res.status(400).end();
                    // });
            });
        } else {
            res.statusMessage = "A trip is already active";
            return res.status(400).end();
        }
    })
}

exports.requestRide = async (req, res) => {
    const { userId, tripId } = req.body;
    try {
        const newRideRequest = new RideRequest({
            userId,
            tripId,
        });
        const savedRideRequest = await newRideRequest.save();
        res.status(200).json({ message: 'Ride request successful', rideRequest: savedRideRequest });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while creating the ride request' });
    }
};


exports.isDriver = (req, res) => {
    User.findById(req.auth._id, (err, user) => {
        
            if (user.trip_role_driver == undefined || user.trip_role_driver == null) {
                res.statusMessage = "No active trip";
                return res.status(400).end();
            }
            else
                res.status(200).json({ "isdriver": user.trip_role_driver })
        
    })
}