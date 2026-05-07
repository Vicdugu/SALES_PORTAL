#!/usr/bin/env node
const { randomBytes } = require('crypto');

// Generate a simple cuid-like ID (8 random hex characters)
const id = randomBytes(8).toString('hex');
console.log(`clvp${Date.now().toString(36)}${id}`);
