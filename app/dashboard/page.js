'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function Dashboard() {
  const [pokemons, setPokemons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null); // Estado para la selección activa
  const router = useRouter();

  // Helper para obtener los datos del Pokémon que el usuario seleccionó
  const selectedPokemon = pokemons.find(p => p.id === selectedId);

  // --- 1. FUNCIÓN: CAPTURAR ---
  const handleCapture = async (pokemonId) => {
    if (!pokemonId) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/pokemon', 
        { pokemonId }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPokemons(prev => prev.map(p => 
        p.id === pokemonId ? { ...p, captured: true } : p
      ));
    } catch (error) {
      alert("ERROR_CAPTURA: " + (error.response?.data?.error || "Offline"));
    }
  };

  // --- 2. FUNCIÓN: LIBERAR ---
  const handleRelease = async (pokemonId) => {
    if (!pokemonId) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete('/api/pokemon', {
        headers: { Authorization: `Bearer ${token}` },
        data: { pokemonId }
      });

      setPokemons(prev => prev.map(p => 
        p.id === pokemonId ? { ...p, captured: false, is_team: false } : p
      ));
    } catch (error) {
      alert("ERROR_LIBERACIÓN: " + (error.response?.data?.error || "Offline"));
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    async function loadPokedex() {
      try {
        const res = await axios.get('/api/pokemon', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPokemons(res.data);
      } catch (error) {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    }
    loadPokedex();
  }, [router]);

  const capturedCount = pokemons.filter(p => p.captured).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center font-mono">
        <p className="text-cyan-500 text-xl animate-pulse uppercase">{'>'} Sincronizando_Pokedex...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-red-600 w-full max-w-5xl rounded-3xl border-b-8 border-r-8 border-red-900 shadow-2xl p-6 relative">
        
        {/* --- Cabecera --- */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex gap-3">
            <div className="w-12 h-12 bg-blue-400 rounded-full border-4 border-white shadow-[0_0_15px_rgba(59,130,246,1)]"></div>
            <div className="flex gap-1 mt-2">
              <div className="w-3 h-3 bg-red-500 rounded-full border border-red-800"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full border border-yellow-800"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full border border-green-800"></div>
            </div>
          </div>
          <div className="bg-black border-2 border-cyan-900 px-4 py-1 rounded">
             <p className="text-cyan-400 font-mono text-xs uppercase tracking-tighter">
                STATUS: <span className="text-white text-lg">{String(capturedCount).padStart(2, '0')}</span> / 151
             </p>
          </div>
        </div>

        {/* --- Pantalla Digital (Grid de Selección) --- */}
        <div className="bg-slate-950 border-4 border-slate-800 rounded-lg p-4 h-[55vh] overflow-y-auto custom-scrollbar shadow-[inset_0_0_30px_rgba(0,0,0,1)]">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {pokemons.map((poke) => (
              <div 
                key={poke.id}
                onClick={() => setSelectedId(poke.id)}
                className={`p-2 rounded-lg border-2 transition-all flex flex-col items-center cursor-pointer
                  ${selectedId === poke.id ? 'border-yellow-400 bg-slate-800/50 scale-105 shadow-[0_0_15px_rgba(250,204,21,0.3)]' : 'border-transparent'}
                  ${poke.captured ? 'grayscale-0 opacity-100' : 'grayscale opacity-40 hover:opacity-100'}
                `}
              >
                <span className="text-[8px] font-mono text-cyan-700 self-start uppercase">#{String(poke.id).padStart(3, '0')}</span>
                <img src={poke.image} alt={poke.name} className="w-16 h-16 object-contain" />
                <p className="text-[9px] text-white font-mono uppercase truncate w-full text-center mt-1">{poke.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* --- PANEL DE CONTROL (Botones Fijos en Carcasa) --- */}
        <div className="mt-6 flex justify-between items-center px-4 bg-red-700/20 p-4 rounded-2xl border-t-2 border-red-800">
           {/* Pad Decorativo */}
           <div className="w-16 h-16 bg-slate-900 rounded-full border-4 border-slate-800 relative shadow-inner">
              <div className="absolute top-1/2 left-0 w-full h-2 bg-slate-800 -translate-y-1/2"></div>
              <div className="absolute left-1/2 top-0 h-full w-2 bg-slate-800 -translate-x-1/2"></div>
           </div>

           {/* Consola de Comandos */}
           <div className="flex flex-col gap-2 w-56">
              {!selectedId ? (
                <div className="text-center py-2 bg-black/40 rounded border border-red-900/50">
                  <p className="text-[10px] text-red-400 font-mono animate-pulse uppercase">Esperando_Selección...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  
                  {selectedPokemon?.captured ? (
                    <button
                      onClick={() => handleRelease(selectedId)}
                      className="w-full py-2 rounded bg-red-800 text-white text-[10px] font-bold border-b-4 border-red-950 active:border-b-0 hover:bg-red-700 transition-all font-mono uppercase"
                    >
                      Ejecutar_Liberación
                    </button>
                  ) : (
                    <button
                      onClick={() => handleCapture(selectedId)}
                      className="w-full py-2 rounded bg-purple-700 text-white text-[10px] font-bold border-b-4 border-purple-900 active:border-b-0 hover:bg-purple-600 transition-all font-mono uppercase"
                    >
                      Ejecutar_Captura
                    </button>
                  )}
                </div>
              )}
           </div>
        </div>

      </div>
    </div>
  );
}