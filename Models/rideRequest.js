const mongoose = require("mongoose");
const schema = mongoose.Schema;

const rideRequestSchema = new schema({
  userId: {
    type: String,
    required: true
  },
  tripId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['accepted', 'rejected', 'pending'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});



module.exports = mongoose.model("rideRequest", rideRequestSchema)