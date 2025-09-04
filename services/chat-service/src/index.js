import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from './generated/prisma/index.js'
import { time } from 'console';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connections = new Map();
const fastify = Fastify();

fastify.register(websocket)
fastify.register(cors, { origin: '*' });

fastify.register(fastifyStatic, {
  root: path.join(__dirname, '..', '/public'),
});
const clients = new Map();


function add_connection(id, connection)
{
  if(!clients.has(id))
  {
    clients.set(id,[])
  }
  clients.get(id).push(connection); 
}


function broadcast_all(msg) {
  const conns = clients.get(msg.id);
  if (conns) {
    for (const i of conns) {
      if (i.readyState === i.OPEN) {
        i.send(JSON.stringify(msg));
      }
    }
  }
}

fastify.register(async function (fastify) {
  fastify.get('/ws/chat', { websocket: true }, (connection, req) => {
    connection.on('message', async (message) => {

      const now = new Date();
      const hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const data = JSON.parse(message);
      console.log("-----> ", data)
      let online_friends;
      if(data.type === 'user-info')
      {
        add_connection(data.id, connection)
        console.log("size map is ",clients.size)
      }
      if(data.type === 'message')
      {
        const data_send = 
        {
          id:data.id,
          username:'vous',
          time:`${hours}:${minutes}`,
          type:data.type,
          message:data.message
        }
        broadcast_all(data_send)
      }
      if(data.type === 'ping')
      {
        connection.send(JSON.stringify({ type: 'pong'}));
      }
    });

    connection.on('close', () => {
      console.log('WebSocket connection closed');
    });
    
  });
});
const start = async () => {
  try {
    const port = process.env.PORT || 8002;
    await fastify.listen({ port: port, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
