import logo from '../src-image/logo.png';
import rectongle from '../src-image/rectongle.png';

export default function Header()
{
    return (
        <div>
            <img
            src={rectongle}
            alt='rectongle'
            className="absolute top-0 left-1/2 -translate-x-1/2 w-9/12 h-14 object-cover opacity-40"
            />
            <div className="absolute top-0 w-full bg-sky-custom h-14 opacity-50"></div>
            <img src={logo} alt='logo' className='absolute inset-0 w-32 h-14'/>
        </div>
    )
}
