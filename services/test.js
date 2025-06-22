const { getRealDistance } = require("./location.service");

const start = [106.700981, 10.776889]; // Ho Chi Minh City
const end = [106.682208, 10.762622];

getRealDistance(start, end).then(result => {
    console.log(`Distance: ${result.distance_km} km`);
    console.log(`Duration: ${result.duration_min} minutes`);
})
    .catch(err => {
        console.error(err.message);
    });