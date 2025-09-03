import { useEffect,useState } from 'react'
import Bchat from './background_chat'
export default function Online() {
    return (
        <div>
            <div
                className="absolute top-14% inset-0 bg-sky-custom/35 w-5% h-82%  rounded-lg object-cover  mx-1% overflow-y-auto"  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#659EAC transparent',
                    msOverflowStyle: 'auto',
                  }}>
                <Get_user/>
            </div>
            <img src='images/chat/icon_online.png' alt="icon online" className=" absolute top-12% mx-4% h-2.5% w-1.5% "></img>
            <div
                className="absolute top-14% right-0 bg-sky-custom/35 w-5% h-82%  rounded-lg object-cover  mx-1% overflow-y-auto"  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#4D8995 transparent',
                    msOverflowStyle: 'auto',
                  }}>
                <Get_user/>
            </div>
            <img src='images/chat/icon_online.png' alt="icon online" className=" absolute top-12% mx-97% h-2.5% w-1.5%"></img>
        </div>
    )
}

export function Get_user() {
    const [users, setUsers] = useState([]);
    useEffect(()=>{
        fetch('https://dummyjson.com/users')
        .then(res => res.json())
        .then(data=>setUsers(data.users))
        .catch(error=>console.log(error))
    },[])
    return (
        
      <div>
        {users.map((user, index) =>(
            <div key={index}>
                <button className='hover:shadow'>
                <img className='ml-40% rounded-full w-70% h-70%' src={user.image} alt={user.firstName} ></img>
                <p className="text-center">{user.id}</p>
                <br></br>
                </button>
            </div>
        ))}
      </div>
    );
  }
