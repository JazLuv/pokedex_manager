'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
// Asegúrate de que el nombre del archivo coincida (gen1Types.js o gen1.js)
import { getTypeColor } from '@/lib/pokeApi'; 

export default function Home() {
  const [pokemons, setPokemons] = useState([]);
  const [filteredPokemons, setFilteredPokemons] = useState([]); // Array para lo que se ve en pantalla
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // --- ESTADOS DE FILTRO ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCaught, setFilterCaught] = useState(false);
  const [selectedType, setSelectedType] = useState(null);

  // Variable derivada segura: Busca siempre en la lista maestra para evitar errores si filtras
  const selectedPokemon = pokemons.find(p => p.id === selectedId);

  // --- 1. FUNCIÓN: CAPTURAR ---
  const handleCapture = async (pokemonId) => {
    if (!isAuthenticated) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/pokemon', 
        { pokemonId }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Actualizamos ambas listas para que el cambio se vea al instante
      const updateList = (list) => list.map(p => p.id === pokemonId ? { ...p, captured: true } : p);
      setPokemons(prev => updateList(prev));
      // (El useEffect de filtro se encargará de actualizar filteredPokemons automáticamente)
    } catch (error) {
      alert("ERROR_CAPTURA: " + (error.response?.data?.error || "Offline"));
    }
  };

  // --- 2. FUNCIÓN: LIBERAR ---
  const handleRelease = async (pokemonId) => {
    if (!isAuthenticated) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete('/api/pokemon', {
        headers: { Authorization: `Bearer ${token}` },
        data: { pokemonId }
      });
      const updateList = (list) => list.map(p => p.id === pokemonId ? { ...p, captured: false, is_team: false } : p);
      setPokemons(prev => updateList(prev));
    } catch (error) {
      alert("ERROR_LIBERACIÓN: " + (error.response?.data?.error || "Offline"));
    }
  };

  // --- LÓGICA DE FILTRADO (Se ejecuta cuando cambian los inputs) ---
  useEffect(() => {
    let result = pokemons;

    // 1. Filtro por Búsqueda (Nombre o ID)
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.name.includes(lowerTerm) || p.id.toString() === lowerTerm
      );
    }

    // 2. Filtro por Capturados
    if (filterCaught) {
      result = result.filter(p => p.captured);
    }

    // 3. Filtro por Tipo
    if (selectedType) {
      result = result.filter(p => p.types && p.types.includes(selectedType));
    }

    setFilteredPokemons(result);
  }, [searchTerm, filterCaught, selectedType, pokemons]);

  // --- CARGA INICIAL ---
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      setIsAuthenticated(false);
      const placeholders = Array.from({ length: 151 }, (_, i) => ({
        id: i + 1,
        name: 'UNKNOWN_DATA',
        image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${i + 1}.png`,
        captured: false,
        types: ['normal'] // Default para invitados
      }));
      setPokemons(placeholders);
      setFilteredPokemons(placeholders); // IMPORTANTE: Inicializar filtrados
      setLoading(false);
      return;
    }

    async function loadPokedex() {
      try {
        const res = await axios.get('/api/pokemon', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPokemons(res.data);
        setFilteredPokemons(res.data); // IMPORTANTE: Inicializar filtrados
        setIsAuthenticated(true);
      } catch (error) {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          setIsAuthenticated(false);
        }
      } finally {
        setLoading(false);
      }
    }
    loadPokedex();
  }, []);

  // --- 3. FUNCIÓN: LOGOUT (CERRAR SESIÓN) ---
  const handleLogout = () => {
    // 1. Borramos la "llave" de acceso
    localStorage.removeItem('token');
    
    // 2. Reseteamos estados de autenticación y filtros
    setIsAuthenticated(false);
    setSelectedId(null);
    setFilterCaught(false);
    setSearchTerm('');
    setSelectedType(null);

    // 3. Restauramos la vista de "Invitado" (Placeholders Grises)
    const placeholders = Array.from({ length: 151 }, (_, i) => ({
      id: i + 1,
      name: 'UNKNOWN_DATA',
      image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${i + 1}.png`,
      captured: false,
      types: ['normal']
    }));
    
    setPokemons(placeholders);
    setFilteredPokemons(placeholders);
  };

  const capturedCount = pokemons.filter(p => p.captured).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center font-mono">
        <p className="text-cyan-500 text-xl animate-pulse uppercase">{'>'} Iniciando_Sistema...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-700 ${isAuthenticated ? 'bg-slate-900' : 'bg-zinc-800'}`}>
      
      {/* --- OVERLAY DE IDENTIFICACIÓN --- */}
      {!isAuthenticated && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-6xl font-black text-white mb-2 tracking-tighter">POKEDEX_SYS</h1>
            <p className="text-zinc-400 font-mono text-sm">ACCESO RESTRINGIDO // SOLO PERSONAL AUTORIZADO</p>
          </div>
          <Link 
            href="/login"
            className="group relative bg-green-500 hover:bg-green-400 text-slate-900 px-12 py-6 rounded-full font-black text-2xl shadow-[0_0_30px_rgba(34,197,94,0.6)] hover:scale-105 transition-all uppercase tracking-tighter border-4 border-white"
          >
            <span className="animate-pulse">IDENTIFÍCATE</span>
            <div className="absolute -inset-1 rounded-full border border-green-500 opacity-30 group-hover:animate-ping"></div>
          </Link>
        </div>
      )}

      {/* --- CARCASA POKEDEX --- */}
      <div className={`w-full max-w-5xl rounded-3xl border-b-8 border-r-8 p-6 relative transition-all duration-500 
        ${isAuthenticated 
          ? 'bg-red-600 border-red-900 shadow-2xl shadow-red-500/20' 
          : 'bg-zinc-700 border-zinc-900 grayscale pointer-events-none opacity-50'
        }`}
      >
        
        {/* --- CABECERA --- */}
        <div className="flex justify-between items-start mb-6">
          {/* Luces de Estado (Izquierda) */}
          <div className="flex gap-3">
            <div className={`w-12 h-12 rounded-full border-4 border-white shadow-lg transition-colors duration-500 ${isAuthenticated ? 'bg-blue-400 animate-pulse' : 'bg-zinc-600'}`}></div>
            <div className="flex gap-1 mt-2">
              <div className="w-3 h-3 bg-red-500 rounded-full border border-red-800 shadow-sm"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full border border-yellow-800 shadow-sm"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full border border-green-800 shadow-sm"></div>
            </div>
          </div>

          {/* Status + Botón Logout (Derecha) */}
          <div className="flex flex-col items-end gap-2">
            <div className="bg-black border-2 border-zinc-700 px-4 py-1 rounded shadow-inner">
               <p className="text-cyan-400 font-mono text-xs uppercase tracking-tighter">
                  STATUS: <span className="text-white text-lg">{isAuthenticated ? String(capturedCount).padStart(2, '0') : '--'}</span> / 151
               </p>
            </div>
            
            {/* 🔥 BOTÓN DE LOGOUT (Solo visible si está autenticado) 🔥 */}
            {isAuthenticated && (
              <button 
                onClick={handleLogout}
                className="text-[9px] font-bold text-red-900 bg-red-500 hover:bg-red-400 px-3 py-1 rounded-sm border border-red-900 shadow-[0_0_10px_rgba(239,68,68,0.5)] uppercase tracking-widest transition-all active:scale-95"
              >
                Log Out
              </button>
            )}
          </div>
        </div>

        {/* --- 🔥 NUEVA BARRA DE BÚSQUEDA Y FILTROS 🔥 --- */}
        <div className="mb-4 space-y-3">
          {/* Input Buscador */}
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search by name or #..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 text-white font-mono p-3 pl-10 rounded-lg border-2 border-slate-800 focus:border-cyan-400 outline-none uppercase placeholder:normal-case"
            />
            <span className="absolute left-3 top-3 text-slate-500">🔍</span>
          </div>

          {/* Botones de Filtro */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Toggle Caught */}
            <button 
              onClick={() => setFilterCaught(!filterCaught)}
              className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border-2 transition-all
                ${filterCaught ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}
              `}
            >
              {filterCaught ? 'SHOW ALL' : 'CAUGHT ONLY'}
            </button>

            {/* Badges de Tipos (Seleccionamos algunos principales para la UI) */}
            {['normal','fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon'].map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(selectedType === type ? null : type)}
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all
                  ${selectedType === type ? 'scale-110 border-white shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}
                  ${getTypeColor(type)}
                `}
                title={type.toUpperCase()}
              >
                <span className="text-[8px] font-bold text-white uppercase">{type.substring(0,3)}</span>
              </button>
            ))}
            
            {/* Botón Reset Tipos */}
            {selectedType && (
              <button onClick={() => setSelectedType(null)} className="text-[10px] text-red-200 hover:text-white underline ml-2">
                Clear Type
              </button>
            )}
          </div>
        </div>

        {/* --- PANTALLA DIGITAL (Renderiza filteredPokemons) --- */}
        <div className="bg-slate-950 border-4 border-slate-800 rounded-lg p-4 h-[50vh] overflow-y-auto custom-scrollbar shadow-inner">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {filteredPokemons.map((poke) => (
              <div 
                key={poke.id}
                onClick={() => isAuthenticated && setSelectedId(poke.id)}
                className={`p-2 rounded-lg border-2 transition-all flex flex-col items-center cursor-pointer relative overflow-hidden
                  ${selectedId === poke.id ? 'border-yellow-400 bg-slate-800/80 scale-105 shadow-[0_0_15px_rgba(250,204,21,0.3)]' : 'border-transparent'}
                  ${poke.captured ? 'grayscale-0 opacity-100' : 'grayscale opacity-40 hover:opacity-80'}
                `}
              >
                <span className="text-[8px] font-mono text-cyan-700 self-start uppercase">#{String(poke.id).padStart(3, '0')}</span>
                <img src={poke.image} alt={poke.name} className="w-16 h-16 object-contain z-10" />
                <p className="text-[9px] text-white font-mono uppercase truncate w-full text-center mt-1 z-10">{poke.name}</p>
                
                {/* Background sutil del tipo */}
                {poke.types && poke.types[0] && (
                   <div className={`absolute -bottom-4 -right-4 w-16 h-16 rounded-full opacity-20 blur-sm ${getTypeColor(poke.types[0])}`}></div>
                )}
              </div>
            ))}

            {/* Mensaje de "No Resultados" */}
            {filteredPokemons.length === 0 && (
              <div className="col-span-full text-center py-10 opacity-50">
                <p className="text-white font-mono">NO DATA FOUND</p>
              </div>
            )}
          </div>
        </div>

        {/* --- PANEL DE CONTROL --- */}
        <div className="mt-6 flex justify-between items-center px-4 bg-black/20 p-4 rounded-2xl border-t-2 border-black/10 gap-4">
           
           {/* 1. Pad Decorativo (Izquierda) */}
           <div className="shrink-0 w-16 h-16 bg-slate-900 rounded-full border-4 border-slate-800 relative shadow-inner">
              <div className="absolute top-1/2 left-0 w-full h-2 bg-slate-800 -translate-y-1/2"></div>
              <div className="absolute left-1/2 top-0 h-full w-2 bg-slate-800 -translate-x-1/2"></div>
           </div>

           {/* 2. 🔥 NUEVA PANTALLA DE DATOS (Centro) 🔥 */}
           <div className="flex-1 bg-green-900/30 border-2 border-green-800/50 rounded h-16 flex items-center justify-center relative overflow-hidden">
              {/* Scanlines decorativas */}
              <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.2)_50%)] bg-[length:100%_4px] pointer-events-none"></div>
              
              {selectedId && selectedPokemon ? (
                <div className="grid grid-cols-2 gap-x-6 text-green-400 font-mono text-xs z-10">
                   <div className="flex flex-col items-center">
                      <span className="text-[8px] text-green-600 uppercase">HEIGHT</span>
                      <span>{selectedPokemon.height / 10} m</span>
                   </div>
                   <div className="flex flex-col items-center">
                      <span className="text-[8px] text-green-600 uppercase">WEIGHT</span>
                      <span>{selectedPokemon.weight / 10} kg</span>
                   </div>
                </div>
              ) : (
                <p className="text-green-800 text-[10px] font-mono animate-pulse">NO_DATA</p>
              )}
           </div>

           {/* 3. Botones de Acción (Derecha) */}
           <div className="flex flex-col gap-2 w-48 shrink-0">
             {selectedId ? (
                isAuthenticated ? (
                  selectedPokemon?.captured ? (
                    <button onClick={() => handleRelease(selectedId)} className="w-full py-2 rounded bg-red-800 text-white text-[10px] font-bold border-b-4 border-red-950 active:border-b-0 uppercase hover:bg-red-700 transition-all">LIBERAR_ESPECIMEN</button>
                  ) : (
                    <button onClick={() => handleCapture(selectedId)} className="w-full py-2 rounded bg-purple-700 text-white text-[10px] font-bold border-b-4 border-purple-900 active:border-b-0 uppercase hover:bg-purple-600 transition-all">REGISTRAR_DATOS</button>
                  )
                ) : (
                  <div className="bg-zinc-800 h-8 rounded animate-pulse"></div> 
                )
             ) : (
               <div className="text-center py-2 bg-black/40 rounded border border-white/10">
                 <p className="text-[10px] text-zinc-500 font-mono uppercase">ESPERANDO_INPUT...</p>
               </div>
             )}
           </div>
        </div>

      </div>
    </div>
  );
}