#!/usr/bin/env node
const bcrypt = require('bcryptjs');

bcrypt.hash('admin123', 10, (err, hash) => {
  if (err) throw err;
  console.log(hash);
});
