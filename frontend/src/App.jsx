import { useState, useRef, useEffect } from 'react'

// --- ICONS & UI (Estilo Tech) ---

const WalletIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
)

const PlusIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-12H4"></path></svg>
)

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
)

// --- AVATAR COMPONENT ---
const Avatar = ({ name }) => {
  const initials = name ? name.substring(0, 2).toUpperCase() : "?";
  return (
    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-700 rounded-lg flex items-center justify-center text-white font-bold shadow-lg border border-green-400/30">
      {initials}
    </div>
  )
}

function App() {
  // --- ESTADOS ---
  const [servers, setServers] = useState(() => {
    const saved = localStorage.getItem('chat_servers_v2');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeServer, setActiveServer] = useState(null);
  
  // Modais
  const [modalMode, setModalMode] = useState(null); // 'create', 'join', 'success_created'
  const [newCreatedRoom, setNewCreatedRoom] = useState(null); // Dados da sala recém criada para exibir

  // WebSocket & Chat
  const [ws, setWs] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  
  // Inputs
  const [inputMsg, setInputMsg] = useState('');
  const [username, setUsername] = useState(() => localStorage.getItem('chat_username') || 'Anonimo');
  const [formData, setFormData] = useState({ name: '', address: '', key: '' });

  const messagesEndRef = useRef(null);

  // --- PERSISTÊNCIA & SCROLL ---
  useEffect(() => {
    localStorage.setItem('chat_servers_v2', JSON.stringify(servers));
  }, [servers]);

  useEffect(() => {
    localStorage.setItem('chat_username', username);
  }, [username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- GESTÃO DE CONEXÃO ---
  
  // Função Helper para descobrir a URL do Backend (Prioridade: .env > Codespaces > Localhost)
  const getBackendUrl = (protocol) => {
    // 1. Prioridade: Variáveis de Ambiente (.env)
    if (protocol === 'ws' && import.meta.env.VITE_WS_URL) {
      return import.meta.env.VITE_WS_URL;
    }
    if (protocol === 'http' && import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }

    // 2. Fallback: Detecção Automática
    const host = window.location.hostname;
    // Se estiver rodando no Codespaces (ex: app-name-5173.app.github.dev)
    if (host.includes('-5173')) {
       const backendHost = host.replace('-5173', '-3000');
       return `${protocol === 'ws' ? 'wss' : 'https'}://${backendHost}`; // Codespaces usa SSL (wss/https)
    }
    // Ambiente Local (localhost ou IP)
    return `${protocol}://${host}:3000`;
  }

  useEffect(() => {
    if (ws) {
      ws.close();
      setWs(null);
      setIsConnected(false);
      setMessages([]);
    }
    if (activeServer) {
      connectToServer(activeServer);
    }
  }, [activeServer]);

  const connectToServer = (server) => {
    // Detecta URL dinamicamente
    const baseUrl = getBackendUrl('ws');
    const url = `${baseUrl}/ws/${server.address}?key=${server.key}`;
    console.log("Conectando WebSocket em:", url);
    
    const socket = new WebSocket(url);

    socket.onopen = () => setIsConnected(true);
    
    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        setMessages(prev => [...prev, msg]);
      } catch (e) {
        setMessages(prev => [...prev, { type: 'chat', text: event.data, sender: 'System' }]);
      }
    };

    socket.onclose = (e) => {
      console.log("Socket fechado", e);
      setIsConnected(false);
    }
    setWs(socket);
  }

  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputMsg.trim() || !ws) return;

    const payload = {
      type: 'chat',
      text: inputMsg,
      sender: username,
      timestamp: Date.now()
    };

    ws.send(JSON.stringify(payload));
    setInputMsg('');
  };

  // --- API: Criar Nova Carteira (Sala) ---
  const createServer = async () => {
    if (!formData.name.trim()) return alert("Dê um nome para a sala.");
    try {
      const baseUrl = getBackendUrl('http');
      const res = await fetch(`${baseUrl}/api/contract/create`, { method: 'POST' });
      const data = await res.json();
      
      const newServer = {
        id: Date.now(),
        name: formData.name,
        address: data.address,
        key: data.access_key,
        icon: formData.name[0].toUpperCase()
      };

      setServers([...servers, newServer]);
      setNewCreatedRoom(newServer); // Salva para mostrar no modal de sucesso
      setModalMode('success_created'); // Muda para tela de "Sucesso"
      setFormData({ name: '', address: '', key: '' });
    } catch (e) {
      console.error(e);
      alert("Erro ao conectar no backend. Verifique o console.");
    }
  };

  const joinServer = () => {
    if (!formData.address || !formData.key) return alert("Dados incompletos.");
    
    const newServer = {
      id: Date.now(),
      name: formData.name || "Sala Importada",
      address: formData.address,
      key: formData.key,
      icon: (formData.name || "S")[0].toUpperCase()
    };

    setServers([...servers, newServer]);
    setActiveServer(newServer);
    setModalMode(null);
    setFormData({ name: '', address: '', key: '' });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Copiado!");
  };

  // --- RENDER ---
  return (
    <div className="flex w-screen h-screen bg-[#050505] text-gray-200 font-sans overflow-hidden">
      
      {/* 1. SIDEBAR (Navegação) */}
      <div className="w-20 bg-[#0a0a0a] border-r border-gray-900 flex flex-col items-center py-4 space-y-4 shadow-xl z-20">
        
        {/* Botão Home */}
        <div 
           onClick={() => setActiveServer(null)}
           className={`w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300 ${!activeServer ? 'bg-green-600 text-white shadow-[0_0_15px_rgba(22,163,74,0.5)]' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
        >
          <WalletIcon />
        </div>

        <div className="w-10 h-[1px] bg-gray-800"></div>

        {/* Lista de Salas */}
        <div className="flex-1 w-full flex flex-col items-center space-y-3 overflow-y-auto hide-scrollbar">
          {servers.map(server => (
             <div 
               key={server.id} 
               onClick={() => setActiveServer(server)}
               className={`w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300 font-bold border ${activeServer?.id === server.id ? 'border-green-500 bg-green-500/10 text-green-400 shadow-[0_0_10px_rgba(22,163,74,0.3)]' : 'border-gray-800 bg-gray-900 text-gray-500 hover:border-gray-600 hover:text-white'}`}
             >
               {server.icon}
             </div>
          ))}
          
          {/* Botão Adicionar */}
          <div 
             onClick={() => setModalMode('create')}
             className="w-12 h-12 rounded-xl border border-dashed border-gray-700 hover:border-green-500 text-gray-600 hover:text-green-500 flex items-center justify-center cursor-pointer transition-colors"
          >
            <PlusIcon />
          </div>
        </div>
      </div>

      {/* 2. AREA PRINCIPAL */}
      <div className="flex-1 flex flex-col relative bg-gradient-to-br from-[#050505] to-[#0a0a0a]">
        
        {/* Se nenhuma sala selecionada */}
        {!activeServer && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-24 h-24 bg-green-500/5 rounded-full flex items-center justify-center mb-6 animate-pulse border border-green-500/20">
               <WalletIcon />
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tighter mb-2">CRYPTO<span className="text-green-500">CHAT</span></h1>
            <p className="text-gray-500 max-w-md text-sm">Comunicação descentralizada. Criptografia simulada. Sem rastros.</p>
            
            <div className="mt-8 flex gap-4">
               <button onClick={() => setModalMode('create')} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-lg hover:shadow-green-500/20 transition">Criar Sala</button>
               <button onClick={() => setModalMode('join')} className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-lg border border-gray-700 transition">Entrar</button>
            </div>
          </div>
        )}

        {/* Sala Ativa */}
        {activeServer && (
          <>
            {/* Header da Sala */}
            <header className="h-16 border-b border-gray-800/50 bg-[#0a0a0a]/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-10">
               <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_#22c55e]"></div>
                  <h2 className="font-bold text-lg text-white tracking-wide">{activeServer.name}</h2>
                  <span className="text-xs font-mono text-gray-600 bg-gray-900 px-2 py-0.5 rounded border border-gray-800">{activeServer.address.substring(0,8)}...</span>
               </div>
               
               <div className="flex items-center gap-3 text-sm">
                  <span className="text-gray-500">Identidade:</span>
                  <span className="text-green-400 font-bold cursor-pointer hover:underline" onClick={() => setUsername(prompt("Novo Nome:", username) || username)}>{username}</span>
               </div>
            </header>

            {/* Lista de Mensagens */}
            <main className="flex-1 overflow-y-auto p-6 space-y-6">
               {messages.length === 0 && (
                 <div className="text-center mt-20 opacity-30">
                    <p className="text-4xl font-mono mb-2">0x00</p>
                    <p className="text-sm">Início do bloco de mensagens.</p>
                 </div>
               )}
               
               {messages.map((msg, idx) => (
                 <div key={idx} className={`flex gap-4 group animate-fade-in ${msg.sender === username ? 'flex-row-reverse' : ''}`}>
                    <Avatar name={msg.sender} />
                    <div className={`flex flex-col max-w-[70%] ${msg.sender === username ? 'items-end' : 'items-start'}`}>
                       <div className="flex items-baseline gap-2 mb-1">
                          <span className={`font-bold text-sm ${msg.sender === username ? 'text-green-400' : 'text-gray-300'}`}>{msg.sender}</span>
                          <span className="text-[10px] text-gray-600">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                       </div>
                       <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                          msg.sender === username 
                          ? 'bg-green-600/10 border border-green-500/20 text-green-100 rounded-tr-sm' 
                          : 'bg-gray-800/50 border border-gray-700/50 text-gray-200 rounded-tl-sm'
                       }`}>
                          {msg.text}
                       </div>
                    </div>
                 </div>
               ))}
               <div ref={messagesEndRef} />
            </main>

            {/* Input */}
            <div className="p-6 pt-2 bg-gradient-to-t from-[#050505] to-transparent">
               <form onSubmit={sendMessage} className="relative">
                  <input 
                    className="w-full bg-[#0a0a0a] border border-gray-800 rounded-xl pl-5 pr-12 py-4 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition shadow-lg"
                    placeholder={`Mensagem criptografada para #${activeServer.name}...`}
                    value={inputMsg}
                    onChange={e => setInputMsg(e.target.value)}
                  />
                  <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-green-400 transition">
                     <svg className="w-6 h-6 rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                  </button>
               </form>
            </div>
          </>
        )}
      </div>

      {/* --- MODAIS DE AÇÃO --- */}
      
      {/* 1. Modal Criar (Nome) */}
      {modalMode === 'create' && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#111] border border-gray-800 p-6 rounded-2xl w-96 shadow-2xl">
               <h2 className="text-xl font-bold text-white mb-4">Criar Nova Sala</h2>
               <input 
                  className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-green-500 outline-none mb-6"
                  placeholder="Nome da Sala (ex: Projeto X)"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  autoFocus
               />
               <div className="flex justify-end gap-3">
                  <button onClick={() => setModalMode(null)} className="text-gray-400 hover:text-white text-sm">Cancelar</button>
                  <button onClick={createServer} className="bg-green-600 hover:bg-green-500 px-6 py-2 rounded-lg font-bold text-white transition">Gerar Chaves</button>
               </div>
            </div>
         </div>
      )}

      {/* 2. Modal SUCESSO (DADOS DA SALA) - O que você pediu */}
      {modalMode === 'success_created' && newCreatedRoom && (
         <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in zoom-in duration-300">
            <div className="bg-[#111] border border-green-500/30 p-8 rounded-2xl w-[500px] shadow-[0_0_50px_rgba(22,163,74,0.1)] relative">
               
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent"></div>
               
               <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 text-green-400 mb-4 border border-green-500/20">
                     <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                  <h2 className="text-2xl font-bold text-white">Sala Criada com Sucesso!</h2>
                  <p className="text-gray-400 text-sm mt-1">Salve estas credenciais. Elas são a única chave de entrada.</p>
               </div>

               {/* QR CODE SIMULADO */}
               <div className="flex justify-center mb-8">
                  <div className="bg-white p-3 rounded-xl shadow-lg transform hover:scale-105 transition-transform cursor-pointer" title="QR Code de Login">
                     {/* Simulação visual de QR Code usando Grid */}
                     <div className="w-32 h-32 bg-black grid grid-cols-4 gap-1 p-1">
                        {[...Array(16)].map((_,i) => (
                           <div key={i} className={`rounded-sm ${Math.random() > 0.5 ? 'bg-white' : 'bg-black'}`}></div>
                        ))}
                        {/* Olhos do QR Code */}
                        <div className="absolute w-8 h-8 border-2 border-white bg-black top-5 left-5"></div>
                        <div className="absolute w-8 h-8 border-2 border-white bg-black top-5 right-5"></div>
                        <div className="absolute w-8 h-8 border-2 border-white bg-black bottom-5 left-5"></div>
                     </div>
                  </div>
               </div>

               {/* Dados de Acesso Separados */}
               <div className="space-y-4">
                  <div className="bg-[#050505] p-3 rounded-lg border border-gray-800">
                     <label className="text-[10px] uppercase text-gray-500 font-bold tracking-wider mb-1 block">Endereço da Sala (Address)</label>
                     <div className="flex justify-between items-center">
                        <code className="text-green-400 font-mono text-sm truncate mr-2">{newCreatedRoom.address}</code>
                        <button onClick={() => copyToClipboard(newCreatedRoom.address)} className="text-gray-400 hover:text-white"><CopyIcon/></button>
                     </div>
                  </div>

                  <div className="bg-[#050505] p-3 rounded-lg border border-gray-800">
                     <label className="text-[10px] uppercase text-gray-500 font-bold tracking-wider mb-1 block">Chave Privada (Access Key)</label>
                     <div className="flex justify-between items-center">
                        <code className="text-yellow-400 font-mono text-sm truncate mr-2">{newCreatedRoom.key}</code>
                        <button onClick={() => copyToClipboard(newCreatedRoom.key)} className="text-gray-400 hover:text-white"><CopyIcon/></button>
                     </div>
                  </div>
               </div>

               <button 
                  onClick={() => { setActiveServer(newCreatedRoom); setModalMode(null); }}
                  className="w-full mt-8 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg shadow-lg transition"
               >
                  Entrar na Sala Agora
               </button>
            </div>
         </div>
      )}

      {/* 3. Modal ENTRAR (Join) */}
      {modalMode === 'join' && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#111] border border-gray-800 p-6 rounded-2xl w-96 shadow-2xl">
               <h2 className="text-xl font-bold text-white mb-4">Acessar Sala Privada</h2>
               <div className="space-y-4">
                  <input className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-green-500 outline-none" placeholder="Apelido da Sala (ex: Trabalho)" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  <input className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-green-500 outline-none" placeholder="Endereço (0x...)" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                  <input className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-green-500 outline-none" placeholder="Chave de Acesso" value={formData.key} onChange={e => setFormData({...formData, key: e.target.value})} />
               </div>
               <div className="flex justify-end gap-3 mt-6">
                  <button onClick={() => setModalMode(null)} className="text-gray-400 hover:text-white text-sm">Cancelar</button>
                  <button onClick={joinServer} className="bg-green-600 hover:bg-green-500 px-6 py-2 rounded-lg font-bold text-white transition">Conectar</button>
               </div>
            </div>
         </div>
      )}

    </div>
  )
}

export default App