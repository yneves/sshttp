#!/usr/bin/env node

'use strict';

const fs = require('fs');
const http = require('http');
const ssh2 = require('ssh2');
const autoBind = require('class-autobind').default;
const argv = require('minimist')(process.argv.slice(2));

// -

class Server {

  constructor(options) {
    autoBind(this);
    this.queue = [];
    this.options = options;
    this.client = new ssh2.Client();
    this.client.on('error', this.onClientError);
    this.client.on('ready', this.onClientReady);
  }

  onClientReady() {
    this.client.shell(this.onShellReady);
  }

  onClientError(error) {
    if (this.connecting) {
      this.connecting.error = error;
      this.ready();
    }
  }

  onShellReady(error, stream) {
    if (error) {
      return this.onClientError(error);
    }

    this.shell = stream;
    this.shell.on('data', this.onShellData);
    this.shell.stderr.on('data', this.onShellError);
  }

  onShellData(data) {
    const text = data.toString();
    if (this.executing) {
      if (this.shellEndLine === text) {
        this.executing.response.end();
      } else {
        this.executing.response.write(text);
      }
    } else {
      this.shellEndLine = text;
    }
    if (this.connecting) {
      this.onConnected();
    }
  }

  onShellError(data) {
    if (this.executing) {
      this.executing.stderr += data.toString();
    }
  }

  onConnected() {
    process.stdout.write('connected\n');
    delete this.connecting;
    this.flush();
  }

  connect() {
    this.connecting = {};
    this.client.connect(this.options);
  }

  flush() {
    if (this.queue.length) {
      this.execute.apply(this, this.queue.shift());
    }
  }

  execute(command, response) {
    process.stdout.write('executing: ' + command + '\n');
    if (this.executing || this.connecting) {
      this.queue.push([command, response]);
      return;
    }
    this.executing = {response};
    response.on('finish', () => {
      delete this.executing;
      this.flush();
    });
    this.shell.write(command + '\n');
  }

  onHttpRequest(request, response) {
    const command = unescape(request.url.substr(1));
    response.writeHead(200, {'Content-Type': 'text/plain'});
    this.execute(command, response);
  }

  createServer() {
    this.server = http.createServer(this.onHttpRequest);
    this.server.on('clientError', (err, socket) => {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    });
    this.server.listen(this.options.listenPort);
  }
};

// -

const validArgs = argv.host && argv.port &&
  argv.username && (argv.privateKey || argv.password);

if (!validArgs) {
  throw new Error('missing arguments');
}

const server = new Server({
  host: argv.host,
  port: argv.port,
  username: argv.username,
  password: argv.password,
  keepaliveInterval: argv.keepAlive || 500,
  privateKey: argv.privateKey && fs.readFileSync(argv.privateKey),
  listenPort: argv.serverPort || 5656
});

server.connect();
server.createServer();

// -
