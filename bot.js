const mineflayer = require('mineflayer');
const autoAuth = require('mineflayer-auto-auth');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { HttpProxyAgent } = require('http-proxy-agent');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3000;

let bot = null;
let lookInterval = null;

let botConfig = {
    host: 'play.applemc.fun',
    port: 25565,
    username: 'Dragonfroge_02',
    password: '',
    proxyHost: '45.38.107.97',
    proxyPort: '6014',
    proxyUser: 'uqbylpwv',
    proxyPass: 'sviu1ch7jzgw'
};

const originalLog = console.log;
const originalError = console.error;

console.log = function (...args) {
    originalLog.apply(console, args);
    const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ');
    io.emit('message', { type: 'info', text: `[CONSOLE] ${msg}` });
};

console.error = function (...args) {
    originalError.apply(console, args);
    const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ');
    io.emit('message', { type: 'error', text: `[ERROR] ${msg}` });
};

app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>DragonForge AFK Studio v2.0</title>
        <script src="/socket.io/socket.io.js"></script>
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
            :root {
                --bg: #090d16;
                --card-bg: #111827;
                --accent: #38bdf8;
                --green: #10b981;
                --red: #ef4444;
                --border: #1e293b;
            }
            * { box-sizing: border-box; font-family: 'Plus Jakarta Sans', sans-serif; margin: 0; padding: 0; }
            body { background: var(--bg); color: #f3f4f6; padding: 20px; display: flex; justify-content: center; }
            .wrapper { width: 100%; max-width: 900px; display: flex; flex-direction: column; gap: 20px; }
            
            header { display: flex; justify-content: space-between; align-items: center; background: var(--card-bg); border: 1px solid var(--border); padding: 18px 24px; border-radius: 12px; }
            header h1 { font-size: 20px; font-weight: 700; color: var(--accent); letter-spacing: -0.5px; }
            .badge { padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
            .bg-online { background: rgba(16, 185, 129, 0.15); color: var(--green); border: 1px solid var(--green); }
            .bg-offline { background: rgba(239, 68, 68, 0.15); color: var(--red); border: 1px solid var(--red); }

            .panel { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
            .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 15px; }
            .field-group { display: flex; flex-direction: column; gap: 6px; }
            label { font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; }
            input { background: #0b0f19; border: 1px solid #1f2937; color: #fff; padding: 10px; border-radius: 8px; font-size: 13px; outline: none; transition: 0.2s; }
            input:focus { border-color: var(--accent); }

            .proxy-title { font-size: 13px; color: var(--accent); font-weight: 600; margin: 10px 0 10px 0; border-top: 1px solid #1e293b; padding-top: 10px; }

            .btn-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; }
            button { padding: 12px; border: none; border-radius: 8px; font-weight: 700; font-size: 14px; cursor: pointer; transition: 0.2s; }
            .btn-start { background: var(--green); color: #000; }
            .btn-start:hover { opacity: 0.9; }
            .btn-stop { background: var(--red); color: #fff; }
            .btn-stop:hover { opacity: 0.9; }

            .console-box { background: #030712; border: 1px solid #111827; border-radius: 10px; height: 380px; padding: 15px; overflow-y: auto; font-family: 'JetBrains Mono', monospace; font-size: 13px; line-height: 1.6; display: flex; flex-direction: column; gap: 6px; }
            .msg { word-break: break-all; white-space: pre-wrap; }
            .msg-info { color: #93c5fd; }
            .msg-error { color: #fca5a5; font-weight: 600; background: rgba(239, 68, 68, 0.1); padding: 4px 8px; border-radius: 4px; border-left: 3px solid var(--red); }
            .msg-game { color: #a7f3d0; }
            .msg-chat { color: #fde047; }

            .input-row { display: flex; gap: 10px; margin-top: 12px; }
            .input-row input { flex: 1; }
            .btn-send { background: var(--accent); color: #000; width: 100px; }
        </style>
    </head>
    <body>
        <div class="wrapper">
            <header>
                <h1>DragonForge AFK Studio v2.0</h1>
                <div id="bot-status" class="badge bg-offline">OFFLINE</div>
            </header>

            <div class="panel">
                <div class="grid">
                    <div class="field-group">
                        <label>Server Host / IP</label>
                        <input type="text" id="host" value="${botConfig.host}">
                    </div>
                    <div class="field-group">
                        <label>Port</label>
                        <input type="text" id="port" value="${botConfig.port}">
                    </div>
                    <div class="field-group">
                        <label>Bot Name</label>
                        <input type="text" id="username" value="${botConfig.username}">
                    </div>
                    <div class="field-group">
                        <label>Password (AutoAuth)</label>
                        <input type="text" id="password" value="${botConfig.password}" placeholder="Optional">
                    </div>
                </div>

                <div class="proxy-title">HTTP Proxy (Webshare)</div>
                <div class="grid">
                    <div class="field-group">
                        <label>Proxy IP / Host</label>
                        <input type="text" id="proxyHost" value="${botConfig.proxyHost}">
                    </div>
                    <div class="field-group">
                        <label>Proxy Port</label>
                        <input type="text" id="proxyPort" value="${botConfig.proxyPort}">
                    </div>
                    <div class="field-group">
                        <label>Proxy User</label>
                        <input type="text" id="proxyUser" value="${botConfig.proxyUser}">
                    </div>
                    <div class="field-group">
                        <label>Proxy Pass</label>
                        <input type="text" id="proxyPass" value="${botConfig.proxyPass}">
                    </div>
                </div>

                <div class="btn-grid">
                    <button class="btn-start" onclick="connectBot()">LAUNCH BOT</button>
                    <button class="btn-stop" onclick="disconnectBot()">DISCONNECT</button>
                </div>
            </div>

            <div class="panel">
                <div id="console" class="console-box"></div>
                <div class="input-row">
                    <input type="text" id="cmd" placeholder="Send chat message or command..." onkeydown="if(event.key==='Enter') sendMsg()">
                    <button class="btn-send" onclick="sendMsg()">SEND</button>
                </div>
            </div>
        </div>

        <script>
            const socket = io({ transports: ['websocket', 'polling'] });
            const consoleBox = document.getElementById('console');
            const statusEl = document.getElementById('bot-status');

            function appendLog(text, type = 'info') {
                const div = document.createElement('div');
                div.className = 'msg msg-' + type;
                div.innerText = text;
                consoleBox.appendChild(div);
                consoleBox.scrollTop = consoleBox.scrollHeight;
            }

            socket.on('connect', () => {
                appendLog('[SYSTEM] Studio Dashboard Online & Ready.', 'info');
            });

            socket.on('message', (data) => {
                if(typeof data === 'object') {
                    appendLog(data.text, data.type);
                } else {
                    appendLog(data, 'info');
                }
            });

            socket.on('status', (state) => {
                if(state === 'online') {
                    statusEl.innerText = 'ONLINE';
                    statusEl.className = 'badge bg-online';
                } else {
                    statusEl.innerText = 'OFFLINE';
                    statusEl.className = 'badge bg-offline';
                }
            });

            function connectBot() {
                const host = document.getElementById('host').value;
                const port = document.getElementById('port').value;
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;

                const proxyHost = document.getElementById('proxyHost').value;
                const proxyPort = document.getElementById('proxyPort').value;
                const proxyUser = document.getElementById('proxyUser').value;
                const proxyPass = document.getElementById('proxyPass').value;

                socket.emit('startBot', { host, port, username, password, proxyHost, proxyPort, proxyUser, proxyPass });
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
    console.log(`[SYSTEM] Initializing Client Connection to ${config.host}:${config.port}...`);

    const botOptions = {
        host: config.host,
        port: parseInt(config.port),
        username: config.username,
        version: '1.20.1',
        auth: 'offline',
        hideErrors: false,
        checkTimeout: 120000
    };

    if (config.proxyHost && config.proxyPort) {
        let proxyUrl = '';
        if (config.proxyUser && config.proxyPass) {
            proxyUrl = `http://${config.proxyUser}:${config.proxyPass}@${config.proxyHost}:${config.proxyPort}`;
        } else {
            proxyUrl = `http://${config.proxyHost}:${config.proxyPort}`;
        }
        console.log(`[PROXY] Routing connection through HTTP Proxy: ${config.proxyHost}:${config.proxyPort}`);
        const agent = new HttpProxyAgent(proxyUrl);
        botOptions.agent = agent;
    }

    if (config.password && config.password.trim() !== '') {
        botOptions.plugins = [autoAuth];
        botOptions.autoAuth = { logging: true, password: config.password };
    }

    bot = mineflayer.createBot(botOptions);

    bot.on('spawn', () => {
        console.log('[SYSTEM] Bot successfully spawned in game!');
        io.emit('status', 'online');

        if (lookInterval) clearInterval(lookInterval);
        lookInterval = setInterval(() => {
            if (bot && bot.entity) {
                const yaw = (Math.random() - 0.5) * 0.4;
                const pitch = (Math.random() - 0.5) * 0.2;
                bot.look(bot.entity.yaw + yaw, bot.entity.pitch + pitch, false);
            }
        }, 5000);
    });

    bot.on('messagestr', (message) => {
        io.emit('message', { type: 'game', text: `[GAME] ${message}` });
    });

    bot.on('chat', (username, message) => {
        if (username !== bot.username) {
            io.emit('message', { type: 'chat', text: `[CHAT] <${username}> ${message}` });
        }
    });

    bot.on('kicked', (reason) => {
        let parsedReason = reason;
        try {
            if (typeof reason === 'object') {
                parsedReason = JSON.stringify(reason, null, 2);
            }
        } catch (e) {
            parsedReason = String(reason);
        }
        console.error(`[KICKED FULL REASON] ${parsedReason}`);
        io.emit('message', { type: 'error', text: `[KICKED] ${parsedReason}` });
    });

    bot.on('end', (reason) => {
        console.log(`[SYSTEM] Disconnected: ${reason}`);
        io.emit('status', 'offline');
        bot = null;
        if (lookInterval) clearInterval(lookInterval);
    });

    bot.on('error', (err) => {
        console.error(`[ERROR] ${err.message}`);
        io.emit('status', 'offline');
    });
}

function stopBotInstance() {
    if (bot) {
        bot.quit('User disconnected');
        bot = null;
        if (lookInterval) clearInterval(lookInterval);
        console.log('[SYSTEM] Bot disconnected.');
        io.emit('status', 'offline');
    }
}

io.on('connection', (socket) => {
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
            io.emit('message', { type: 'info', text: `[SENT] ${cmd}` });
        } else {
            io.emit('message', { type: 'error', text: '[SYSTEM] Bot is not connected!' });
        }
    });
});

server.listen(PORT, () => {
    console.log(`Dashboard Server active on port ${PORT}`);
});
