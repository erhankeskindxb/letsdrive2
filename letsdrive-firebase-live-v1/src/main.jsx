import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { collection, doc, onSnapshot, orderBy, query, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Car, Users, Calendar, Wallet, Fuel, MessageCircle, BarChart3, Settings, LogOut, MapPin, Clock, Send, ShieldCheck, Truck, Menu } from 'lucide-react';
import { db } from './firebase';
import './styles.css';

function useCollection(name){
  const [rows,setRows]=useState([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    let q = collection(db,name);
    const unsub=onSnapshot(q,(snap)=>{
      setRows(snap.docs.map(d=>({id:d.id,...d.data()})));
      setLoading(false);
    },()=>setLoading(false));
    return ()=>unsub();
  },[name]);
  return {rows,loading};
}
function money(n){ return `${Number(n||0).toLocaleString('en-US')} AED`; }
function fmtTime(ts){
  try{ const d=ts?.toDate?ts.toDate():new Date(ts); return d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}); }catch{return '-'}
}
function Logo(){return <div className="logo"><span>LETS</span><b>DRIVE</b></div>}
function Sidebar({role='admin'}){const items= role==='driver' ? [['Dashboard',Car],['My Trips',Calendar],['Passengers',Users],['Fuel Records',Fuel],['Messages',MessageCircle],['My Balance',Wallet],['Logout',LogOut]] : [['Dashboard',BarChart3],['Trip Management',Calendar],['Drivers',Car],['Passengers',Users],['Vehicles',Truck],['Payments',Wallet],['Fuel Records',Fuel],['Reports',BarChart3],['Settings',Settings]];return <aside className="sidebar"><Logo/><div className="profile"><div className="avatar">MB</div><div><b>{role==='driver'?'Michael Brown':'Admin User'}</b><small>{role==='driver'?'Driver':'Administrator'}</small></div></div>{items.map(([t,I],i)=><div className={'nav '+(i===0?'active':'')} key={t}><I size={18}/>{t}</div>)}</aside>}
function Shell({children,role}){return <div className="app"><Sidebar role={role}/><main><header><Menu/><input placeholder="Search anything..."/><div className="pill">English</div></header>{children}</main></div>}
function Stat({title,value,icon}){return <div className="stat"><div className="icon">{icon}</div><small>{title}</small><h2>{value}</h2></div>}
function Mini({title,rows}){return <section className="card"><h2>{title}</h2>{rows.length?rows.map((r)=><div className="line" key={r[0]}><b>{r[0]}</b><span>{r[1]}</span><small>{r[2]||''}</small></div>):<p className="muted">No records yet.</p>}</section>}

