#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf-8');

const isProduction = process.env.NODE_ENV === 'production';
const provider = isProduction ? 'postgresql' : 'sqlite';

// Replace provider line
schema = schema.replace(
  /^\s*provider\s*=\s*"(sqlite|postgresql)"/m,
  `  provider = "${provider}"`
);

fs.writeFileSync(schemaPath, schema);
console.log(`✓ Set Prisma provider to: ${provider}`);
