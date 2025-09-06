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
function broadcast_status_friend(id, status,flag)
{
  const conns = clients.get(id);
  if (conns) {
    for (const i of conns) {
      if (i.readyState === i.OPEN) {
        i.send(JSON.stringify({type:"status",status}));
      }
    }
  }
}

function check_online(tab_friend)
{
    let friend_online = []

    for(let i = 0; i < tab_friend.length;i++)
    {
        if(clients.has(tab_friend[i].id))
        {
          if (!friend_online.some(f => f.id === tab_friend[i].id)) {
            friend_online.push({
                id: tab_friend[i].id,
                avatar: tab_friend[i].avatar,
                name: tab_friend[i].name
            });
          }
        }
    }
    return friend_online
}
let tab_friend = []
let id_f;
let id_t;
fastify.register(async function (fastify) {
  fastify.get('/ws/chat', { websocket: true }, (connection, req) => {
    connection.on('message', async (message) => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const data = JSON.parse(message);
      if (Array.isArray(data.friends))
        {
          data.friends.forEach(element => {
            if (!tab_friend.some(f => f.id === element.id)) {
              tab_friend.push({ id: element.id, name: element.name, avatar: element.avatar });
            }
          });
        }
        if(data.type === 'user-info')
          {
            add_connection(data.id, connection)
            connection.userId = data.id;
            id_f = data.id
            const friend_status = check_online(tab_friend)
            tab_friend.forEach(friend => {
              broadcast_status_friend(friend.id, friend_status, 1);
            });
          }
        for (const [id, conns] of clients.entries()) {
          console.log(`User ${id} has ${conns.length} connection(s).`);
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
        id_f = data.from
        id_t = data.to
        broadcast_all(data_send)
      }
      if(data.type === 'ping')
      {
        connection.send(JSON.stringify({ type: 'pong'}));
      }
    });

    connection.on('close', () => {
      if(connection.userId)
      {
        const conx = clients.get(connection.userId)||[]
        const filter = conx.filter(function (c){
          return c!== connection
        })
        if(filter.length > 0)
          clients.set(connection.userId, filter)
        else
            clients.delete(connection.userId)
      }
      const friend_status = check_online(tab_friend)
      tab_friend.forEach(friend => {
        broadcast_status_friend(friend.id, friend_status, 2);
      });
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
