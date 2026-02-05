import { getDb } from '@/lib/db';
import { fetchFirstGen } from '@/lib/pokeApi';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

// Función auxiliar para obtener el usuario del token
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

// GET: Lista de 151 Pokémon + Estado de captura
export async function GET(request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const db = await getDb();
    const basePokemon = await fetchFirstGen(); // Trae nombre y url de la PokéAPI

    // Consultamos la colección del usuario en SQLite
    const userRows = await db.all(
      'SELECT pokemon_id, is_team FROM collection WHERE user_id = ?',
      [userId]
    );

    // Cruzamos los datos
    const fullCollection = basePokemon.map((p, index) => {
      const id = index + 1;
      const captureData = userRows.find(row => row.pokemon_id === id);
      
      return {
        id,
        name: p.name,
        image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
        captured: !!captureData,
        is_team: captureData ? !!captureData.is_team : false
      };
    });

    return NextResponse.json(fullCollection);
  } catch (error) {
    return NextResponse.json({ error: "Error al cargar la Pokedex" }, { status: 500 });
  }
}

// POST: Capturar un Pokémon
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
    
    // Log para depuración profesional
    const body = await request.json();
    console.log("Intentando liberar Pokémon:", body.pokemonId, "para usuario:", decoded.id);

    if (!body.pokemonId) {
      return NextResponse.json({ error: 'Falta el ID del Pokémon' }, { status: 400 });
    }

    const db = await getDb();
    
    // Ejecutamos la eliminación en la tabla de colección
    const result = await db.run(
      'DELETE FROM collection WHERE user_id = ? AND pokemon_id = ?',
      [decoded.id, body.pokemonId]
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'El Pokémon no estaba en tu colección' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Pokémon liberado con éxito' });
  } catch (error) {
    console.error("DETALLE DEL ERROR EN DELETE:", error); // Esto saldrá en tu terminal
    return NextResponse.json({ 
      error: 'Error interno al liberar', 
      details: error.message 
    }, { status: 500 });
  }
}