function AdminDashboard(){
 const {rows:trips}=useCollection('trips');
 const {rows:drivers}=useCollection('drivers');
 const {rows:passengers}=useCollection('passengers');
 const {rows:vehicles}=useCollection('vehicles');
 const todaysTrips=trips.length;
 const completed=trips.filter(t=>t.status==='completed').length;
 const revenue=trips.reduce((s,t)=>s+Number(t.fare||t.actualFare||0),0);
 const activeDrivers=drivers.filter(d=>(d.status||'').toLowerCase()==='active').length;
 const ongoing=trips.filter(t=>!['scheduled','completed','cancelled'].includes(t.status));
 const visibleTrips=ongoing.length?ongoing:trips;
 return <Shell><h1>Dashboard</h1><p className="muted">Live Firebase operations overview.</p><div className="grid4"><Stat title="Total Trips" value={todaysTrips} icon="📅"/><Stat title="Completed" value={completed} icon="✅"/><Stat title="Revenue" value={money(revenue)} icon="💳"/><Stat title="Active Drivers" value={activeDrivers} icon="🚘"/></div><section className="card"><h2>Ongoing Trips</h2><table><thead><tr><th>Trip</th><th>Time</th><th>Passenger</th><th>Driver</th><th>Route</th><th>Status</th><th>Fare</th></tr></thead><tbody>{visibleTrips.map(t=>{const p=passengers.find(x=>x.id===t.passengerId); const d=drivers.find(x=>x.id===t.driverId); return <tr key={t.id}><td>{t.id}</td><td>{fmtTime(t.pickupTime)}</td><td>{p?.name||t.passengerId}</td><td>{d?.name||t.driverId}</td><td>{t.pickupLocation} → {t.dropoffLocation}</td><td><span className="badge">{t.status}</span></td><td>{money(t.fare)}</td></tr>})}</tbody></table></section><div className="grid3"><Mini title="Drivers" rows={drivers.map(d=>[d.name,d.status,money(d.balance)])}/><Mini title="Passengers" rows={passengers.map(p=>[p.name,money(p.balance),p.status])}/><Mini title="Vehicles" rows={vehicles.map(v=>[v.plateNumber||v.id,v.vehicleType,v.status])}/></div></Shell>
}
function DriverLogin(){return <div className="login"><Logo/><div className="login-card"><div className="driver-icon">👨‍✈️</div><h1>Driver Login</h1><p>Welcome back! Please login to continue.</p><label>Username</label><input placeholder="Enter your username"/><label>Password</label><input type="password" placeholder="Enter your password"/><a>Forgot Password?</a><button onClick={()=>location.href='/driver'}>Login</button><p>Need help? <b>Contact support</b></p></div><footer>© 2024 LetsDrive. Version 1.0.0</footer></div>}
function DriverDashboard(){
 const {rows:drivers}=useCollection('drivers'); const {rows:vehicles}=useCollection('vehicles'); const {rows:trips}=useCollection('trips'); const {rows:balances}=useCollection('driverBalances'); const {rows:messages}=useCollection('messages');
 const driver=drivers[0]||{id:'DRV001',name:'Driver'}; const vehicle=vehicles.find(v=>v.driverId===driver.id)||vehicles[0]||{}; const balance=balances.find(b=>b.driverId===driver.id)||{}; const myTrips=trips.filter(t=>t.driverId===driver.id); const current=myTrips.find(t=>!['scheduled','completed','cancelled'].includes(t.status))||myTrips[0]||{};
 const passengerMsgs=messages.filter(m=>m.receiverId===driver.id || m.senderId===driver.id);
 async function setStatus(status){ if(current.id) await updateDoc(doc(db,'trips',current.id),{status,updatedAt:serverTimestamp(), ...(status==='arrived'?{arrivedAt:serverTimestamp()}:{}), ...(status==='trip_started'?{startedAt:serverTimestamp()}:{}), ...(status==='completed'?{completedAt:serverTimestamp()}:{} )}); }
 return <Shell role="driver"><h1>Good Morning, {driver.name||'Driver'} 👋</h1><p className="muted">Have a safe and productive day.</p><section className="card vehicle"><div className="busimg">🚌</div><div><h2>{vehicle.vehicleType||'Vehicle'}</h2><b>{vehicle.id||vehicle.plateNumber}</b></div><Stat title="Shift Started" value="06:25 AM" icon="🕘"/><Stat title="Current KM" value="125,576" icon="🧾"/></section><div className="grid4"><Stat title="Trips" value={myTrips.length} icon="📅"/><Stat title="Passengers" value="-" icon="👥"/><Stat title="Distance" value="-" icon="📍"/><Stat title="Balance" value={money(balance.currentBalance)} icon="💳"/></div><div className="grid2"><section className="card"><h2>Current Trip</h2><p><MapPin/> {current.pickupLocation||'-'} → {current.dropoffLocation||'-'}</p><p><Clock/> {fmtTime(current.pickupTime)}</p><button onClick={()=>setStatus('driver_on_the_way')}>Start Trip</button> <button onClick={()=>setStatus('arrived')}>Arrived</button> <button className="danger" onClick={()=>setStatus('completed')}>End Trip</button><button>Open in Waze</button></section><section className="card"><h2>Message Passenger</h2><div className="chat">{passengerMsgs.slice(-4).map(m=><p className={'bubble '+(m.senderId===driver.id?'':'right')} key={m.id}>{m.message}</p>)}</div><div className="send"><input placeholder="Type message..."/><button><Send size={18}/></button></div><small>You can only message passengers assigned to active trips.</small></section></div><section className="card balance"><h2>My Balance</h2><h1>{money(balance.currentBalance)}</h1><div className="grid4"><Stat title="Today Earned" value={money(driver.dailySalary)} icon="💵"/><Stat title="Total Earnings" value={money(balance.totalEarnings)} icon="📆"/><Stat title="Payments" value={money(balance.totalPayments)} icon="✅"/><Stat title="Advances" value={money(balance.totalAdvances)} icon="⛔"/></div></section></Shell>}
