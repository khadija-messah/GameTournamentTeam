
import './App.css';
import Online from './chat_front/online'
import Barre from './chat_front/barre_friend'
import Home from './chat_front/home'
import Bchat from './chat_front/background_chat'
function App() {
  return (
   <div>
    <Home/>
    <Online/>
    <Barre />
    <Bchat/>
    </div>
  );
}

export default App;
