const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const players = {};
const mobs = [];

function spawnMob() {
  const mob = {
    id: 'mob-' + Date.now(),
    x: Math.random() * 100 - 50,
    y: 0,
    z: Math.random() * 100 - 50,
    hp: 100,
    target: null
  };
  mobs.push(mob);
}

function gameLoop() {
  mobs.forEach(mob => {
    let closest = null;
    let closestDist = Infinity;
    for (const id of Object.keys(players)) {
      const p = players[id];
      const dx = p.x - mob.x;
      const dz = p.z - mob.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < closestDist) {
        closestDist = dist;
        closest = p;
      }
    }
    mob.target = closest ? closest.id : null;
    if (closest) {
      const dx = closest.x - mob.x;
      const dz = closest.z - mob.z;
      const length = Math.sqrt(dx * dx + dz * dz);
      if (length > 0) {
        mob.x += (dx / length) * 0.05;
        mob.z += (dz / length) * 0.05;
      }
    }
  });

  io.emit('worldState', { players, mobs });
}

setInterval(spawnMob, 10000);
setInterval(gameLoop, 50);

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  players[socket.id] = {
    id: socket.id,
    x: 0,
    y: 0,
    z: 0,
    hp: 100,
    name: 'Player-' + socket.id.slice(0, 4)
  };
  socket.emit('worldState', { players, mobs });

  socket.on('move', (pos) => {
    const player = players[socket.id];
    if (player) {
      player.x = pos.x;
      player.y = pos.y;
      player.z = pos.z;
    }
  });

  socket.on('chat', (msg) => {
    const player = players[socket.id];
    if (player) {
      io.emit('chat', { from: player.name, text: msg });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    delete players[socket.id];
  });
});

app.use(express.static('../client'));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`MMO server listening on port ${PORT}`);
});
