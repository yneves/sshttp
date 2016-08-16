#!/usr/bin/env node

'use strict';

const http = require('http');
const argv = require('minimist')(process.argv.slice(2));

const req = http.request({
  port: argv.serverPort || 5656,
  hostname: '127.0.0.1',
  method: 'GET',
  path: '/' + escape(argv.command)
});

req.end();

req.on('response', (response) => {
  response.pipe(process.stdout);
});
