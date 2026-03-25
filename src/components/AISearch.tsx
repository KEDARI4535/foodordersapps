import React, { useState } from 'react';
import { Search, Sparkles, MapPin, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchAI } from '../utils/ai';
import toast from 'react-hot-toast';

const AISearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setResults([]);
    setAiResponse(null);

    try {
      const { text, mapsResults } = await searchAI(query);
      setAiResponse(text || null);
      setResults(mapsResults || []);
      
      if (!text && (!mapsResults || mapsResults.length === 0)) {
        toast('No results found for your query.');
      }
    } catch (error) {
      console.error('AI Search failed:', error);
      toast.error('Failed to search with AI. Please check your API key.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="relative group">
        <input
          type="text"
          className="block w-full pl-6 pr-32 py-5 bg-white border border-slate-200 rounded-3xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-lg"
          placeholder="Search food"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="absolute right-3 top-3 bottom-3 px-6 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 disabled:opacity-50 transition-all flex items-center justify-center"
        >
          {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
        </button>
      </div>

      <AnimatePresence>
        {(aiResponse || results.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-8 space-y-6"
          >
            {aiResponse && (
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-3xl p-6 text-slate-700 leading-relaxed">
                <div className="flex items-center gap-2 mb-3 text-emerald-600 font-bold text-sm uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  AI Suggestion
                </div>
                {aiResponse}
              </div>
            )}

            {results.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {results.map((place: any, idx: number) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => window.open(place.uri, '_blank')}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                          {place.title}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">Click to view on Google Maps</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AISearch;
