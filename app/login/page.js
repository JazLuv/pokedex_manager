'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';

// Componente interno para manejar los parámetros de búsqueda
function LoginContent() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRegistered = searchParams.get('registered'); // Detecta si viene del registro

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await axios.post('/api/auth/login', { username, password });
      localStorage.setItem('token', res.data.token);
      router.push('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Error de acceso');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-950 border-4 border-slate-800 rounded-lg p-6 shadow-[inset_0_0_15px_rgba(0,0,0,1)]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-cyan-400 text-lg tracking-tighter uppercase"> {'>'} LOGIN_SYS_v4</h2>
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
      </div>

      {/* --- ALERTA DE ÉXITO --- */}
      {isRegistered && !error && (
        <div className="mb-4 bg-green-900/20 border border-green-500 p-3 text-green-400 text-[10px] animate-bounce">
          {'>'} ENTRENADOR_REGISTRADO_CON_ÉXITO. 
          <br /> {'>'} POR_FAVOR_INICIE_SESIÓN.
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-slate-500 text-[10px] mb-1">USER_ID</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-black border-b border-cyan-900 text-cyan-400 p-2 focus:border-cyan-400 outline-none transition-all"
            placeholder="NOMBRE"
            required
          />
        </div>

        <div>
          <label className="block text-slate-500 text-[10px] mb-1">ACCESS_CODE</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-black border-b border-cyan-900 text-cyan-400 p-2 focus:border-cyan-400 outline-none transition-all"
            placeholder="••••••••"
            required
          />
        </div>

        {error && (
          <p className="text-red-500 text-[10px] bg-red-900/10 p-2 border border-red-900">
            [ERROR]: {error.toUpperCase()}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-cyan-700 hover:bg-cyan-600 text-black font-bold py-3 rounded border-b-4 border-cyan-900 active:border-b-0 transition-all uppercase text-xs"
        >
          {loading ? 'AUTENTICANDO...' : 'EJECUTAR_LOGIN'}
        </button>

        <div className="mt-4 text-center">
          <Link href="/register" className="text-[9px] text-slate-600 hover:text-purple-400 underline uppercase">
            ¿No tienes cuenta? Crear nuevo registro
          </Link>
        </div>
      </form>
    </div>
  );
}

// Layout principal del login
export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-mono">
      <div className="bg-red-600 p-1 rounded-3xl border-b-8 border-r-8 border-red-900 shadow-2xl max-w-md w-full">
        <div className="bg-slate-300 rounded-2xl p-6 border-4 border-red-700">
          <Suspense fallback={<div className="text-black">Cargando sistema...</div>}>
            <LoginContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}