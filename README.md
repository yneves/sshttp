# sshttp
Send commands to a persistent ssh connection.

## Installation

```
npm install -g sshttp
```

## Usage

Create an http server listening to the specified port and forwarding commands to a persistent ssh connection.

```
sshttp-server --host="255.255.255.255" --port="22" --username="root" --password="123456" --privateKey="path/to/private/key" --serverPort="8888"
```

Send a command and see the output.

```
sshttp --serverPort="8888" --command="pm2 restart stuff"
```
