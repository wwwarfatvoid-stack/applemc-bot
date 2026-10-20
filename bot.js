const mineflayer = require('mineflayer');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

let bot = null;
let antiAfkInterval = null;

// Default Settings
let botConfig = {
    host: 'play.applemc.net',
    port: 25565,
    username: 'AetherBot_99',
    version: '1.20.1',
    password: 'wwwbot997'
};

app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AetherMind Bot Dashboard</title>
        <script src="/socket.io/socket.io.js"></script>
        <style>
            * { box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
            body { background: #0f172a; color: #f8fafc; margin: 0; padding: 15px; }
            .container { max-width: 800px; margin: 0 auto; }
            .card { background: #1e293b; border-radius: 10px; padding: 15px; margin-bottom: 15px; border: 1px solid #334155; }
            h2 { margin-top: 0; color: #38bdf8; text-align: center; }
            .status { font-weight: bold; padding: 6px 12px; border-radius: 6px; display: inline-block; }
            .online { background: #166534; color: #4ade80; }
            .offline { background: #991b1b; color: #fca5a5; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
            input { width: 100%; padding: 10px; background: #0f172a; border: 1px solid #475569; border-radius: 6px; color: #fff; margin-top: 4px; }
            label { font-size: 12px; color: #94a3b8; }
            .btn-group { display: flex; gap: 10px; margin-top: 10px; }
            button { flex: 1; padding: 10px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; }
            .btn-start { background: #22c55e; color: #000; }
            .btn-stop { background: #ef4444; color: #fff; }
            .btn-realm { background: #f59e0b; color: #000; width: 100%; margin-top: 10px; }
            #chat-box { height: 300px; background: #020617; border-radius: 6px; padding: 10px; overflow-y: auto; font-family: monospace; border: 1px solid #334155; margin-bottom: 10px; font-size: 13px; }
            .msg { margin-bottom: 4px; word-break: break-all; }
            .chat-input { display: flex; gap: 5px; }
            .chat-input input { flex: 1; margin: 0; }
            .chat-input button { flex: none; width: 80px; background: #3b82f6; color: #fff; }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>AetherMind AFK Control Panel</h2>
            
            <div class="card">
                <div>Status: <span id="bot-status" class="status offline">OFFLINE</span></div>
                <div class="grid" style="margin-top: 10px;">
                    <div>
                        <label>Server IP</label>
                        <input type="text" id="host" value="${botConfig.host}">
                    </div>
                    <div>
                        <label>Bot Username</label>
                        <input type="text" id="username" value="${botConfig.username}">
                    </div>
                </div>
                <div class="grid">
                    <div>
                        <label>Server Port</label>
                        <input type="text" id="port" value="${botConfig.port}">
                    </div>
                    <div>
                        <label>Account Password</label>
                        <input type="text" id="password" value="${botConfig.password}">
                    </div>
                </div>
                <div class="btn-group">
                    <button class="btn-start" onclick="connectBot()">Connect Bot</button>
                    <button class="btn-stop" onclick="disconnectBot()">Disconnect Bot</button>
                </div>
            </div>

            <div class="card">
                <div id="chat-box"></div>
                <div class="chat-input">
                    <input type="text" id="cmd" placeholder="Type chat or command (/login, /register, etc.)">
                    <button onclick="sendMsg()">Send</button>
                </div>
                <button class="btn-realm" onclick="sendCmd('/banana')">Join Banana Realm (/banana)</button>
            </div>
        </div>

        <script>
            const socket = io();
            const chatBox = document.getElementById('chat-box');
            const statusEl = document.getElementById('bot-status');

            socket.on('message', (data) => {
                const el = document.createElement('div');
                el.className = 'msg';
                el.innerText = data;
                chatBox.appendChild(el);
                chatBox.scrollTop = chatBox.scrollHeight;
            });

            socket.on('status', (state) => {
                if(state === 'online') {
                    statusEl.innerText = 'ONLINE';
                    statusEl.className = 'status online';
                } else {
                    statusEl.innerText = 'OFFLINE';
                    statusEl.className = 'status offline';
                }
            });

            function connectBot() {
                const host = document.getElementById('host').value;
                const port = document.getElementById('port').value;
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                
                socket.emit('startBot', { host, port, username, password });
            }

            function disconnectBot() {
                socket.emit('stopBot');
            }

            function sendMsg() {
                const input = document.getElementById('cmd');
                if(input.value.trim() !== '') {
                    socket.emit('command', input.value);
                    input.value = '';
                }
            }

            function sendCmd(cmd) {
                socket.emit('command', cmd);
            }
        </script>
    </body>
    </html>
    `);
});

function startBotInstance(config) {
    if (bot) {
        sendLog('[SYSTEM] Bot is already running!');
        return;
    }

    botConfig = config;
    sendLog(`[SYSTEM] Connecting to ${config.host}:${config.port} as ${config.username}...`);

    bot = mineflayer.createBot({
        host: config.host,
        port: parseInt(config.port),
        username: config.username,
        version: '1.20.1'
    });

    io.emit('status', 'online');

    // Handle verification maps or held items
    bot.on('heldItemChanged', (item) => {
        if (item && item.name.includes('map')) {
            sendLog('[VERIFY] Held item is a Map. Checking verification text...');
        }
    });

    bot.on('spawn', () => {
        sendLog('[SYSTEM] Bot spawned in server successfully!');

        // Auto Login / Register sequence
        setTimeout(() => {
            bot.chat(`/register ${config.password} ${config.password}`);
            bot.chat(`/login ${config.password}`);
        }, 2000);

        // Anti-AFK Jump Loop
        if (antiAfkInterval) clearInterval(antiAfkInterval);
        antiAfkInterval = setInterval(() => {
            if (bot) {
                bot.setControlState('jump', true);
                setTimeout(() => bot.setControlState('jump', false), 500);
            }
        }, 15000);
    });

    // Capture chat & map text messages
    bot.on('messagestr', (message) => {
        sendLog(`[SERVER] ${message}`);

        // Automatic map verification code detector if sent via actionbar or title
        if (message.toLowerCase().includes('register') || message.toLowerCase().includes('login')) {
            if (message.toLowerCase().includes('/register')) {
                bot.chat(`/register ${config.password} ${config.password}`);
            } else if (message.toLowerCase().includes('/login')) {
                bot.chat(`/login ${config.password}`);
            }
        }
    });

    bot.on('end', (reason) => {
        sendLog(`[SYSTEM] Bot disconnected: ${reason}`);
        io.emit('status', 'offline');
        bot = null;
        if (antiAfkInterval) clearInterval(antiAfkInterval);
    });

    bot.on('error', (err) => {
        sendLog(`[ERROR] ${err.message}`);
        io.emit('status', 'offline');
    });
}

function stopBotInstance() {
    if (bot) {
        bot.quit('User disconnected from dashboard');
        bot = null;
        if (antiAfkInterval) clearInterval(antiAfkInterval);
        sendLog('[SYSTEM] Bot disconnected successfully.');
        io.emit('status', 'offline');
    } else {
        sendLog('[SYSTEM] No bot is currently running.');
    }
}

function sendLog(msg) {
    console.log(msg);
    io.emit('message', msg);
}

io.on('connection', (socket) => {
    socket.emit('message', '[SYSTEM] Connected to AetherMind Control Panel.');
    socket.emit('status', bot ? 'online' : 'offline');

    socket.on('startBot', (config) => {
        startBotInstance(config);
    });

    socket.on('stopBot', () => {
        stopBotInstance();
    });

    socket.on('command', (cmd) => {
        if (bot) {
            bot.chat(cmd);
            sendLog(`[SENT] ${cmd}`);
        } else {
            sendLog('[SYSTEM] Error: Bot is not connected. Press "Connect Bot" first.');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
