import { useEffect, useRef, useState } from 'react';
import BChat from '../src-image/backg_chat.png';

export default function Bchat() {
  const socket = useRef(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [id,setid] = useState()
  const heartbeatInterval = useRef(null);
  useEffect(() => {
    socket.current = new WebSocket('ws://localhost:8002/ws/chat');
    socket.current.onopen = () => {
      console.log("WebSocket connected");
      fetch('http://localhost:8080/api/users/get/me', {
        credentials: 'include',
        method: "GET",
      }).then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      }).then(data => {
        setid(data.id)
        const user = { type: "user-info", ...data};
        socket.current.send(JSON.stringify(user));
        fetch("https://dummyjson.com/users", {
            method: "GET",
          })
            .then((res) => res.json())
            .then((friends) => {
                console.log("userid", data.id)
              const msg = { type: "friends-list", friends,userId: data.id};
              socket.current.send(JSON.stringify(msg));
            })
      }).catch(error => console.error("Error fetching data:", error));
        heartbeatInterval.current = setInterval(() => {
        if (socket.current.readyState === WebSocket.OPEN) {
          socket.current.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
    };

    socket.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('data recive type', data.type)
      if(data.type === 'message')
      {
          console.log("client received message:", data.message, data.time);
          setMessages(prev => [...prev, { text: data.message, time: data.time }]);
      }
      if (data.type === 'pong') {
        console.log('Pong received from server');
        return;
      }
    };

    socket.current.onclose = () => console.log('disconnected from the server');
    socket.current.onerror = (error) => console.log('WebSocket error', error);

    return () => {
     clearInterval(heartbeatInterval.current);
      socket.current.close();
    };
  }, []);

  function get_message(event)
  {
    const msg = event.target.value
    setMessage(msg)
  }
  function sendMessage() {
    if(socket.current && message.trim() !== '')
    {
        const data = JSON.stringify({type:'message', message:message,id:id})
        console.log("message how ", message)
        socket.current.send(data)
        setMessage('')
    }
  }
    return (
        <div className="absolute w-65% h-82% top-14% left-28% m-0.1%">
          <img
            className='w-full h-full object-cover rounded-2xl'
            src={BChat}
            alt='background chat'
          />
          <div className="absolute w-full h-6% top-0.1% bg-bleu-custom/50 z-10 rounded-t-xl hover:shadow-xl transition-all">
            <h2 className='ml-5% top-15% absolute font-poppins font-semibold w-full h-full text-white'>n</h2>
            <img className=' absolute top-3% h-100%'src='/images/chat/caractere.png' alt='avatar'></img>
            <img
              src='/images/chat/icon_friend.png'
              alt='icon friend'
              className='relative top-6% w-2.5% h-80% ml-96.5%'
            />
          </div>
    
          <div className="absolute top-8% left-2% right-2% bottom-12% overflow-y-auto flex flex-col gap-2">
            {messages.map((m, i) => (
              <h5
                key={i}
                className="px-3 py-1 text-gray-50 bg-bleu-custom rounded-xl w-fit inline-block "
              >
                <span>{m.text}</span>
                <br />
                <span className="text-xs opacity-70">{m.time}</span>
              </h5>
            ))}
          </div>
          <div className="absolute left-2% w-97% h-7% bottom-2% transition-all flex">
            <input
              className='w-full h-full rounded-3xl px-3 hover:shadow-lg opacity-40 placeholder:text-[1vw] focus:outline-none'
              value={message}
              onChange={get_message}
              onKeyDown={(e) => { e.key === 'Enter' && sendMessage() }}
              placeholder="Type your message..."
            />
            <button onClick={sendMessage}>
              <img
                className='absolute left-96% top-23% w-3% h-50%'
                src='images/chat/send-msg.png'
                alt="icon send"
              />
            </button>
          </div>
        </div>
      );
}

