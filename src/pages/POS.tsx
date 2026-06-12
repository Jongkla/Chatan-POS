import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { LogOut, LayoutDashboard, ShoppingCart, Search, Moon, Sun, Monitor, Store, Plus, X, Trash2, ScanLine } from "lucide-react";
import { useStore } from "../store";
import { getProducts, submitTransaction, addProduct, deleteProduct, Product, CartItem } from "../lib/api";
import BarcodeScanner from "../components/BarcodeScanner";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";

const CATEGORIES = ["All", "Grocery", "Vegetables", "Bananacue", "Other"];

export default function POS() {
  const user = useStore((state) => state.user);
  const setUser = useStore((state) => state.setUser);
  const theme = useStore((state) => state.theme);
  const toggleTheme = useStore((state) => state.toggleTheme);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [activeCategory, setActiveCategory] = useState("All");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [addCat, setAddCat] = useState("Grocery");
  const [addBarcode, setAddBarcode] = useState("");

  const [viewMode, setViewMode] = useState<"grid" | "scan">("grid");

  const [isChangeOpen, setIsChangeOpen] = useState(false);
  const [cashReceived, setCashReceived] = useState("");
  const [isExactConfirmOpen, setIsExactConfirmOpen] = useState(false);

  const loadData = () => {
    setLoading(true);
    getProducts().then(data => {
      setProducts(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    const q = query(collection(db, "products"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Product[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(data);
      setLoading(false);
    }, (error) => {
      console.error("Firestore realtime error", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName || !addPrice) return;
    try {
      await addProduct({ name: addName, price: parseFloat(addPrice), category: addCat, barcode: addBarcode || undefined });
      setAddName(""); setAddPrice(""); setAddBarcode("");
      setIsAddOpen(false);
    } catch(err) {
      alert("Failed to add product");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if(!confirm("Delete this item?")) return;
    try {
      await deleteProduct(id);
    } catch(err) {
      alert("Failed to delete product");
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const newQ = i.quantity + delta;
        return newQ > 0 ? { ...i, quantity: newQ } : i;
      }
      return i;
    }));
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0 || !user) return;
    try {
      await submitTransaction(user.id, cart, total);
      setCart([]);
      setIsExactConfirmOpen(false);
      alert("Transaction successful!");
    } catch (err) {
      alert("Failed to checkout");
    }
  };

  const handleScan = (scannedBarcode: string) => {
    const product = products.find(p => p.barcode === scannedBarcode);
    if (product) {
      addToCart(product);
    } else {
        const wantToAdd = window.confirm(`Barcode not found: ${scannedBarcode}. Add it to database?`);
        if (wantToAdd) {
          setViewMode("grid");
          setAddBarcode(scannedBarcode);
          setIsAddOpen(true);
        }
    }
  };

  const handleCashCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    const received = parseFloat(cashReceived);
    if(received < total) {
      alert("Insufficient cash received.");
      return;
    }
    const change = received - total;
    if (cart.length === 0 || !user) return;
    try {
      await submitTransaction(user.id, cart, total);
      setCart([]);
      setIsChangeOpen(false);
      setCashReceived("");
      alert(`Transaction successful! Change: ₱${change.toFixed(2)}`);
    } catch (err) {
      alert("Failed to checkout");
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = activeCategory === "All" || p.category === activeCategory || (!p.category && activeCategory === "Other");
    return matchesSearch && matchesCat;
  });

  return (
    <div className="flex portrait:flex-col landscape:flex-row h-[100dvh] w-full overflow-hidden bg-slate-950">
      
      {/* Left Area - Navbar + Products */}
      <div className="flex-1 flex flex-col min-h-0 bg-slate-100 dark:bg-slate-900 portrait:border-b landscape:border-r border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <header className="px-4 md:px-6 py-3 md:py-4 bg-white dark:bg-slate-800 flex items-center justify-between shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-primary-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary-500/20">
              <Store size={18} />
            </div>
            <div>
              <h2 className="font-bold text-base md:text-lg leading-tight text-slate-900 dark:text-white">Chatan Store</h2>
              <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 text-ellipsis overflow-hidden whitespace-nowrap max-w-[100px] md:max-w-none">{user?.name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 md:gap-3">
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition">
              {theme === "dark" ? <Sun size={18} className="text-slate-400" /> : <Moon size={18} className="text-slate-600" />}
            </button>
            {user?.role === "admin" && (
               <Link to="/admin" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition" title="Admin Dashboard">
                 <LayoutDashboard size={18} className="text-slate-600 dark:text-slate-400" />
               </Link>
            )}
            <button onClick={() => setUser(null)} className="p-2 rounded-full hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/30 transition text-slate-600 dark:text-slate-300">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        {viewMode === "scan" ? (
          <div className="flex-1 overflow-y-auto flex flex-col min-h-0 bg-slate-100 dark:bg-slate-900">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
              <h2 className="font-bold uppercase tracking-widest text-slate-500 text-sm">Scan Item</h2>
              <button 
                onClick={() => setViewMode("grid")}
                className="py-2 px-4 bg-slate-800 dark:bg-slate-700 text-white rounded-xl text-xs font-bold transition hover:bg-slate-700 dark:hover:bg-slate-600 shadow-md flex items-center gap-2"
              >
                Back to Grid
              </button>
            </div>
            <BarcodeScanner onScan={handleScan} />
          </div>
        ) : (
        <div className="p-3 md:p-6 flex-1 overflow-y-auto flex flex-col min-h-0">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-4 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search items..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow text-slate-900 dark:text-white text-sm"
              />
            </div>
            <div className="flex gap-2 shrink-0">
              <button 
                onClick={() => setViewMode("scan")}
                className="flex items-center justify-center gap-1.5 py-2 md:py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] md:text-sm font-bold uppercase tracking-widest transition shadow-lg shadow-indigo-500/20"
              >
                <ScanLine size={14} className="md:w-4 md:h-4 w-3.5 h-3.5" /> <span className="hidden md:inline">Scan</span>
              </button>
              <button 
                onClick={() => setIsAddOpen(true)}
                className="flex items-center justify-center gap-1.5 py-2 md:py-2.5 px-3 md:px-4 bg-slate-800 dark:bg-slate-700 text-white rounded-xl text-[10px] md:text-sm font-bold uppercase tracking-widest hover:bg-slate-700 dark:hover:bg-slate-600 transition"
              >
                <Plus size={14} className="md:w-4 md:h-4 w-3.5 h-3.5" /> <span className="hidden md:inline">Add</span>
              </button>
            </div>
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-2 md:mb-4 shrink-0 hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest transition-colors ${activeCategory === cat ? "bg-primary-500 text-white shadow-md shadow-primary-500/20" : "bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"}`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 portrait:grid-cols-2 landscape:grid-cols-3 xl:grid-cols-4 gap-3 pb-4">
            {loading ? (
              <p className="col-span-full text-center py-10 text-slate-500 text-sm">Loading...</p>
            ) : filteredProducts.length === 0 ? (
              <p className="col-span-full text-center py-10 text-slate-500 text-sm">No items found.</p>
            ) : (
              filteredProducts.map(p => (
                <button 
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="bg-white dark:bg-slate-800 p-3 md:p-4 rounded-xl shadow-sm text-left hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-primary-500 border border-transparent dark:border-slate-700 active:scale-95 flex flex-col justify-between group relative"
                >
                  <div className="flex justify-between items-start gap-1 w-full">
                    <p className="font-medium text-slate-900 dark:text-slate-100 text-xs md:text-sm leading-snug break-words pr-4">{p.name}</p>
                    <div 
                      onClick={(e) => { e.stopPropagation(); handleDeleteProduct(p.id); }}
                      className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                    >
                      <Trash2 size={12} />
                    </div>
                  </div>
                  <div className="mt-2 text-primary-600 dark:text-primary-400 font-black text-sm md:text-base">
                    ₱{p.price.toFixed(2)}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
        )}
      </div>

      {/* Right Area - Cart */}
      <div className="w-full landscape:w-[360px] shrink-0 portrait:h-[45dvh] landscape:h-full bg-white dark:bg-slate-800 flex flex-col portrait:border-t landscape:border-t-0 landscape:border-l border-slate-200 dark:border-slate-800 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] landscape:shadow-none z-20">
        <div className="p-3 md:p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0 bg-white dark:bg-slate-800">
          <h2 className="font-bold flex items-center gap-2 text-sm uppercase tracking-widest text-slate-500">
            <ShoppingCart size={16} /> Current Order
          </h2>
          <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest">{totalItems} Items</span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 md:p-5 bg-slate-50/50 dark:bg-slate-900/30">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 space-y-3">
              <ShoppingCart size={40} />
              <p className="text-xs uppercase tracking-widest font-bold">Cart is empty</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {cart.map(item => (
                <div key={item.id} className="flex flex-col bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-lg p-1.5 relative shadow-sm">
                  <button onClick={() => removeFromCart(item.id)} className="absolute top-1 right-1 p-0.5 text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 size={10} />
                  </button>
                  <div className="pr-4 truncate w-full">
                    <span className="font-bold text-slate-900 dark:text-white text-[10px]">{item.name}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="font-black text-primary-600 dark:text-primary-400 text-[10px]">₱{(item.price * item.quantity).toFixed(2)}</span>
                    <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded shadow-inner">
                      <button onClick={() => updateQuantity(item.id, -1)} className="text-slate-500 hover:text-primary-500 hover:bg-slate-200 dark:hover:bg-slate-800 w-4 h-4 flex items-center justify-center rounded font-black leading-none -mt-0.5"><span className="text-xs">-</span></button>
                      <span className="w-3 text-center font-bold text-slate-900 dark:text-slate-100 text-[9px]">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="text-slate-500 hover:text-primary-500 hover:bg-slate-200 dark:hover:bg-slate-800 w-4 h-4 flex items-center justify-center rounded font-black leading-none -mt-0.5"><span className="text-xs">+</span></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 md:p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 shrink-0">
          <div className="space-y-1 mb-3 md:mb-4 flex items-center justify-between">
            <span className="block text-[10px] md:text-xs uppercase tracking-widest font-bold text-slate-400">Total</span>
            <span className="text-primary-600 dark:text-primary-400 text-xl md:text-2xl font-black">₱{total.toFixed(2)}</span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsExactConfirmOpen(true)}
              disabled={cart.length === 0}
              className="flex-[1] py-2.5 md:py-3.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl font-bold transition-all disabled:opacity-50 text-[10px] md:text-xs uppercase tracking-widest active:scale-95"
            >
              Exact
            </button>
            <button 
              onClick={() => setIsChangeOpen(true)}
              disabled={cart.length === 0}
              className="flex-[2] py-2.5 md:py-3.5 bg-gradient-to-br from-primary-600 to-indigo-700 hover:from-primary-500 hover:to-indigo-600 text-white rounded-xl font-black transition-all disabled:opacity-50 text-[11px] md:text-sm uppercase tracking-widest shadow-xl shadow-primary-500/20 active:scale-95"
            >
              Cash Payment
            </button>
          </div>
        </div>
      </div>

      {/* Add Item Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm shadow-2xl">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-widest text-[11px]">Add New Item</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-200 dark:bg-slate-700 rounded-full p-1 transition-colors">
                <X size={14} />
              </button>
            </div>
            <form onSubmit={handleAddProduct} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Item Name</label>
                <input type="text" required value={addName} onChange={e => setAddName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm text-slate-900 dark:text-white font-medium placeholder-slate-400" placeholder="e.g. Pancit Canton" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Price (₱)</label>
                <input type="number" step="0.01" required value={addPrice} onChange={e => setAddPrice(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm text-slate-900 dark:text-white font-medium placeholder-slate-400" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Category</label>
                <select value={addCat} onChange={e => setAddCat(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm text-slate-900 dark:text-white font-medium appearance-none">
                  {CATEGORIES.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Barcode (Optional)</label>
                <input type="text" value={addBarcode} onChange={e => setAddBarcode(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm text-slate-900 dark:text-white font-medium placeholder-slate-400" placeholder="e.g. 123456789" />
              </div>
              <button type="submit" className="mt-4 w-full py-3.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-colors shadow-lg shadow-primary-500/20 active:scale-95">
                Save Item
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Cash Payment Modal */}
      {isChangeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm shadow-2xl">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-widest text-[11px]">Cash Payment</h3>
              <button onClick={() => { setIsChangeOpen(false); setCashReceived(""); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-200 dark:bg-slate-700 rounded-full p-1 transition-colors">
                <X size={14} />
              </button>
            </div>
            
            <form onSubmit={handleCashCheckout} className="p-5 flex flex-col gap-4">
              <div className="flex justify-between items-center mb-2 px-2 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500 px-2">Total Due</span>
                <span className="text-lg font-black text-rose-500 pr-2">₱{total.toFixed(2)}</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Cash Received (₱)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  required 
                  autoFocus
                  value={cashReceived} 
                  onChange={e => setCashReceived(e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm text-slate-900 dark:text-white font-medium placeholder-slate-400" 
                  placeholder="0.00" 
                />
              </div>

              {cashReceived && parseFloat(cashReceived) >= total && (
                <div className="mt-2 flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-500 text-[10px] uppercase tracking-widest">Change</span>
                  <span className="text-primary-500 text-lg">₱{(parseFloat(cashReceived) - total).toFixed(2)}</span>
                </div>
              )}

              <button 
                type="submit" 
                disabled={!cashReceived || parseFloat(cashReceived) < total}
                className="mt-4 w-full py-3.5 bg-gradient-to-br from-primary-600 to-indigo-700 hover:from-primary-500 hover:to-indigo-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-colors shadow-lg shadow-primary-500/20 active:scale-95 disabled:opacity-50"
              >
                Complete Transaction
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Exact Payment Modal */}
      {isExactConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm shadow-2xl">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-widest text-[11px]">Confirm Exact Payment</h3>
              <button onClick={() => setIsExactConfirmOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-200 dark:bg-slate-700 rounded-full p-1 transition-colors">
                <X size={14} />
              </button>
            </div>
            
            <div className="p-5 flex flex-col gap-4">
              <div className="text-center mb-2">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Confirm exact payment of</p>
                <span className="text-2xl font-black text-primary-500">₱{total.toFixed(2)}</span>
              </div>

              <div className="flex gap-2 mt-2">
                <button 
                  onClick={() => setIsExactConfirmOpen(false)}
                  className="flex-1 py-3 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCheckout}
                  className="flex-1 py-3 bg-gradient-to-br from-primary-600 to-indigo-700 hover:from-primary-500 hover:to-indigo-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-colors shadow-lg shadow-primary-500/20 active:scale-95"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
