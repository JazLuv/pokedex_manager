'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';

// Registration page component that manages username/password form state,
// submits registration data to /api/auth/register endpoint, redirects to login page with success flag
export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Handles form submission for new user registration
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.post('/api/auth/register', { username, password });
      router.push('/login?registered=true');
    } catch (err) {
      setError(err.response?.data?.error || 'Error en el sistema de registro');
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-mono">
    <div className="bg-red-600 p-1 rounded-3xl border-b-8 border-r-8 border-red-900 shadow-2xl max-w-md w-full">
      <div className="bg-slate-300 rounded-2xl p-6 border-4 border-red-700">
        
        <div className="bg-slate-950 border-4 border-slate-800 rounded-lg p-6 shadow-[inset_0_0_15px_rgba(0,0,0,1)]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-purple-400 text-lg tracking-tighter uppercase"> {'>'} REGISTRO DE ENTRENADOR</h2>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-slate-300 text-xs mb-1 uppercase">NOMBRE DE ENTRENADOR</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-black border-b border-purple-900 text-purple-400 p-2 focus:border-purple-400 outline-none transition-all"
                placeholder="USERNAME"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 text-xs mb-1 uppercase">CREA TU CONTRASEÑA</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black border-b border-purple-900 text-purple-400 p-2 focus:border-purple-400 outline-none transition-all"
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
              className="w-full bg-purple-700 hover:bg-purple-600 text-black font-bold py-3 rounded border-b-4 border-purple-900 active:border-b-0 transition-all uppercase text-xs"
            >
              {loading ? 'PROCESANDO...' : 'CREAR CUENTA'}
            </button>

            <div className="mt-4 text-center">
              <Link href="/login" className="text-[12px] text-slate-600 hover:text-cyan-400 underline uppercase">
                ¿YA ERES ENTRENADOR? INICIA SESIÓN AQUI
              </Link>
            </div>
          </form>
        </div>

      </div>
    </div>
  </div>
);
}