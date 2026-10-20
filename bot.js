const mineflayer = require('mineflayer');
const autoAuth = require('mineflayer-auto-auth');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

let bot = null;
let antiAfkInterval = null;

let botConfig = {
    host: 'play.applemc.fun',
    port: 25565,
    username: 'Dragonfroge_02',
    password: ''
};

// Console log override to push everything to dashboard
const originalLog = console.log;
const originalError = console.error;

console.log = function (...args) {
    originalLog.apply(console, args);
    const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ');
    io.emit('message', `[CONSOLE] ${msg}`);
};

console.error = function (...args) {
    originalError.apply(console, args);
    const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ');
    io.emit('message', `[CONSOLE ERROR] ${msg}`);
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
            #chat-box { height: 350px; background: #020617; border-radius: 6px; padding: 10px; overflow-y: auto; font-family: monospace; border: 1px solid #334155; margin-bottom: 10px; font-size: 13px; }
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
                        <label>Account Password (Optional)</label>
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
                    <input type="text" id="cmd" placeholder="Type chat or command (/login, /register, etc.)" onkeydown="if(event.key==='Enter') sendMsg()">
                    <button onclick="sendMsg()">Send</button>
                </div>
            </div>
        </div>

        <script>
            const socket = io({ transports: ['websocket', 'polling'] });
            const chatBox = document.getElementById('chat-box');
            const statusEl = document.getElementById('bot-status');

            socket.on('connect', () => {
                const el = document.createElement('div');
                el.className = 'msg';
                el.innerText = '[SYSTEM] Dashboard Connected to Web Server!';
                chatBox.appendChild(el);
            });

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
        </script>
    </body>
    </html>
    `);
});

function startBotInstance(config) {
    if (bot) {
        console.log('[SYSTEM] Bot is already running!');
        return;
    }

    botConfig = config;
    console.log(`[SYSTEM] Connecting to ${config.host}:${config.port} as ${config.username}...`);

    const botOptions = {
        host: config.host,
        port: parseInt(config.port),
        username: config.username,
        version: '1.20.1',
        auth: 'offline',
        hideErrors: false,
        checkTimeout: 120000
    };

    if (config.password && config.password.trim() !== '') {
        botOptions.plugins = [autoAuth];
        botOptions.autoAuth = { logging: true, password: config.password };
    }

    bot = mineflayer.createBot(botOptions);

    bot.on('spawn', () => {
        console.log('[SYSTEM] Bot successfully spawned in the game world! Waiting for verification / login...');
        io.emit('status', 'online');

        // Note: No automatic movement/jump here so verification process is uninterrupted!
    });

    // Capture every raw game message / chat / title / notification
    bot.on('messagestr', (message) => {
        console.log(`[GAME] ${message}`);
    });

    bot.on('chat', (username, message) => {
        if (username !== bot.username) {
            console.log(`[CHAT] <${username}> ${message}`);
        }
    });

    bot.on('title', (text) => {
        console.log(`[TITLE/VERIFY] ${text}`);
    });

    bot.on('kicked', (reason) => {
        console.log(`[KICKED] Bot was kicked by server: ${JSON.stringify(reason)}`);
    });

    bot.on('end', (reason) => {
        console.log(`[SYSTEM] Bot disconnected: ${reason}`);
        io.emit('status', 'online' === 'offline' ? 'online' : 'offline');
        io.emit('status', 'offline');
        bot = null;
        if (antiAfkInterval) clearInterval(antiAfkInterval);
    });

    bot.on('error', (err) => {
        console.error(`[ERROR] Connection error: ${err.message}`);
        io.emit('status', 'offline');
    });
}

function stopBotInstance() {
    if (bot) {
        bot.quit('User disconnected from dashboard');
        bot = null;
        if (antiAfkInterval) clearInterval(antiAfkInterval);
        console.log('[SYSTEM] Bot disconnected successfully.');
        io.emit('status', 'offline');
    } else {
        console.log('[SYSTEM] No bot is currently running.');
    }
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
            console.log(`[SENT COMMAND] ${cmd}`);
        } else {
            console.log('[SYSTEM] Error: Bot is not connected. Press "Connect Bot" first.');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
