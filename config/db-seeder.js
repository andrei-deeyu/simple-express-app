const { faker } = require('@faker-js/faker');
const Exchange = require('../models/Exchange');
const connectDB = require('./db');

// Load config
require('dotenv').config({ path: './config/config.env' });

let fakeFreights = [];
let numberOf = process.env.npm_config_numberOf ?? 5;

for (let i = 0; i < numberOf; i++) {
  fakeFreights.push({
    origin: faker.location.city(),
    destination: faker.location.city(),
    distance: faker.number.int({min: 120, max: 3000}) + ' km',
    details: faker.lorem.sentence(),
    budget: faker.number.int(400, 4000),
    valability: '7days',
    pallet: {
      type: 'europallet',
      number: faker.number.int(2,18)
    },
    size: {
      tonnage: faker.number.int(1,24),
      volume: faker.number.int(2,18),
      height: faker.number.float({min: 1, max: 3, precision: 0.01}),
      width: faker.number.float({min: 1, max: 3, precision: 0.01}),
      length: faker.number.float({min: 1, max: 8, precision: 0.01}),
    },
    truck: {
      regime: 'FTL',
      type: ['duba', 'decopertat', 'prelata'],
      features: ''
    },
    fromUser: {
      userId: faker.string.uuid(),
      email: faker.internet.email(),
      picture: faker.internet.avatar(),
      name: faker.person.fullName(),
    },
    isLiked: false,
    createdAt: Date.now()
  })
}

connectDB();

Exchange.create(fakeFreights).then((res) => {
  console.log(`Database seeded successfully with ${res.length} elements`)
  return process.exit();
}).catch(err => {
  console.log(err);
  return process.exit();
})