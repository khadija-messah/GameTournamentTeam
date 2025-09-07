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

function check_online_for_all(tab_friend, userId)
{
    const friend_online = tab_friend.filter(f=> clients.has(f.id) && f.id !== userId)
    const for_me = clients.get(userId) || []

    for(const i of for_me)
    {
      i.send(JSON.stringify({type:"status", online: friend_online}));
    }

    const send_to_friend = tab_friend.find(f=>f.id === userId && clients.has(f.id)) ||null
    if(send_to_friend)
    {
      friend_online.forEach(friend => {
        const friendConns = clients.get(friend.id) || [];
        for (const conn of friendConns) {
          conn.send(JSON.stringify({ type: "status", online: [send_to_friend] }));
        }
      })
    }
}

fastify.register(async function (fastify) {
  fastify.get('/ws/chat', { websocket: true }, (connection, req) => {
    let tab_friend = []
    connection.on('message', async (message) => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const data = JSON.parse(message);
      if (Array.isArray(data.friends))
        {
          data.friends.forEach(element => {
            tab_friend.push({id:element.id, name:element.name, avatar:element.avatar})
          });
        }
        if(data.type === 'user-info')
        {
          console.log("data id is : ", data.id)
          connection.userId = data.id;
          add_connection(data.id, connection)
          check_online_for_all(tab_friend,data.id)
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
        broadcast_all(data_send)
      }
      if(data.type === 'ping')
      {
        connection.send(JSON.stringify({ type: 'pong'}));
      }
    });

    connection.on('close', () => {
      if (connection.userId) {
        const conx = clients.get(connection.userId) || [];
        const filter = conx.filter(c => c !== connection);
    
        if (filter.length > 0)
          clients.set(connection.userId, filter);
        else
          clients.delete(connection.userId);
    
        const offline_user = tab_friend.find(f => f.id === connection.userId);
        if (offline_user) {
          tab_friend.forEach(friend => {
            if (clients.has(friend.id)) {
              const friendConns = clients.get(friend.id) || [];
              for (const conn of friendConns) {
                conn.send(JSON.stringify({ type: "status", offline: [offline_user] }));
              }
            }
          });
        }
      }
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
