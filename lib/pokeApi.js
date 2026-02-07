import axios from 'axios';

const BASE_URL = 'https://pokeapi.co/api/v2';

// Fetches the list of all 151 Generation 1 pokemon from the pokeapi
export const fetchFirstGen = async () => {
  const response = await axios.get(`${BASE_URL}/pokemon?limit=151`);
  return response.data.results;
};

// Fetches detailed information for a specific pokemon
export const fetchPokemonDetails = async (id) => {
  const response = await axios.get(`${BASE_URL}/pokemon/${id}`);
  return response.data;
};

// Returns the appropriate tailwind css background color class for a given pokemon type
export const getTypeColor = (type) => {
  const colors = {
    normal: "bg-gray-400",
    fire: "bg-orange-500",
    water: "bg-blue-500",
    grass: "bg-green-500",
    electric: "bg-yellow-400 text-black",
    ice: "bg-cyan-300 text-black",
    fighting: "bg-red-700",
    poison: "bg-purple-500",
    ground: "bg-yellow-600",
    flying: "bg-indigo-400",
    psychic: "bg-pink-500",
    bug: "bg-lime-500",
    rock: "bg-yellow-800",
    ghost: "bg-purple-800",
    dragon: "bg-indigo-600",
  };
  return colors[type] || "bg-slate-500";
};