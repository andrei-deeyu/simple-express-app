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
    distance: faker.number.int({min: 120, max: 3000}),
    geometry: {
      origin: {
        lat: faker.number.int({min: -90, max: 90}),
        lng: faker.number.int({min: -90, max: 90})
      },
      destination: {
        lat: faker.number.int({min: -90, max: 90}),
        lng: faker.number.int({min: -90, max: 90})
      }
    },
    details: faker.lorem.sentence(),
    budget: faker.number.int({min: 400, max: 4000}),
    payment_deadline: ['1days', '14days', '30days', '60days', '90days'][Math.floor(Math.random() * 5)],
    valability: '7days',
    pallet: {
      type: 'europallet',
      number: faker.number.int({min: 2, max: 18})
    },
    size: {
      tonnage: faker.number.int({min: 1, max: 24}),
      volume: faker.number.int({min: 2, max: 18}),
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
      phoneNumber: faker.phone.number('07########'),
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