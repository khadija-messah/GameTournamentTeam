import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify();

fastify.register(websocket);
fastify.register(cors, { origin: '*' });

fastify.register(fastifyStatic, {
  root: path.join(__dirname, '..', '/public'),
});

const clients = new Map();
const userFriends = new Map();

function add_connection(userId, connection) {
  if (!clients.has(userId)) clients.set(userId, []);
  clients.get(userId).push(connection);
}

function remove_connection(userId, connection) {
  if (!clients.has(userId)) return;
  const remaining = clients.get(userId).filter(c => c !== connection);
  if (remaining.length > 0) {
    clients.set(userId, remaining);
  } else {
    clients.delete(userId);
    broadcast_offline(userId);
  }
}

function set_user_friends(userId, friends) {
  userFriends.set(userId, friends);
}

function broadcast_online(userId) {
  const friends = userFriends.get(userId) || [];
  const online_friends = friends.filter(f => clients.has(f.id));

  const userConns = clients.get(userId) || [];
  userConns.forEach(conn => {
    conn.send(JSON.stringify({ type: "status", online: online_friends }));
  });

  online_friends.forEach(friend => {
    const friendConns = clients.get(friend.id) || [];
    friendConns.forEach(conn => {
      const friendList = (userFriends.get(friend.id) || []).filter(f => clients.has(f.id) && f.id !== friend.id);
      conn.send(JSON.stringify({ type: "status", online: friendList }));
    });
  });
}

function broadcast_offline(userId) {
  const friends = userFriends.get(userId) || [];
  friends.forEach(friend => {
    if (clients.has(friend.id)) {
      const friendConns = clients.get(friend.id);
      friendConns.forEach(conn => {
        conn.send(JSON.stringify({ type: "status", offline: [{ id: userId }] }));
      });
    }
  });
}
function broadcast_all(data_send) 
{ 
  const conns = clients.get(data_send.to); 
  if (conns) 
  { 
    for (const i of conns) 
      { if (i.readyState === i.OPEN) 
        { 
          i.send(JSON.stringify(data_send)); 
        } 
      } 
  } 
  const fromConns = clients.get(data_send.from); 
  if (fromConns) 
    { 
      for (const i of fromConns) 
        { 
          if (i.readyState === i.OPEN) 
            { 
              i.send(JSON.stringify(data_send)); 
            } 
        } 
    } 
}
fastify.register(async function (fastify) {
  fastify.get('/ws/chat', { websocket: true }, (connection, req) => {
    connection.on('message', async (message) => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');

      const data = JSON.parse(message);

      if (Array.isArray(data.friends)) {
        set_user_friends(data.id, data.friends);
      }

      if (data.type === 'user-info') {
        connection.userId = data.id;
        add_connection(data.id, connection);
        broadcast_online(data.id);
      }

      if (data.type === 'message') {
        const fromId = data.from;
        const toId = data.to;
        const data_send = {
          type: data.type,
          from: fromId,
          to: toId,
          message: data.message,
          time: `${hours}:${minutes}`,
        };
        broadcast_all(data_send);
        try {
          await Promise.all([
            prisma.user.upsert({
              where: { id: fromId },
              update: { name: String(fromId) },
              create: { id: fromId, name: String(fromId) }
            }),
            prisma.user.upsert({
              where: { id: toId },
              update: { name: String(toId) },
              create: { id: toId, name: String(toId) }
            })
          ]);

          await prisma.message.create({
            data: {
              text: data.message,
              time: now,
              fromId,
              toId
            }
          });
        } catch(err) {
          console.log("Database error:", err);
        }
      }

      if (data.type === 'ping') {
        connection.send(JSON.stringify({ type: 'pong' }));
      }
    });

    connection.on('close', () => {
      if (connection.userId) remove_connection(connection.userId, connection);
    });
  });

  fastify.get('/api/messages/:userId', async (request, reply) => {
    const userId = parseInt(request.params.userId);
    try {
      const messages = await prisma.message.findMany({
        where: {
          OR: [
            { fromId: userId },
            { toId: userId }
          ]
        },
        orderBy: { time: 'asc' }
      });
      reply.send(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      reply.status(500).send({ error: "Cannot fetch messages" });
    }
  });
});

const start = async () => {
  try {
    const port = process.env.PORT || 8002;
    await fastify.listen({ port: port, host: '0.0.0.0' });
    console.log(`Server running on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
