const express = require('express');
const mongoose = require('mongoose');
const bodyparser = require('body-parser');
const cookieparser = require('cookie-parser');
const cors = require('cors');
const dotenv = require('dotenv');
// const { Client } = require('@googlemaps/google-maps-services-js');
const swaggerUI = require('swagger-ui-express');
const YAML = require('yamljs');
const swaggerDocument = YAML.load('./swagger.yaml');

const apiRoutes = require('./Routes/routes');

const app = express();

dotenv.config();

// Middleware
app.use(bodyparser.json());
app.use(cookieparser());
app.use(cors());

// MongoDB connection
mongoose
    .connect(process.env.DATABASE_URI)
    .then(() => console.log('DB connected'))
    .catch(error => {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    });

// Routes
app.use('/api', apiRoutes);
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocument));

const port = process.env.PORT || 8000;
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});

module.exports = app;
