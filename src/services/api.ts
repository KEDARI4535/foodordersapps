export interface FoodItem {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
  rating: number;
}

export interface Restaurant {
  id: number;
  name: string;
  rating: number;
  time: string;
  image: string;
}

export const fetchFoods = async (category?: string): Promise<FoodItem[]> => {
  const url = category ? `/foods?category=${category}` : "/foods";
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch foods");
  return response.json();
};

export const searchFoods = async (query: string): Promise<FoodItem[]> => {
  const response = await fetch(`/search?q=${query}`);
  if (!response.ok) throw new Error("Search failed");
  return response.json();
};

export const fetchRestaurants = async (): Promise<Restaurant[]> => {
  const response = await fetch("/restaurants");
  if (!response.ok) throw new Error("Failed to fetch restaurants");
  return response.json();
};
