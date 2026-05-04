import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Info, 
  Plus, 
  Search, 
  Bell, 
  ChevronDown, 
  X, 
  Volume2, 
  VolumeX, 
  ChevronLeft, 
  ChevronRight,
  Star,
  ThumbsUp,
  Loader2,
  Check,
  PlayCircle,
  RotateCcw,
  Home,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const TMDB_API_KEY = "830cfbcecf6ff1fee8b4a7a11082f995";
const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original";

export default function App() {
  const [activePage, setActivePage] = useState('home'); 
  const [heroMovie, setHeroMovie] = useState(null);
  const [bannerMovies, setBannerMovies] = useState<any[]>([]);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [rows, setRows] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [similarContent, setSimilarContent] = useState([]);
  const [trailerKey, setTrailerKey] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Scroll modal to top when media selection changes
  useEffect(() => {
    if (selectedMedia && modalRef.current) {
      modalRef.current.scrollTo(0, 0);
    }
  }, [selectedMedia]);

  // Fetch Main Content
  useEffect(() => {
    const fetchContent = async () => {
      let categories = [];
      if (activePage === 'home') {
        categories = [
          { title: "Trending Now", url: `${BASE_URL}/trending/all/week?api_key=${TMDB_API_KEY}` },
          { title: "Netflix Originals", url: `${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_networks=213` },
          { title: "Top Rated", url: `${BASE_URL}/movie/top_rated?api_key=${TMDB_API_KEY}` },
          { title: "Action Hits", url: `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=28` },
        ];
      } else if (activePage === 'tv') {
        categories = [
          { title: "Popular TV Shows", url: `${BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}` },
          { title: "Animation", url: `${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_genres=16` },
          { title: "Sci-Fi & Fantasy", url: `${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_genres=10765` },
        ];
      } else if (activePage === 'movies') {
        categories = [
          { title: "Popular Movies", url: `${BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}` },
          { title: "Comedies", url: `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=35` },
          { title: "Horror", url: `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=27` },
        ];
      } else if (activePage === 'latest') {
        categories = [
          { title: "Recently Added", url: `${BASE_URL}/movie/now_playing?api_key=${TMDB_API_KEY}` },
          { title: "Coming Soon", url: `${BASE_URL}/movie/upcoming?api_key=${TMDB_API_KEY}` },
        ];
      }

      try {
        const rowData = await Promise.all(
          categories.map(async (cat) => {
            const res = await fetch(cat.url);
            const data = await res.json();
            return { title: cat.title, movies: data.results.filter((m: any) => m.backdrop_path || m.poster_path) };
          })
        );
        setRows(rowData as any);
        if (rowData[0]?.movies?.length > 0) {
          const topTen = rowData[0].movies.slice(0, 10);
          setBannerMovies(topTen);
          setHeroMovie(topTen[0]);
          setCurrentHeroIndex(0);
        }
      } catch (err) { console.error(err); }
    };
    fetchContent();
  }, [activePage]);

  // Fetch Detailed Media Info (Similar + Trailers + Logo)
  useEffect(() => {
    if (selectedMedia) {
      const type = (selectedMedia as any).first_air_date ? 'tv' : 'movie';
      
      // Reset states
      setTrailerKey(null);
      setShowPlayer(false);
      setIsMuted(true);
      setLogoUrl(null);

      const fetchExtraInfo = async () => {
        try {
          // 1. Fetch Recommendations (with Similar fallback)
          const recRes = await fetch(`${BASE_URL}/${type}/${(selectedMedia as any).id}/recommendations?api_key=${TMDB_API_KEY}`);
          const recData = await recRes.json();
          
          if (recData.results && recData.results.length > 0) {
            setSimilarContent(recData.results.filter((m: any) => m.backdrop_path || m.poster_path).slice(0, 12));
          } else {
            const simRes = await fetch(`${BASE_URL}/${type}/${(selectedMedia as any).id}/similar?api_key=${TMDB_API_KEY}`);
            const simData = await simRes.json();
            setSimilarContent(simData.results.filter((m: any) => m.backdrop_path || m.poster_path).slice(0, 12));
          }

          // 2. Fetch Trailers
          const videoRes = await fetch(`${BASE_URL}/${type}/${(selectedMedia as any).id}/videos?api_key=${TMDB_API_KEY}`);
          const videoData = await videoRes.json();
          const trailer = videoData.results.find((v: any) => v.type === "Trailer" && v.site === "YouTube") || videoData.results[0];
          if (trailer) setTrailerKey(trailer.key);

          // 3. Fetch Logo
          const imageRes = await fetch(`${BASE_URL}/${type}/${(selectedMedia as any).id}/images?api_key=${TMDB_API_KEY}&include_image_language=en,null`);
          const imageData = await imageRes.json();
          const logo = imageData.logos?.find((l: any) => l.file_path.endsWith('.png')) || imageData.logos?.[0];
          if (logo) setLogoUrl(`${IMAGE_BASE_URL}${logo.file_path}`);

        } catch (err) { console.error(err); }
      };
      fetchExtraInfo();
    }
  }, [selectedMedia]);

  // Handle Search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 2) {
        setIsSearching(true);
        try {
          const res = await fetch(`${BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}`);
          const data = await res.json();
          setSearchResults(data.results.filter((m: any) => m.backdrop_path || m.poster_path));
        } catch (err) { console.error(err); } finally { setIsSearching(false); }
      } else { setSearchResults([]); }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    if (bannerMovies.length === 0 || searchQuery) return;

    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => {
        const nextIndex = (prev + 1) % bannerMovies.length;
        setHeroMovie(bannerMovies[nextIndex]);
        return nextIndex;
      });
    }, 25000);

    return () => clearInterval(interval);
  }, [bannerMovies, searchQuery]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 0);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const getPlayerUrl = (media: any) => {
    const type = media.first_air_date ? 'tv' : 'movie';
    if (type === 'tv') return `https://www.vidking.net/embed/tv/${media.id}/1/1?color=e50914&autoPlay=true`;
    return `https://www.vidking.net/embed/movie/${media.id}?color=e50914&autoPlay=true`;
  };

  return (
    <div className={`min-h-screen bg-[#141414] text-white font-sans selection:bg-[#e50914] ${selectedMedia ? 'overflow-hidden' : ''}`}>
      {/* --- NAVBAR --- */}
      <nav className={`fixed top-0 w-full z-50 transition-colors duration-500 flex items-center justify-between px-4 md:px-12 py-4 ${isScrolled || searchQuery ? 'bg-[#141414]' : 'bg-gradient-to-b from-black/70 to-transparent'}`}>
        {/* Mobile Search Overlay */}
        <AnimatePresence>
          {showMobileSearch && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute inset-0 bg-[#141414] z-[60] flex items-center px-4 gap-3"
            >
              <ChevronLeft className="w-6 h-6 cursor-pointer" onClick={() => setShowMobileSearch(false)} />
              <div className="flex-1 relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                <input 
                  autoFocus
                  type="text"
                  placeholder="Search movies, shows..."
                  className="w-full bg-[#333] py-2 pl-10 pr-10 rounded-md text-sm focus:outline-none"
                  value={searchQuery === " " ? "" : searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {(searchQuery && searchQuery !== " ") && (
                  <X 
                    className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 opacity-50 cursor-pointer" 
                    onClick={() => setSearchQuery("")} 
                  />
                )}
              </div>
              <button onClick={() => { setShowMobileSearch(false); setSearchQuery(""); }} className="text-sm font-medium">Cancel</button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-10">
          <div 
            className="text-[#e50914] font-black text-2xl md:text-3xl cursor-pointer tracking-tighter"
            onClick={() => { setActivePage('home'); setSearchQuery(""); window.scrollTo(0, 0); }}
          >
            NETSTREAM
          </div>
          <ul className="hidden lg:flex items-center gap-5 text-sm font-light">
            {['home', 'tv', 'movies', 'latest'].map(id => (
              <li key={id} onClick={() => { setActivePage(id); setSearchQuery(""); }} className={`cursor-pointer transition-colors hover:text-gray-300 capitalize ${activePage === id && !searchQuery ? 'font-semibold text-white' : 'text-gray-300'}`}>
                {id === 'latest' ? 'New & Popular' : id === 'tv' ? 'TV Shows' : id}
              </li>
            ))}
          </ul>
        </div>
        <div className="hidden md:flex items-center gap-5">
          <div className="relative flex items-center">
            <Search className="w-5 h-5 absolute left-2 opacity-60" />
            <input 
              type="text" 
              placeholder="Titles, people, genres" 
              className={`bg-black/80 border border-white/40 pl-9 pr-8 py-1.5 text-sm focus:outline-none transition-all duration-300 rounded-sm ${searchQuery ? 'w-64 border-white' : 'w-10 focus:w-64 cursor-pointer'}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && <X className="w-4 h-4 absolute right-2 cursor-pointer" onClick={() => setSearchQuery("")} />}
          </div>
          <Bell className="w-5 h-5 cursor-pointer hidden sm:block" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png" alt="Avatar" className="w-8 h-8 rounded cursor-pointer" />
        </div>
      </nav>

      {/* --- BOTTOM NAV (MOBILE ONLY) --- */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-black/95 backdrop-blur-md border-t border-white/10 px-6 py-2 pb-6 flex items-center justify-between shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
        <button 
          onClick={() => { setActivePage('home'); setSearchQuery(""); window.scrollTo(0, 0); }}
          className={`flex flex-col items-center gap-1 transition-colors ${activePage === 'home' && !searchQuery ? 'text-white' : 'text-gray-500'}`}
        >
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-medium">Home</span>
        </button>
        <button 
          onClick={() => {
            setShowMobileSearch(true);
            if (!searchQuery) setSearchQuery(" "); // Trigger search view
            window.scrollTo(0, 0);
          }}
          className={`flex flex-col items-center gap-1 transition-colors ${searchQuery ? 'text-white' : 'text-gray-500'}`}
        >
          <div className="relative">
            <Search className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-medium">Search</span>
        </button>
        <button 
          className="flex flex-col items-center gap-1 text-gray-500"
        >
          <User className="w-6 h-6" />
          <span className="text-[10px] font-medium">Profile</span>
        </button>
      </div>

      {searchQuery ? (
        <div className="pt-24 px-4 md:px-12 pb-32 min-h-screen bg-[#141414]">
          <div className="max-w-[1600px] mx-auto">
            <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
              <h2 className="text-gray-400 font-medium text-sm md:text-lg flex items-center gap-2">
                Explore titles related to: <span className="text-white font-bold text-lg md:text-2xl">{searchQuery}</span>
              </h2>
              <p className="text-gray-500 text-xs hidden md:block">{searchResults.length} matches found</p>
            </div>
            
            {isSearching ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-red-600" />
                <p className="text-gray-500 animate-pulse">Searching for yours favorites...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4">
                {searchResults.map((movie: any, idx: number) => (
                  <div 
                    key={movie.id} 
                    onClick={() => setSelectedMedia(movie)} 
                    className="group cursor-pointer transition-all duration-500 hover:scale-110 hover:z-20 active:scale-95"
                  >
                    <div className="relative overflow-hidden rounded-md shadow-lg aspect-[2/3] bg-zinc-900">
                      <img 
                        src={`${IMAGE_BASE_URL}${movie.poster_path || movie.backdrop_path}`} 
                        className="w-full h-full object-cover transition-all duration-700 group-hover:brightness-110 group-hover:scale-110"
                        alt={movie.title || movie.name} 
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 md:p-3">
                         <PlayCircle className="w-6 h-6 md:w-8 md:h-8 text-white transition-transform group-hover:scale-110 shadow-xl" />
                      </div>
                    </div>
                    <p className="text-[9px] md:text-[11px] mt-2 font-medium truncate text-gray-400 group-hover:text-white transition-colors">{movie.title || movie.name}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <Search className="w-16 h-16 text-gray-700 mb-6" />
                <h3 className="text-xl md:text-2xl font-bold mb-2">No matches found for "{searchQuery}"</h3>
                <p className="text-gray-500 max-w-md">Try checking your spelling or search for different keywords like a director, genre, or actor.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="relative h-[70vh] md:h-[85vh] w-full overflow-hidden">
          <AnimatePresence mode="wait">
            {heroMovie && (
              <motion.section 
                key={(heroMovie as any).id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
                className="absolute inset-0 w-full h-full"
              >
                <div className="absolute inset-0">
                  <img src={`${IMAGE_BASE_URL}${(heroMovie as any).backdrop_path}`} alt={(heroMovie as any).title || (heroMovie as any).name} className="w-full h-full object-cover brightness-[0.7] object-top" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/20 to-transparent"></div>
                </div>
                <div className="absolute bottom-[15%] md:top-[35%] left-4 md:left-12 right-4 max-w-sm md:max-w-md flex flex-col gap-2 md:gap-3">
                  <h1 className="text-2xl md:text-4xl font-black drop-shadow-2xl uppercase tracking-tighter leading-tight">{(heroMovie as any).title || (heroMovie as any).name}</h1>
                  <p className="text-[10px] md:text-base text-gray-200 line-clamp-2 md:line-clamp-3 font-medium drop-shadow-md">{(heroMovie as any).overview}</p>
                  <div className="flex items-center gap-2 md:gap-3 mt-1 md:mt-2">
                    <button onClick={() => setSelectedMedia(heroMovie)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-black px-4 md:px-8 py-2 md:py-3 rounded font-bold hover:bg-white/80 transition text-sm md:text-base"><Play className="w-4 h-4 md:w-6 md:h-6 fill-black" /> Play</button>
                    <button onClick={() => setSelectedMedia(heroMovie)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gray-500/50 text-white px-4 md:px-8 py-2 md:py-3 rounded font-bold hover:bg-gray-500/40 transition backdrop-blur-md text-sm md:text-base"><Info className="w-4 h-4 md:w-6 md:h-6" /> More Info</button>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
        <main className="relative z-10 -mt-2 md:-mt-10 pb-32 px-4 md:px-12 space-y-8 md:space-y-12">
            {rows.map((row: any, i) => <MovieRow key={i} title={row.title} movies={row.movies} onSelect={setSelectedMedia} />)}
        </main>
      </>
    )}

      {/* --- ENHANCED DETAILS MODAL --- */}
      {selectedMedia && (
        <div ref={modalRef} className="fixed inset-0 z-[100] flex justify-center overflow-y-auto bg-black/95 backdrop-blur-sm scrollbar-hide md:py-6 px-0 md:px-6">
          <div className="absolute inset-0" onClick={() => setSelectedMedia(null)}></div>
          
          <div className="relative w-full max-w-[1200px] lg:max-w-[1400px] bg-[#181818] md:rounded-xl overflow-hidden shadow-2xl h-fit mb-10 animate-in zoom-in-95 duration-300">
            <button onClick={() => setSelectedMedia(null)} className="absolute top-4 right-4 z-[120] p-2 bg-black/60 hover:bg-black/90 rounded-full text-white transition"><X className="w-5 h-5 md:w-6 md:h-6" /></button>

            {/* Modal Header / Visual */}
            <div className="relative aspect-video w-full bg-black">
              {showPlayer ? (
                <iframe src={getPlayerUrl(selectedMedia)} className="w-full h-full border-none" allowFullScreen title="Player"></iframe>
              ) : (
                <div className="relative w-full h-full overflow-hidden">
                  {trailerKey ? (
                    <div className="absolute inset-0 w-full h-full">
                      <iframe 
                        src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&modestbranding=1&rel=0&iv_load_policy=3&loop=1&playlist=${trailerKey}&enablejsapi=1`}
                        className="w-full h-[115%] -translate-y-[7.5%] scale-[1.12]"
                        allow="autoplay; encrypted-media; picture-in-picture"
                        title="Trailer"
                      />
                    </div>
                  ) : (
                    <img src={`${IMAGE_BASE_URL}${(selectedMedia as any).backdrop_path}`} className="w-full h-full object-cover brightness-75" alt="Backdrop" />
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-transparent"></div>
                  
                  <div className="absolute bottom-4 md:bottom-10 left-4 md:left-10 right-4 md:right-10 flex flex-col gap-4 md:gap-6">
                    {logoUrl ? (
                      <div className="max-w-[200px] md:max-w-[320px] mb-2 drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)]">
                        <img src={logoUrl} alt="Logo" className="w-full h-auto object-contain" />
                      </div>
                    ) : (
                      <h2 className="text-2xl md:text-5xl font-bold max-w-lg drop-shadow-lg leading-tight uppercase font-black uppercase tracking-tighter">{(selectedMedia as any).title || (selectedMedia as any).name}</h2>
                    )}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 md:gap-3">
                          <button onClick={() => setShowPlayer(true)} className="flex items-center gap-2 bg-white text-black px-4 md:px-8 py-2 md:py-2.5 rounded-md font-bold hover:bg-gray-200 transition text-sm md:text-base">
                            <Play className="w-4 h-4 md:w-5 md:h-5 fill-black" /> Play Now
                          </button>
                          <button className="p-2 border-2 border-gray-500 rounded-full hover:border-white transition"><Plus className="w-4 h-4 md:w-5 md:h-5" /></button>
                          <button className="p-2 border-2 border-gray-500 rounded-full hover:border-white transition"><ThumbsUp className="w-4 h-4 md:w-5 md:h-5" /></button>
                        </div>
                        {trailerKey && (
                            <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsMuted(!isMuted);
                                }}
                                className="p-2 border border-gray-500 rounded-full hover:bg-white/10 transition-colors z-[130]"
                            >
                                {isMuted ? <VolumeX className="w-4 h-4 md:w-5 md:h-5" /> : <Volume2 className="w-4 h-4 md:w-5 md:h-5" />}
                            </button>
                        )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Content */}
            <div className="p-4 md:p-10 bg-[#181818]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                <div className="md:col-span-2 space-y-4 md:space-y-6">
                  <div className="flex items-center gap-3 text-green-500 font-bold text-sm md:text-base">
                    <span>{Math.round((selectedMedia as any).vote_average * 10)}% Match</span>
                    <span className="text-gray-400 font-normal">{(selectedMedia as any).release_date?.split('-')[0] || (selectedMedia as any).first_air_date?.split('-')[0]}</span>
                    <span className="px-1.5 py-0 border border-gray-500 text-[10px] text-gray-400 rounded">16+</span>
                    <span className="text-gray-400 font-normal">HD</span>
                  </div>
                  <p className="text-sm md:text-lg leading-relaxed text-gray-200">{(selectedMedia as any).overview}</p>
                </div>
                
                <div className="space-y-2 md:space-y-4 text-xs md:text-sm pt-4 md:pt-0 border-t md:border-t-0 border-gray-700">
                  <p><span className="text-gray-500">Language:</span> {(selectedMedia as any).original_language?.toUpperCase()}</p>
                  <p><span className="text-gray-500">Popularity:</span> {Math.round((selectedMedia as any).popularity)} pts</p>
                  <p><span className="text-gray-500">Status:</span> {(selectedMedia as any).first_air_date ? 'Series' : 'Movie'}</p>
                </div>
              </div>

              {/* More Like This Section */}
              {similarContent.length > 0 && (
                <div className="mt-8 md:mt-12 space-y-4">
                    <h3 className="text-lg md:text-xl font-bold">More Like This</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                    {similarContent.map((movie: any) => (
                        <div key={movie.id} onClick={() => { setSelectedMedia(movie); }} className="bg-[#2f2f2f] rounded-md overflow-hidden cursor-pointer hover:bg-[#3f3f3f] transition group active:scale-95">
                        <div className="relative aspect-video">
                            <img src={`${IMAGE_BASE_URL}${movie.backdrop_path || movie.poster_path}`} className="w-full h-full object-cover" alt={movie.title || movie.name} />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <PlayCircle className="w-8 h-8 md:w-10 md:h-10" />
                            </div>
                        </div>
                        <div className="p-3 md:p-4 space-y-1 md:space-y-2">
                            <div className="flex justify-between items-center">
                            <span className="text-green-500 text-[10px] md:text-xs font-bold">{Math.round(movie.vote_average * 10)}% Match</span>
                            <div className="p-1 border border-gray-500 rounded-full"><Plus className="w-3 h-3" /></div>
                            </div>
                            <p className="text-[10px] md:text-xs text-gray-400 line-clamp-2 leading-tight">{movie.title || movie.name}</p>
                        </div>
                        </div>
                    ))}
                    </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      <footer className="px-4 md:px-12 py-20 pb-32 md:pb-20 bg-[#141414] text-gray-500 text-xs text-center border-t border-white/10">
        <p>© 1997-2024 NetStream • Powered by Vidking & TMDB</p>
      </footer>
    </div>
  );
}

function MovieRow({ title, movies, onSelect }: { title: string, movies: any[], onSelect: (m: any) => void, key?: any }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      rowRef.current.scrollTo({ left: dir === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth, behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-2 group">
      <h2 className="text-lg md:text-xl font-bold hover:text-gray-300 transition cursor-pointer inline-flex items-center gap-2 group/title">{title} <ChevronRight className="w-4 h-4 opacity-0 group-hover/title:opacity-100 transition-opacity" /></h2>
      <div className="relative group/row">
        <button onClick={() => scroll('left')} className="absolute left-0 top-0 bottom-0 z-40 bg-black/50 w-12 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-black/70"><ChevronLeft className="w-8 h-8" /></button>
        <div ref={rowRef} className="flex gap-2 overflow-x-auto no-scrollbar py-4 scroll-smooth snap-x snap-mandatory overscroll-x-contain scroll-pl-4 md:scroll-pl-12">
          {movies.map((movie, idx) => (
            <div key={idx} onClick={() => onSelect(movie)} className="relative min-w-[160px] md:min-w-[240px] h-[90px] md:h-[135px] cursor-pointer transition-transform duration-300 hover:scale-110 hover:z-30 group/item snap-start">
              <img src={`${IMAGE_BASE_URL}${movie.backdrop_path || movie.poster_path}`} className="w-full h-full object-cover rounded-sm shadow-md" alt={movie.title || movie.name} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity flex flex-col justify-end p-3">
                <h4 className="text-[10px] md:text-xs font-bold truncate">{movie.title || movie.name}</h4>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => scroll('right')} className="absolute right-0 top-0 bottom-0 z-40 bg-black/50 w-12 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-black/70"><ChevronRight className="w-8 h-8" /></button>
      </div>
      <style dangerouslySetInnerHTML={{__html: `.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}} />
    </div>
  );
}
