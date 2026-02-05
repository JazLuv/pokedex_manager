import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import axios from 'axios';

// --- 🔥 CACHÉ EN MEMORIA 🔥 ---
// Al declarar esta variable FUERA de la función, se mantiene viva
// mientras el servidor esté encendido.
let cachedGen1Data = null;

async function getUserIdFromRequest(request) {
  const token = request.headers.get('authorization')?.split(' ')[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.id;
  } catch {
    return null;
  }
}

export async function GET(request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const db = await getDb();

    // 1. VERIFICAMOS SI YA TENEMOS LOS DATOS EN CACHÉ
    let baseData;

    if (cachedGen1Data) {
      console.log("⚡ Usando datos de Caché (Rápido)");
      baseData = cachedGen1Data;
    } else {
      console.log("🐢 Caché vacía. Descargando de PokéAPI... (Lento)");
      
      // A. Pedimos la lista
      const listResponse = await axios.get('https://pokeapi.co/api/v2/pokemon?limit=151');
      const baseList = listResponse.data.results;

      // B. Pedimos los detalles en paralelo
      const detailPromises = baseList.map(p => axios.get(p.url));
      const detailsResponses = await Promise.all(detailPromises);

      // C. Formateamos y GUARDAMOS EN CACHÉ
      cachedGen1Data = detailsResponses.map((response) => {
        const apiData = response.data;
        return {
          id: apiData.id,
          name: apiData.name,
          image: apiData.sprites.front_default,
          types: apiData.types.map(t => t.type.name),
        };
      });

      baseData = cachedGen1Data;
    }

    // 2. Consultamos la base de datos local (Esto SIEMPRE se hace fresco)
    // Porque las capturas cambian usuario por usuario.
    const userRows = await db.all(
      'SELECT pokemon_id, is_team FROM collection WHERE user_id = ?',
      [userId]
    );

    // 3. Cruzamos Caché con DB Local
    const fullCollection = baseData.map((pokemon) => {
      const captureData = userRows.find(row => row.pokemon_id === pokemon.id);
      return {
        ...pokemon, // Usamos los datos estáticos (nombre, tipo, img)
        captured: !!captureData, // Datos dinámicos (capturado o no)
        is_team: captureData ? !!captureData.is_team : false,
      };
    });

    return NextResponse.json(fullCollection);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error al cargar datos" }, { status: 500 });
  }
}

// ... (POST y DELETE se mantienen igual) ...
export async function POST(request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { pokemonId } = await request.json();
    const db = await getDb();

    await db.run(
      'INSERT INTO collection (user_id, pokemon_id) VALUES (?, ?)',
      [userId, pokemonId]
    );

    return NextResponse.json({ message: "¡Pokémon capturado!" });
  } catch (error) {
    return NextResponse.json({ error: "Ya tienes este Pokémon" }, { status: 400 });
  }
}

export async function DELETE(request) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const body = await request.json();

    if (!body.pokemonId) {
      return NextResponse.json({ error: 'Falta el ID del Pokémon' }, { status: 400 });
    }

    const db = await getDb();
    
    const result = await db.run(
      'DELETE FROM collection WHERE user_id = ? AND pokemon_id = ?',
      [decoded.id, body.pokemonId]
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'El Pokémon no estaba en tu colección' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Pokémon liberado con éxito' });
  } catch (error) {
    console.error("DETALLE DEL ERROR EN DELETE:", error);
    return NextResponse.json({ 
      error: 'Error interno al liberar', 
      details: error.message 
    }, { status: 500 });
  }
}