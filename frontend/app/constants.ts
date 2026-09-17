// Blog Post Types and Interfaces
export interface BlogPost {
  id: number;
  year?: number | string;
  date?: string;
  title: string;
  excerpt: string;
  content: string;
  author?: string;
  category?: string;
  tags?: string[];
  references?: string[];
}

// Era Types
export interface Era {
  name: string;
  color: string;
  icon: string;
  startYear: number;
  endYear: number;
}

// Era definitions for AI History
export const eras: Era[] = [
  { name: 'Foundations', color: 'bg-purple-500', icon: '🧮', startYear: 1936, endYear: 1955 },
  { name: 'Birth of AI', color: 'bg-blue-500', icon: '🧠', startYear: 1956, endYear: 1969 },
  { name: 'Expert Systems', color: 'bg-green-500', icon: '💡', startYear: 1970, endYear: 1979 },
  { name: 'AI Winter', color: 'bg-gray-500', icon: '❄️', startYear: 1980, endYear: 1989 },
  { name: 'Revival', color: 'bg-orange-500', icon: '🔥', startYear: 1990, endYear: 1999 },
  { name: 'Data Era', color: 'bg-cyan-500', icon: '📊', startYear: 2000, endYear: 2009 },
  { name: 'Deep Learning', color: 'bg-indigo-500', icon: '🚀', startYear: 2010, endYear: 2019 },
  { name: 'Transformers', color: 'bg-pink-500', icon: '✨', startYear: 2020, endYear: 2025 },
];

// Utility function to get era by year
export const getEraByYear = (year?: number): Era => {
  if (!year) return eras[eras.length - 1];
  
  const era = eras.find(e => year >= e.startYear && year <= e.endYear);
  return era || eras[eras.length - 1];
};

// Utility function to get era color class
export const getEraColor = (year?: number): string => {
  return getEraByYear(year).color;
};

// Utility function to get era icon
export const getEraIcon = (year?: number): string => {
  return getEraByYear(year).icon;
};

// Utility function to get era name
export const getEraName = (year?: number): string => {
  return getEraByYear(year).name;
};
