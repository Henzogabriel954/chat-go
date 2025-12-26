import { useState, useRef, useEffect } from 'react'

// --- ICONS & UI (Estilo Tech) ---

const WalletIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
)

const PlusIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-12H4"></path></svg>
)

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 3 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
)

const ExitIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
)

const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
)

const EyeOffIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 1.274-4.057 5.064-7 9.542-7 .965 0 1.902.133 2.805.385M19.531 6.077l-1.928 2.37M21 12c-1.274 4.057-5.064 7-9.542 7-1.764 0-3.488-.344-5.124-.982m6.255-6.255a3.001 3.001 0 00-4.773-2.954"></path></svg>
)

// --- AVATAR COMPONENT ---
const Avatar = ({ name }) => {
  const initials = name ? name.substring(0, 2).toUpperCase() : "?";
  return (
    <div className="w-10 h-10 min-w-[2.5rem] bg-gradient-to-br from-green-500 to-emerald-700 rounded-lg flex items-center justify-center text-white font-bold shadow-lg border border-green-400/30">
      {initials}
    </div>
  )
}

const MAX_CHARS = 500; // Limite de caracteres
const MAX_USERNAME_CHARS = 12; // Limite de caracteres para o username

// Helper: garante limite de caracteres e notifica truncamento quando aplicável
const enforceMaxName = (name) => {
  const trimmed = name ? name.trim() : '';
  if (trimmed.length > MAX_USERNAME_CHARS) {
    alert(`O nome foi reduzido para ${MAX_USERNAME_CHARS} caracteres.`);
  }
  return trimmed.slice(0, MAX_USERNAME_CHARS);
};

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
  const [showCredentials, setShowCredentials] = useState(false); // Estado para mostrar/esconder credenciais
  const [showServerInfo, setShowServerInfo] = useState(false); // Olhinho: modal/painel com endereço/chave/QR da sala

  // WebSocket & Chat
  const [ws, setWs] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  
  // Inputs
  const [inputMsg, setInputMsg] = useState('');
  const [username, setUsername] = useState(() => (localStorage.getItem('chat_username') || 'Anonimo').slice(0, MAX_USERNAME_CHARS));
  const [formData, setFormData] = useState({ name: '', address: '', key: '' });
  const [lastMessageTime, setLastMessageTime] = useState(null); // New state for message cooldown

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

  // --- GESTÃO DE MENSAGENS (LOCALSTORAGE) ---
  
  // Carrega histórico ao entrar na sala
  useEffect(() => {
    if (activeServer) {
        const storageKey = `chat_history_${activeServer.address}`;
        const savedMsgs = localStorage.getItem(storageKey);
        if (savedMsgs) {
            try {
                const parsed = JSON.parse(savedMsgs);
                // Filtra mensagens das últimas 24h
                const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
                const recentMsgs = parsed.filter(m => m.timestamp > oneDayAgo);
                
                // Se houve limpeza (mensagens velhas removidas), atualiza o storage
                if (recentMsgs.length !== parsed.length) {
                    localStorage.setItem(storageKey, JSON.stringify(recentMsgs));
                }
                setMessages(recentMsgs);
            } catch (e) {
                console.error("Erro ao carregar histórico", e);
                setMessages([]);
            }
        } else {
            setMessages([]);
        }
    }
  }, [activeServer]);

  const saveMessageLocally = (serverAddress, msgObj) => {
      const storageKey = `chat_history_${serverAddress}`;
      const saved = localStorage.getItem(storageKey);
      let msgs = saved ? JSON.parse(saved) : [];
      
      msgs.push(msgObj);
      
      // Limpeza preventiva (manter apenas últimas 24h para não estourar storage)
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      msgs = msgs.filter(m => m.timestamp > oneDayAgo);
      
      localStorage.setItem(storageKey, JSON.stringify(msgs));
  };

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
      // Não limpa messages aqui pois agora carregamos do localStorage
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
        saveMessageLocally(server.address, msg); // Salva msg recebida
      } catch (e) {
        // Mensagens de sistema não salvamos necessariamente
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

    const now = Date.now();
    const COOLDOWN_TIME = 2000; // 2 seconds

    if (lastMessageTime && (now - lastMessageTime < COOLDOWN_TIME)) {
      alert("Aguarde um pouco para enviar outra mensagem.");
      return;
    }

    const payload = {
      type: 'chat',
      text: inputMsg,
      sender: username,
      timestamp: now
    };

    // Envia pro socket
    ws.send(JSON.stringify(payload));
    
    // O backend atual faz broadcast para todos na URL, incluindo o sender.
    // Portanto, não salvamos aqui para evitar duplicata. O onmessage cuidará disso.

    setInputMsg('');
    setLastMessageTime(now); // Update last message time
  };

  // --- API: Criar Nova Carteira (Sala) ---
  const createServer = async () => {
    if (!formData.name.trim()) return alert("Dê um nome para a sala.");
    try {
      const baseUrl = getBackendUrl('http');
      const res = await fetch(`${baseUrl}/api/contract/create`, { method: 'POST' });
      const data = await res.json();
      
      const safeName = enforceMaxName(formData.name);
      const newServer = {
        id: Date.now(),
        name: safeName,
        address: data.address,
        key: data.access_key,
        icon: safeName[0].toUpperCase()
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
    
    const safeName = enforceMaxName(formData.name || "Sala Importada");
    const newServer = {
      id: Date.now(),
      name: safeName,
      address: formData.address,
      key: formData.key,
      icon: safeName[0].toUpperCase()
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

  const handleLeaveServer = () => {
    if (activeServer) {
      // Filter out the active server from the servers list
      setServers(prevServers => prevServers.filter(server => server.id !== activeServer.id));
    }
    // Fechar o painel de info caso esteja aberto
    setShowServerInfo(false);
    setShowCredentials(false);
    // Set active server to null to go back to home screen
    setActiveServer(null);
  };

  // --- RENDER ---
  const isSendButtonDisabled = !inputMsg.trim() || !isConnected;
  return (
    <div className="flex w-screen h-screen bg-[#050505] text-gray-200 font-sans overflow-hidden">
      
      {/* 1. SIDEBAR (Navegação) */}
      <div className="w-20 bg-[#0a0a0a] border-r border-gray-900 flex flex-col items-center py-4 space-y-4 shadow-xl z-20">
        
        {/* Botão Home */}
        <div 
                                onClick={handleLeaveServer}           className={`w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300 ${!activeServer ? 'bg-green-600 text-white shadow-[0_0_15px_rgba(22,163,74,0.5)]' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
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
               onContextMenu={(e) => { e.preventDefault(); setNewCreatedRoom(server); setModalMode('success_created'); setShowCredentials(false); }}
               title="Clique com o botão direito para ver informações"
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
            <p className="text-gray-500 max-w-md text-sm">Comunicação descentralizada, Criptografia, Sem rastros.</p>
            
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
                  <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] transition-colors duration-500 ${isConnected ? 'bg-green-500 text-green-500' : 'bg-red-500 text-red-500'}`}></div>
                  <h2 className="font-bold text-lg text-white tracking-wide">{activeServer.name}</h2>
                  <span className="text-xs font-mono text-gray-600 bg-gray-900 px-2 py-0.5 rounded border border-gray-800 hidden md:inline-block">{activeServer.address.substring(0,8)}...</span>
               </div>
               
               <div className="flex items-center gap-3 text-sm">
                  <span className="text-gray-500 hidden sm:inline">Identidade:</span>
                  <span className="text-green-400 font-bold cursor-pointer hover:underline" onClick={() => {
                     let newName = prompt("Novo Nome:", username);
                     if (newName !== null) {
                        newName = newName.trim();
                        if (newName.length === 0) {
                           alert("O nome de usuário não pode ser vazio.");
                        } else {
                           newName = enforceMaxName(newName);
                           setUsername(newName);
                        }
                     }
                  }}>{username}</span>
                  <button 
                     onClick={handleLeaveServer}
                     className="ml-4 px-3 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs font-bold rounded-md flex items-center gap-1 transition"
                  >
                     <ExitIcon />
                     Sair
                  </button>
               </div>
            </header>

            {/* Lista de Mensagens */}
            <main className="flex-1 overflow-y-auto p-6 space-y-6">
               {messages.length === 0 && (
                 <div className="text-center mt-20 opacity-30 select-none">
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
                       {/* BUBBLE: Adicionado break-words e whitespace-pre-wrap */}
                       <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm break-words whitespace-pre-wrap ${
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
                 <textarea
                   value={inputMsg}
                   onChange={e => setInputMsg(e.target.value.slice(0, MAX_CHARS))}
                   placeholder={isConnected ? "Digite sua mensagem..." : "Aguardando conexão..."}
                   className="w-full resize-none bg-black/20 border border-gray-800 rounded-lg p-3 pr-28 text-sm text-gray-200 focus:outline-none focus:border-green-500"
                   rows={2}
                 />
                 <div className="absolute right-3 bottom-3 flex items-center gap-3">
                   <span className="text-xs text-gray-500">{inputMsg.length}/{MAX_CHARS}</span>
                   <button type="submit" disabled={isSendButtonDisabled} className={`p-2 rounded-md transition ${isSendButtonDisabled ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white'}`}>
                     <svg className="w-6 h-6 rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                   </button>
                 </div>
               </form>
            </div>
          </>
        )}
      </div>

      {/* --- MODAIS DE AÇÃO --- */}
      
      {/* 1. Modal Criar (Nome) */}
      {modalMode === 'create' && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
            <div className="bg-[#111] border border-gray-800 p-4 sm:p-6 rounded-2xl w-full max-w-sm mx-4 sm:mx-0 shadow-2xl max-h-[85vh] overflow-auto">
               <h2 className="text-xl font-bold text-white mb-4">Criar Nova Sala</h2>
               <input 
                  className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-green-500 outline-none mb-6"
                  placeholder="Nome da Sala (ex: Projeto X)"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  maxLength={MAX_USERNAME_CHARS}
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
         <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center z-50 animate-in fade-in zoom-in duration-300">
            <div className="bg-[#111] border border-green-500/30 p-6 sm:p-8 rounded-2xl w-full max-w-lg mx-4 sm:mx-0 shadow-[0_0_50px_rgba(22,163,74,0.1)] relative max-h-[90vh] overflow-auto">
               
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
                     <div className="w-28 h-28 sm:w-32 sm:h-32 bg-black grid grid-cols-4 gap-1 p-1 relative">
                        {[...Array(16)].map((_,i) => (
                           <div key={i} className={`rounded-sm ${Math.random() > 0.5 ? 'bg-white' : 'bg-black'}`}></div>
                        ))}
                        {/* Olhos do QR Code */}
                        <div className="absolute w-7 h-7 sm:w-8 sm:h-8 border-2 border-white bg-black top-4 left-4"></div>
                        <div className="absolute w-7 h-7 sm:w-8 sm:h-8 border-2 border-white bg-black top-4 right-4"></div>
                        <div className="absolute w-7 h-7 sm:w-8 sm:h-8 border-2 border-white bg-black bottom-4 left-4"></div>
                     </div>
                  </div>
               </div>

               {/* Dados de Acesso Separados */}
               <div className="space-y-4">
                  <div className="bg-[#050505] p-3 rounded-lg border border-gray-800">
                     <label className="text-[10px] uppercase text-gray-500 font-bold tracking-wider mb-1 block">Endereço da Sala (Address)</label>
                     <div className="flex justify-between items-center">
                        <code className="text-green-400 font-mono text-sm truncate mr-2">
                           {showCredentials ? newCreatedRoom.address : "****************************************"}
                        </code>
                        <div className="flex items-center gap-2">
                           <button onClick={() => setShowCredentials(!showCredentials)} className="text-gray-400 hover:text-white">
                              {showCredentials ? <EyeOffIcon /> : <EyeIcon />}
                           </button>
                           <button onClick={() => copyToClipboard(newCreatedRoom.address)} className="text-gray-400 hover:text-white"><CopyIcon/></button>
                        </div>
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

      {/* Painel de informações da sala (olhinho) */}
      {showServerInfo && activeServer && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
            <div className="bg-[#111] border border-gray-800 p-4 sm:p-6 rounded-2xl w-full max-w-sm sm:max-w-md mx-4 sm:mx-0 shadow-2xl relative max-h-[85vh] overflow-auto">
               <button onClick={() => setShowServerInfo(false)} className="absolute top-3 right-3 text-gray-400 hover:text-white">✕</button>
               <h3 className="text-lg font-bold text-white mb-3">Informações da Sala</h3>

               <div className="flex justify-center mb-4">
                  <div className="w-20 h-20 sm:w-28 sm:h-28 bg-white p-2 rounded-xl shadow-lg cursor-pointer">
                     <div className="w-full h-full bg-black grid grid-cols-4 gap-1 p-1">
                        {[...Array(16)].map((_,i) => (
                           <div key={i} className={`rounded-sm ${Math.random() > 0.5 ? 'bg-white' : 'bg-black'}`}></div>
                        ))}
                     </div>
                  </div>
               </div>

               <div className="space-y-3">
                  <div className="bg-[#050505] p-3 rounded-lg border border-gray-800">
                     <label className="text-[10px] uppercase text-gray-500 font-bold tracking-wider mb-1 block">Endereço da Sala</label>
                     <div className="flex justify-between items-center">
                        <code className="text-green-400 font-mono text-sm truncate mr-2">{showCredentials ? activeServer.address : "****************************************"}</code>
                        <div className="flex items-center gap-2">
                           <button onClick={() => setShowCredentials(!showCredentials)} className="text-gray-400 hover:text-white">{showCredentials ? <EyeOffIcon /> : <EyeIcon />}</button>
                           <button onClick={() => copyToClipboard(activeServer.address)} className="text-gray-400 hover:text-white"><CopyIcon/></button>
                        </div>
                     </div>
                  </div>

                  <div className="bg-[#050505] p-3 rounded-lg border border-gray-800">
                     <label className="text-[10px] uppercase text-gray-500 font-bold tracking-wider mb-1 block">Chave Privada (Access Key)</label>
                     <div className="flex justify-between items-center">
                        <code className="text-yellow-400 font-mono text-sm truncate mr-2">{activeServer.key}</code>
                        <button onClick={() => copyToClipboard(activeServer.key)} className="text-gray-400 hover:text-white"><CopyIcon/></button>
                     </div>
                  </div>
               </div>

               <div className="mt-6 flex justify-end gap-2">
                  <button onClick={() => setShowServerInfo(false)} className="px-4 py-2 bg-gray-800 text-white rounded-md">Fechar</button>
               </div>
            </div>
         </div>
      )}

      {/* 3. Modal ENTRAR (Join) */}
      {modalMode === 'join' && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
            <div className="bg-[#111] border border-gray-800 p-4 sm:p-6 rounded-2xl w-full max-w-sm mx-4 sm:mx-0 shadow-2xl max-h-[85vh] overflow-auto">
               <h2 className="text-xl font-bold text-white mb-4">Acessar Sala Privada</h2>
               <div className="space-y-4">
                  <input className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-green-500 outline-none" placeholder="Apelido da Sala (ex: Trabalho)" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} maxLength={MAX_USERNAME_CHARS} />
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