function PassengerTrip(){
 const token=location.pathname.split('/').pop(); const {rows:passengers}=useCollection('passengers'); const {rows:trips}=useCollection('trips'); const {rows:drivers}=useCollection('drivers'); const {rows:vehicles}=useCollection('vehicles');
 const passenger=passengers.find(p=>p.privateLink===token)||passengers[0]||{}; const trip=trips.find(t=>t.passengerId===passenger.id)||trips[0]||{}; const driver=drivers.find(d=>d.id===trip.driverId)||{}; const vehicle=vehicles.find(v=>v.id===trip.vehicleId)||{};
 return <div className="passenger"><Logo/><div className="top"><h1>Good Morning, {passenger.name||'Passenger'} 👋</h1><span className="status">● {trip.status||'Trip Status'}</span></div><section className="card route"><div><b>Pickup</b><h2>{trip.pickupLocation||'-'}</h2><small>{fmtTime(trip.pickupTime)}</small></div><div className="carcircle">🚘</div><div><b>Drop-off</b><h2>{trip.dropoffLocation||'-'}</h2><small>Est. arrival</small></div></section><section className="card driver"><div className="avatar big">{(driver.name||'D').slice(0,2)}</div><div><h2>{driver.name||'Driver'} ⭐ 4.9</h2><button>Message Driver</button></div><div className="busimg">🚌</div><div><h2>{vehicle.vehicleType||'Vehicle'}</h2><b>{vehicle.id||trip.vehicleId}</b><p>Plate {vehicle.plateNumber}</p></div></section><section className="map"><div className="pin start">Your Location<br/>{trip.pickupLocation}</div><div className="road"></div><div className="bus">🚌</div><div className="pin end">Drop-off<br/>{trip.dropoffLocation}</div></section><div className="grid4"><Stat title="Estimated Arrival" value="Live" icon="🕘"/><Stat title="Distance Remaining" value="-" icon="📍"/><Stat title="Driver Speed" value="-" icon="⚙️"/><Stat title="Fare" value={money(trip.fare)} icon="〰️"/></div><section className="card"><h2>Send a Message</h2><PassengerMessageForm trip={trip} passenger={passenger} driver={driver}/></section><div className="grid2"><section className="card"><h2>Your Balance</h2><h1>{money(passenger.balance)}</h1></section><section className="card"><h2>Make a Payment</h2><p>Send payment notification</p></section></div><p className="secure"><ShieldCheck/> Only you can access this page. Please do not share this link.</p></div>}
function PassengerMessageForm({trip,passenger,driver}){ const [text,setText]=useState(''); async function send(){ if(!text.trim())return; await addDoc(collection(db,'messages'),{tripId:trip.id,senderType:'passenger',senderId:passenger.id,receiverType:'driver',receiverId:driver.id,message:text,isRead:false,createdAt:serverTimestamp()}); setText(''); } return <><div className="send"><input value={text} onChange={e=>setText(e.target.value)} placeholder="Type your message..."/><button onClick={send}><Send size={18}/></button></div><small>Your message will be seen by the driver in the driver panel.</small></> }
function PassengerBalance(){return <div className="passenger"><Logo/><h1>My Balance</h1><section className="card balance"><h1>1,250 AED</h1><p>Last updated today 06:25 AM</p></section><section className="card"><h2>Payment Notification</h2><input placeholder="Amount paid (AED)"/><input placeholder="Reference number"/><input type="file"/><button>Submit Payment</button><p className="promo">Pay extra and receive 10% bonus credit on the amount remaining after clearing your balance.</p></section></div>}
function App(){const path=location.pathname;if(path.startsWith('/driver-login'))return <DriverLogin/>;if(path.startsWith('/driver'))return <DriverDashboard/>;if(path.startsWith('/t/')||path.startsWith('/p/'))return <PassengerTrip/>;if(path.startsWith('/b/'))return <PassengerBalance/>;return <AdminDashboard/>}
createRoot(document.getElementById('root')).render(<App/>);
