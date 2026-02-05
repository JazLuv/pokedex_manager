'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Petición a tu API de registro que ya configuramos
      await axios.post('/api/auth/register', { username, password });
      
      // Si el registro es exitoso, lo enviamos al login
      router.push('/login?registered=true');
    } catch (err) {
      setError(err.response?.data?.error || 'Error en el sistema de registro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-mono">
      <div className="bg-red-600 p-1 rounded-3xl border-b-8 border-r-8 border-red-900 shadow-2xl max-w-md w-full">
        <div className="bg-slate-300 rounded-2xl p-6 border-4 border-red-700">
          
          <div className="bg-slate-950 border-4 border-slate-800 rounded-lg p-6">
            <h2 className="text-blue-400 text-lg mb-6 tracking-tighter"> {'>'} NUEVO_ENTRENADOR_REG...</h2>

            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label className="block text-blue-300 text-xs mb-1 uppercase">DEFINIR_USUARIO</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-black border-b-2 border-blue-900 text-white p-2 focus:border-purple-500 outline-none"
                  placeholder="USERNAME"
                  required
                />
              </div>

              <div>
                <label className="block text-blue-300 text-xs mb-1 uppercase">DEFINIR_PASSCODE</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black border-b-2 border-blue-900 text-white p-2 focus:border-purple-500 outline-none"
                  placeholder="********"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-500 text-red-500 text-[10px] p-2 animate-pulse">
                  ALERTA: {error.toUpperCase()}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-700 hover:bg-purple-600 text-white font-bold py-3 rounded border-b-4 border-purple-900 active:border-b-0 transition-all uppercase text-xs"
              >
                {loading ? 'PROCESANDO...' : 'CREAR_CUENTA'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <Link href="/login" className="text-[10px] text-slate-500 hover:text-blue-400 underline uppercase">
                ¿Ya tienes cuenta? Volver al inicio
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}