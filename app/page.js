'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { getTypeColor } from '@/lib/pokeApi'; 

export default function Home() {
  // --- ESTADOS GLOBALES ---
  const [pokemons, setPokemons] = useState([]);
  const [filteredPokemons, setFilteredPokemons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // --- ESTADOS DE FILTRO Y BÚSQUEDA ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCaught, setFilterCaught] = useState(false);
  const [selectedType, setSelectedType] = useState(null);

  // --- NUEVOS ESTADOS (EQUIPO Y UI) ---
  const [myTeam, setMyTeam] = useState([]); 
  const [mobileTab, setMobileTab] = useState('right'); 

  const selectedPokemon = pokemons.find(p => p.id === selectedId);

  // --- FUNCIONES LOGICAS (Sin cambios) ---
  const handleCapture = async (pokemonId) => {
    if (!isAuthenticated) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/pokemon', { pokemonId }, { headers: { Authorization: `Bearer ${token}` } });
      const updateList = (list) => list.map(p => p.id === pokemonId ? { ...p, captured: true } : p);
      setPokemons(prev => updateList(prev));
    } catch (error) {
      alert("ERROR_CAPTURA: " + (error.response?.data?.error || "Offline"));
    }
  };

  const handleRelease = async (pokemonId) => {
    if (!isAuthenticated) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete('/api/pokemon', { headers: { Authorization: `Bearer ${token}` }, data: { pokemonId } });
      const updateList = (list) => list.map(p => p.id === pokemonId ? { ...p, captured: false, is_team: false } : p);
      setPokemons(prev => updateList(prev));
      setMyTeam(prev => prev.filter(p => p.id !== pokemonId));
    } catch (error) {
      alert("ERROR_LIBERACIÓN: " + (error.response?.data?.error || "Offline"));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setSelectedId(null);
    setFilterCaught(false);
    setSearchTerm('');
    setSelectedType(null);
    setMyTeam([]);
    const placeholders = Array.from({ length: 151 }, (_, i) => ({
      id: i + 1, name: 'UNKNOWN_DATA', image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${i + 1}.png`, captured: false, types: ['normal']
    }));
    setPokemons(placeholders);
    setFilteredPokemons(placeholders);
  };

  const toggleTeamMember = (pokemon) => {
    if (!isAuthenticated) return;
    const isInTeam = myTeam.find(p => p.id === pokemon.id);
    if (isInTeam) {
      setMyTeam(prev => prev.filter(p => p.id !== pokemon.id));
    } else {
      if (myTeam.length >= 6) {
        alert("EQUIPO LLENO: Máximo 6 Pokémon.");
        return;
      }
      setMyTeam(prev => [...prev, pokemon]);
    }
  };

  // --- EFFECTS ---
  useEffect(() => {
    let result = pokemons;
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(p => p.name.includes(lowerTerm) || p.id.toString() === lowerTerm);
    }
    if (filterCaught) result = result.filter(p => p.captured);
    if (selectedType) result = result.filter(p => p.types && p.types.includes(selectedType));
    setFilteredPokemons(result);
  }, [searchTerm, filterCaught, selectedType, pokemons]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsAuthenticated(false);
      const placeholders = Array.from({ length: 151 }, (_, i) => ({
        id: i + 1, name: 'UNKNOWN_DATA', image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${i + 1}.png`, captured: false, types: ['normal']
      }));
      setPokemons(placeholders);
      setFilteredPokemons(placeholders);
      setLoading(false);
      return;
    }
    async function loadPokedex() {
      try {
        const res = await axios.get('/api/pokemon', { headers: { Authorization: `Bearer ${token}` } });
        setPokemons(res.data);
        setFilteredPokemons(res.data);
        setIsAuthenticated(true);
        setMyTeam(res.data.filter(p => p.is_team)); 
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

  const capturedCount = pokemons.filter(p => p.captured).length;
  const isInTeam = selectedPokemon && myTeam.some(p => p.id === selectedPokemon.id);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center font-mono text-cyan-500 animate-pulse">INIT_SYS...</div>;

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-2 md:p-4 transition-colors duration-700 font-mono ${isAuthenticated ? 'bg-slate-900' : 'bg-zinc-800'}`}>
      
      {/* --- OVERLAY LOGIN --- */}
      {!isAuthenticated && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
          <h1 className="text-4xl font-black text-white mb-8 tracking-tighter">POKEDEX_KANTO_OS</h1>
          <Link href="/login" className="bg-green-500 hover:bg-green-400 text-black px-12 py-6 rounded font-bold text-2xl shadow-[0_0_30px_rgba(34,197,94,0.6)] animate-pulse border-4 border-green-700">
            INSERTAR CARTUCHO (LOGIN)
          </Link>
        </div>
      )}

      {/* --- HEADER PRINCIPAL (EXTERNO AL CASE) --- */}
      {/* Aquí colocamos el botón de LOGOUT para máxima visibilidad en desktop y mobile */}
      {isAuthenticated && (
        <div className="w-full max-w-7xl flex justify-between items-center mb-2 px-2">
            <div className="text-white/50 text-xs">SYS_ONLINE</div>
            <button 
                onClick={handleLogout}
                className="bg-red-900/80 hover:bg-red-600 text-red-100 px-6 py-2 rounded-full font-bold uppercase border-2 border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all flex items-center gap-2 group"
            >
                <div className="w-2 h-2 rounded-full bg-red-500 group-hover:bg-white animate-pulse"></div>
                APAGAR SISTEMA (LOGOUT)
            </button>
        </div>
      )}

      {/* --- CONTENEDOR PRINCIPAL (CASE ROJO) --- */}
      <div className={`w-full max-w-7xl h-[85vh] md:h-[85vh] bg-red-600 rounded-3xl shadow-2xl border-4 border-red-800 flex flex-col lg:flex-row overflow-hidden relative ${!isAuthenticated && 'grayscale pointer-events-none'}`}>
        
        {/* --- TOGGLE MOBILE --- */}
        <div className="lg:hidden h-12 bg-red-800 flex shrink-0">
          <button onClick={() => setMobileTab('left')} className={`flex-1 text-xs font-bold uppercase ${mobileTab === 'left' ? 'bg-red-600 text-white shadow-inner' : 'text-red-300'}`}>IA & TEAM</button>
          <button onClick={() => setMobileTab('right')} className={`flex-1 text-xs font-bold uppercase ${mobileTab === 'right' ? 'bg-red-600 text-white shadow-inner' : 'text-red-300'}`}>DEX & DATA</button>
        </div>

        {/* =================================================================================
            🔵 PANEL IZQUIERDO: IA VISION & TEAM DASHBOARD
           ================================================================================= */}
        <div className={`lg:w-1/2 p-6 flex flex-col gap-4 border-r-0 lg:border-r-8 border-red-800 bg-red-600 ${mobileTab === 'left' ? 'block' : 'hidden lg:flex'}`}>
          {/* ... (Contenido IA sin cambios) ... */}
          <div className="bg-slate-200 rounded-2xl p-4 border-b-4 border-slate-300 shadow-inner flex-1 flex flex-col relative">
            <div className="absolute top-2 left-2 flex gap-2">
               <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white shadow animate-pulse"></div>
               <div className="w-3 h-3 rounded-full bg-red-500 mt-1"></div>
               <div className="w-3 h-3 rounded-full bg-yellow-500 mt-1"></div>
            </div>
            <div className="mt-8 flex-1 bg-black rounded border-4 border-gray-400 flex flex-col items-center justify-center relative overflow-hidden">
               <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,100,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none z-10"></div>
               <p className="text-green-500 text-xs text-center px-4">[!] SENSOR DE CÁMARA DESACTIVADO<br/>ESPERANDO MÓDULO IA...</p>
               <div className="flex gap-4 mt-4 z-20">
                 <button className="bg-blue-600 text-white px-3 py-1 text-[10px] rounded border border-blue-400 hover:bg-blue-500">TOMAR FOTO</button>
                 <button className="bg-slate-700 text-white px-3 py-1 text-[10px] rounded border border-slate-500 hover:bg-slate-600">SUBIR IMG</button>
               </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-2xl p-4 border-t-4 border-slate-900 shadow-inner flex-1 flex flex-col">
             <div className="flex justify-between items-center mb-2">
                <h3 className="text-yellow-400 text-xs font-bold uppercase">MY_TEAM_V1</h3>
                <span className="text-slate-400 text-[10px]">{myTeam.length} / 6</span>
             </div>
             <div className="grid grid-cols-3 gap-2 flex-1">
                {Array.from({ length: 6 }).map((_, i) => {
                   const member = myTeam[i];
                   return (
                     <div key={i} className="bg-slate-700 rounded border border-slate-600 relative flex items-center justify-center group overflow-hidden">
                        {member ? (
                           <>
                             <img src={member.image} alt={member.name} className="w-12 h-12 object-contain z-10" />
                             <button onClick={(e) => { e.stopPropagation(); toggleTeamMember(member); }} className="absolute top-0 right-0 bg-red-500 text-white w-4 h-4 text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">X</button>
                           </>
                        ) : <span className="text-slate-500 text-xl font-bold opacity-20">{i + 1}</span>}
                     </div>
                   )
                })}
             </div>
             <button className="mt-3 w-full bg-cyan-700 text-white py-2 rounded text-xs font-bold border-b-4 border-cyan-900 active:border-b-0 uppercase hover:bg-cyan-600 transition-all flex items-center justify-center gap-2">
                <span className="animate-spin text-[10px]">⚙</span> ANALIZAR ESTRATEGIA (IA)
             </button>
          </div>
        </div>

        {/* --- BISAGRA CENTRAL --- */}
        <div className="hidden lg:block w-8 bg-gradient-to-r from-red-900 via-red-600 to-red-900 h-full border-x border-red-950 relative z-10"></div>

        {/* =================================================================================
            🔴 PANEL DERECHO: DASHBOARD PRINCIPAL
           ================================================================================= */}
        <div className={`lg:w-1/2 p-6 flex flex-col bg-red-600 relative ${mobileTab === 'right' ? 'block' : 'hidden lg:flex'}`}>
          
          {/* 1. BARRA SUPERIOR (Search & Filters) */}
          <div className="bg-red-700 p-3 rounded-t-2xl border-b border-red-800 shadow-lg mb-4">
             <div className="flex gap-2 mb-3">
                <div className="bg-slate-900 rounded p-2 border border-slate-700 flex items-center justify-center">
                    <span className="text-slate-500">🔍</span>
                </div>
                <input 
                  type="text" placeholder="BUSCAR..." 
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 text-green-400 font-mono text-xs p-2 rounded border border-slate-700 outline-none uppercase"
                />
             </div>
             
             {/* FILTROS MEJORADOS (ESTILO PILDORAS) */}
             <div className="flex flex-col gap-3">
                 <div className="flex gap-2">
                    <button onClick={() => setFilterCaught(!filterCaught)} className={`px-4 py-1 text-[10px] rounded-full uppercase font-bold border-2 transition-all shadow-sm ${filterCaught ? 'bg-blue-600 text-white border-blue-800' : 'bg-slate-800 text-slate-400 border-slate-900'}`}>
                        {filterCaught ? 'VIEW: CAUGHT' : 'VIEW: ALL'}
                    </button>
                    {selectedType && (
                        <button onClick={() => setSelectedType(null)} className="px-3 py-1 text-[10px] rounded-full bg-red-900 text-white border border-red-500 font-bold uppercase hover:bg-red-800">
                             CLEAR FILTER (X)
                        </button>
                    )}
                 </div>

                 <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto custom-scrollbar p-1">
                    {/* Lista completa de tipos */}
                    {['normal','fire','water','grass','electric','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','steel','fairy'].map(t => (
                       <button 
                            key={t} 
                            onClick={() => setSelectedType(selectedType === t ? null : t)} 
                            className={`
                                px-3 py-1 rounded text-[9px] font-bold text-white uppercase tracking-wider border-b-2 shadow-sm transition-all
                                ${getTypeColor(t)}
                                ${selectedType === t ? 'border-white scale-110 ring-2 ring-white/50 z-10' : 'border-black/20 opacity-80 hover:opacity-100 hover:scale-105'}
                            `}
                        >
                            {t.substring(0,8)}
                       </button>
                    ))}
                 </div>
             </div>
          </div>

          {/* 2. PANTALLA PRINCIPAL (Grid) */}
          <div className="flex-1 bg-slate-900 rounded-lg p-2 border-4 border-slate-700 shadow-[inset_0_0_20px_rgba(0,0,0,1)] overflow-hidden relative min-h-0">
             <div className="h-full overflow-y-auto custom-scrollbar pr-1">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                   {filteredPokemons.map((poke) => (
                      <div 
                        key={poke.id}
                        onClick={() => setSelectedId(poke.id)}
                        className={`p-1 rounded flex flex-col items-center cursor-pointer transition-all border-2
                           ${selectedId === poke.id ? 'bg-slate-800 border-yellow-400' : 'border-transparent hover:bg-slate-800/50'}
                           ${poke.captured ? 'opacity-100' : 'opacity-40 grayscale'}
                        `}
                      >
                         <span className="text-[8px] text-slate-500 self-start">#{poke.id}</span>
                         <img src={poke.image} alt={poke.name} className="w-12 h-12 object-contain" />
                         <p className="text-[8px] text-white uppercase mt-1 truncate w-full text-center">{poke.name}</p>
                      </div>
                   ))}
                </div>
                {filteredPokemons.length === 0 && <div className="text-center text-slate-600 mt-10 text-xs">NO DATA FOUND</div>}
             </div>
          </div>

          {/* 3. PANEL DE CONTROL INFERIOR */}
          <div className="mt-4 bg-slate-200 rounded-xl p-3 border-t-4 border-slate-300 shadow-inner flex flex-col gap-3 shrink-0">
             <div className="bg-green-800 rounded border-2 border-green-900 p-2 h-14 flex items-center justify-between px-4 relative overflow-hidden shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none"></div>
                {selectedPokemon ? (
                   <>
                     <div className="text-green-100 font-mono text-xs z-10 text-center"><p className="text-[8px] opacity-60">HGT</p><p>{selectedPokemon.height / 10}m</p></div>
                     <div className="text-green-100 font-mono text-xs z-10 text-center"><p className="text-[8px] opacity-60">WGT</p><p>{selectedPokemon.weight / 10}kg</p></div>
                     <div className="text-green-100 font-mono text-xs z-10 text-center"><p className="text-[8px] opacity-60">TYPE</p><p className="uppercase">{selectedPokemon.types?.[0]?.substring(0,8) || '??'}</p></div>
                   </>
                ) : <p className="w-full text-center text-green-500/50 text-xs animate-pulse">SELECT POKÉMON</p>}
             </div>

             <div className="flex gap-2">
                <button onClick={() => selectedPokemon && toggleTeamMember(selectedPokemon)} disabled={!selectedPokemon || !selectedPokemon.captured} className={`flex-1 py-3 rounded font-bold text-[10px] uppercase border-b-4 active:border-b-0 transition-all ${isInTeam ? 'bg-yellow-500 text-yellow-900 border-yellow-700' : 'bg-slate-700 text-white border-slate-900'} ${(!selectedPokemon || !selectedPokemon.captured) && 'opacity-50'}`}>{isInTeam ? 'QUITAR EQUIPO' : 'AÑADIR EQUIPO'}</button>
                {selectedPokemon?.captured ? (
                   <button onClick={() => handleRelease(selectedId)} className="flex-1 bg-red-600 text-white border-red-800 hover:bg-red-500 py-3 rounded font-bold text-[10px] uppercase border-b-4 active:border-b-0 transition-all">LIBERAR</button>
                ) : (
                   <button onClick={() => handleCapture(selectedId)} disabled={!selectedId} className="flex-1 bg-blue-600 text-white border-blue-800 hover:bg-blue-500 py-3 rounded font-bold text-[10px] uppercase border-b-4 active:border-b-0 transition-all disabled:opacity-50">CAPTURAR</button>
                )}
             </div>
          </div>

        </div>

      </div>
    </div>
  );
}