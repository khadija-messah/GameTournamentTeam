import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify();

fastify.register(websocket)
fastify.register(cors, { origin: '*' });

fastify.register(fastifyStatic, {
  root: path.join(__dirname, '..', '/public'),
});
const clients = new Map();


function add_connection(from, connection)
{
  if(!clients.has(from))
  {
    clients.set(from,[])
  }
  clients.get(from).push(connection); 
}

function broadcast_all(data_send) {
  const conns = clients.get(data_send.to);
  if (conns) {
    for (const i of conns) {
      if (i.readyState === i.OPEN) {
        i.send(JSON.stringify(data_send));
      }
    }
  }
  const fromConns = clients.get(data_send.from);
  if (fromConns) {
    for (const i of fromConns) {
      if (i.readyState === i.OPEN) {
        i.send(JSON.stringify(data_send));
      }
    }
  }
}

function find_online(data_send)
{
    broadcast_all(data_send)
}
fastify.register(async function (fastify) {
  fastify.get('/ws/chat', { websocket: true }, (connection, req) => {
    connection.on('message', async (message) => {

      const now = new Date();
      const hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const data = JSON.parse(message);
      let online_friends;
      if(data.type === 'user-info')
      {
        add_connection(data.id, connection)
      }
      if(data.type === 'message')
      {
        const data_send = 
        {
          from:data.from,
          to:data.to,
          username:'vous',
          time:`${hours}:${minutes}`,
          type:data.type,
          message:data.message
        }
        find_online(data_send)
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
