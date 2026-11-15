import React, { useMemo, useState } from 'react';
import {
  ShoppingBag,
  ShoppingCart,
  Search,
  CheckCircle2,
  Trash2,
  Plus,
  Minus,
  Sparkles,
  History,
  X,
  ArrowUpDown,
  Users,
  Share2,
} from 'lucide-react';
import { CATEGORIES, PRODUCT_MAP, PRODUCTS } from '../data/products';
import {
  BasketItem,
  FireworkProduct,
  ProductCategory,
  PurchaseRecord,
  RemotePlayerState,
} from '../types';
import { ProductPreviewGraphic } from './ProductPreviewGraphic';
import { soundEngine } from '../engine/audio';

interface ShopModalProps {
  money: number;
  infiniteMoney: boolean;
  basket: BasketItem[];
  purchaseHistory: PurchaseRecord[];
  initialProductId?: string | null;
  initialTab?: 'catalog' | 'basket' | 'history';
  inMultiplayer?: boolean;
  playersInShop?: RemotePlayerState[];
  onAddToBasket: (productId: string, qty?: number) => void;
  onRemoveFromBasket: (productId: string, qty?: number) => void;
  onClearBasket: () => void;
  onPurchaseBasket: () => { ok: boolean; error?: string };
  onBuyInstant: (productId: string, qty?: number) => { ok: boolean; error?: string };
  onPreviewEffect?: (productId: string) => void;
  onShowcaseProduct?: (product: FireworkProduct) => void;
  onClose: () => void;
}

type SortOption = 'category' | 'price_asc' | 'price_desc' | 'shots_desc' | 'name_asc';
type AttributeFilter = 'all' | 'premium' | 'multicolor' | 'gold' | 'crackling' | 'smoke_ground';

export const ShopModal: React.FC<ShopModalProps> = ({
  money,
  infiniteMoney,
  basket,
  purchaseHistory,
  initialProductId = null,
  initialTab = 'catalog',
  inMultiplayer = false,
  playersInShop = [],
  onAddToBasket,
  onRemoveFromBasket,
  onClearBasket,
  onPurchaseBasket,
  onBuyInstant,
  onPreviewEffect,
  onShowcaseProduct,
  onClose,
}) => {
  const [tab, setTab] = useState<'catalog' | 'basket' | 'history'>(initialTab);
  const [selectedCategory, setSelectedCategory] = useState<'All' | ProductCategory>('All');
  const [attrFilter, setAttrFilter] = useState<AttributeFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('category');
  const [search, setSearch] = useState('');
  const [inspectedId, setInspectedId] = useState<string | null>(initialProductId || PRODUCTS[0].id);
  const [buyQty, setBuyQty] = useState<1 | 5 | 10>(1);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = PRODUCTS.filter((p) => {
      if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
      if (attrFilter === 'premium' && p.tier !== 'premium') return false;
      if (attrFilter === 'multicolor' && p.effect.style !== 'multi_color' && p.effect.colors.length < 3) return false;
      if (
        attrFilter === 'gold' &&
        !['golden_willow', 'golden_kamuro', 'brocade_crown', 'fountain_gold'].includes(p.effect.style)
      ) {
        return false;
      }
      if (attrFilter === 'crackling' && !p.effect.hasCrackle && p.effect.style !== 'crackling') return false;
      if (attrFilter === 'smoke_ground' && !p.effect.isSmoke && !p.effect.isSpinner && !p.effect.isFountain) {
        return false;
      }
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.effect.style.toLowerCase().includes(q)
      );
    });

    if (sortBy === 'price_asc') return [...list].sort((a, b) => a.price - b.price);
    if (sortBy === 'price_desc') return [...list].sort((a, b) => b.price - a.price);
    if (sortBy === 'shots_desc') return [...list].sort((a, b) => b.shots - a.shots);
    if (sortBy === 'name_asc') return [...list].sort((a, b) => a.name.localeCompare(b.name, 'nl'));
    return list;
  }, [selectedCategory, attrFilter, sortBy, search]);

  const inspectedProduct: FireworkProduct | undefined = inspectedId
    ? PRODUCT_MAP.get(inspectedId)
    : filteredProducts[0];

  const basketCount = basket.reduce((acc, b) => acc + b.quantity, 0);
  const basketTotal = basket.reduce((acc, b) => {
    const p = PRODUCT_MAP.get(b.productId);
    return acc + (p ? p.price * b.quantity : 0);
  }, 0);

  const handleCheckout = () => {
    const res = onPurchaseBasket();
    if (res.ok) {
      soundEngine.playCashRegister();
      setFeedback({ type: 'ok', text: 'Aankoop voltooid! Producten toegevoegd aan je inventaris.' });
    } else {
      setFeedback({ type: 'err', text: res.error || 'Afrekenen mislukt.' });
    }
  };

  const handleInstantBuy = (pid: string, qty = 1) => {
    const res = onBuyInstant(pid, qty);
    if (res.ok) {
      soundEngine.playCashRegister();
      setFeedback({ type: 'ok', text: `${qty}× direct gekocht en aan inventaris toegevoegd!` });
    } else {
      setFeedback({ type: 'err', text: res.error || 'Onvoldoende saldo.' });
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#06080D]/85 p-3 md:p-5">
      <div className="w-full max-w-6xl h-[90vh] bg-[#10131C] border border-white/10 rounded-xl flex flex-col overflow-hidden shadow-2xl">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-white/10 bg-[#0B0E15]">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Vuurwerkpaleis De Gouden Pijl
            </h2>
            <p className="text-xs text-slate-400">
              {PRODUCTS.length} originele Nederlandse vuurwerkproducten · Saldo:{' '}
              <span className="text-amber-400 font-mono-tabular font-semibold">
                {infiniteMoney ? '€∞ · ONBEPERKT GELD' : `€${money.toFixed(2)}`}
              </span>
            </p>
            {inMultiplayer && playersInShop.length > 0 && (
              <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-[11px] text-sky-300">
                <Users className="w-3.5 h-3.5" />
                <span>
                  Ook in de winkel: {playersInShop.map((p) => p.name).join(', ')}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                soundEngine.playUiClick();
                setTab('catalog');
              }}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
                tab === 'catalog'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              Catalogus ({PRODUCTS.length})
            </button>
            <button
              onClick={() => {
                soundEngine.playUiClick();
                setTab('basket');
              }}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
                tab === 'basket'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              Winkelmand ({basketCount})
            </button>
            <button
              onClick={() => {
                soundEngine.playUiClick();
                setTab('history');
              }}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
                tab === 'history'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <History className="w-4 h-4" />
              Bonnetjes ({purchaseHistory.length})
            </button>
            <button
              onClick={() => {
                soundEngine.playUiClick();
                onClose();
              }}
              aria-label="Sluit winkel"
              className="ml-2 p-2 rounded-lg bg-white/5 text-slate-300 hover:bg-white/15 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={`px-6 py-2.5 text-sm flex items-center justify-between border-b border-white/10 ${
              feedback.type === 'ok'
                ? 'bg-emerald-950/60 text-emerald-300'
                : 'bg-red-950/60 text-red-300'
            }`}
          >
            <span>{feedback.text}</span>
            <button onClick={() => setFeedback(null)} className="text-xs underline">
              Sluiten
            </button>
          </div>
        )}

        {/* TAB 1: CATALOG + INSPECTOR */}
        {tab === 'catalog' && (
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12">
            {/* Left Catalog Grid */}
            <div className="lg:col-span-8 flex flex-col min-h-0 border-r border-white/10">
              {/* Filter, Sort & Search Bar */}
              <div className="p-4 border-b border-white/10 space-y-2.5 bg-[#0D1018]">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Zoek tussen 220+ artikelen (naam, merk, effect)..."
                      className="w-full bg-[#151A26] border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 bg-[#151A26] border border-white/10 rounded-lg px-2.5 py-1.5">
                    <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="bg-transparent text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="category" className="bg-[#10131C]">Sorteer: Categorie</option>
                      <option value="price_asc" className="bg-[#10131C]">Prijs: Laag → Hoog</option>
                      <option value="price_desc" className="bg-[#10131C]">Prijs: Hoog → Laag</option>
                      <option value="shots_desc" className="bg-[#10131C]">Schoten: Hoog → Laag</option>
                      <option value="name_asc" className="bg-[#10131C]">Naam: A–Z</option>
                    </select>
                  </div>
                </div>

                {/* Category Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <button
                    onClick={() => setSelectedCategory('All')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                      selectedCategory === 'All'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    Alle ({PRODUCTS.length})
                  </button>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                        selectedCategory === cat
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Attribute Filter Bar */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {(
                      [
                        ['all', 'Alle effecten'],
                        ['premium', 'Collector / Premium'],
                        ['gold', 'Goud & Kamuro'],
                        ['multicolor', 'Multi-Color'],
                        ['crackling', 'Crackling'],
                        ['smoke_ground', 'Rook & Grond'],
                      ] as [AttributeFilter, string][]
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setAttrFilter(key)}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-colors ${
                          attrFilter === key
                            ? 'bg-orange-500/25 text-orange-300 border border-orange-500/40'
                            : 'bg-white/5 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono-tabular">
                    {filteredProducts.length} getoond
                  </span>
                </div>
              </div>

              {/* Scrollable Product Grid */}
              <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
                {filteredProducts.map((p) => {
                  const isSelected = inspectedProduct?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        soundEngine.playUiClick();
                        setInspectedId(p.id);
                      }}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors flex items-center gap-3 ${
                        isSelected
                          ? 'bg-[#191F2E] border-amber-500/70'
                          : 'bg-[#131722] border-white/8 hover:border-white/20'
                      }`}
                    >
                      <ProductPreviewGraphic product={p} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <div className="text-sm font-semibold text-white truncate">{p.name}</div>
                        </div>
                        <div className="text-xs text-slate-400 truncate">
                          {p.brand} · {p.category}
                        </div>
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-amber-400 font-mono-tabular">
                            €{p.price.toFixed(2)}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                soundEngine.playPickup();
                                onAddToBasket(p.id, 1);
                                setFeedback({ type: 'ok', text: `${p.name} in winkelmand geplaatst.` });
                              }}
                              className="px-2 py-1 rounded bg-orange-500/20 hover:bg-orange-500 text-orange-300 hover:text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap"
                            >
                              +1 Mand
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                soundEngine.playPickup();
                                onAddToBasket(p.id, 5);
                                setFeedback({ type: 'ok', text: `5× ${p.name} in winkelmand geplaatst.` });
                              }}
                              className="px-2 py-1 rounded bg-white/8 hover:bg-amber-500 text-slate-300 hover:text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap"
                            >
                              +5
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Product Inspector */}
            <div className="lg:col-span-4 flex flex-col justify-between p-5 bg-[#0D1018] overflow-y-auto">
              {inspectedProduct ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <ProductPreviewGraphic product={inspectedProduct} size="lg" />
                    <div className="min-w-0">
                      <p className="text-xs text-amber-400 font-medium">
                        {inspectedProduct.brand} · {inspectedProduct.category}
                      </p>
                      <h3 className="text-xl font-bold text-white mt-0.5 leading-snug">
                        {inspectedProduct.name}
                      </h3>
                      <p className="text-2xl font-bold text-amber-400 font-mono-tabular mt-2">
                        €{inspectedProduct.price.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-300 leading-relaxed">
                    {inspectedProduct.description}
                  </p>

                  {/* Spec Table */}
                  <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/10 text-xs">
                    <div className="bg-[#141925] p-2.5 rounded-lg">
                      <span className="text-slate-400 block">Aantal schoten</span>
                      <span className="text-white font-semibold font-mono-tabular text-sm">
                        {inspectedProduct.shots} shots
                      </span>
                    </div>
                    <div className="bg-[#141925] p-2.5 rounded-lg">
                      <span className="text-slate-400 block">Kaliber</span>
                      <span className="text-white font-semibold font-mono-tabular text-sm">
                        {inspectedProduct.caliberMm} mm
                      </span>
                    </div>
                    <div className="bg-[#141925] p-2.5 rounded-lg">
                      <span className="text-slate-400 block">Tijdsduur</span>
                      <span className="text-white font-semibold font-mono-tabular text-sm">
                        ~{inspectedProduct.durationSec} sec
                      </span>
                    </div>
                    <div className="bg-[#141925] p-2.5 rounded-lg">
                      <span className="text-slate-400 block">Stijghoogte</span>
                      <span className="text-white font-semibold font-mono-tabular text-sm">
                        {inspectedProduct.effect.burstHeight} m
                      </span>
                    </div>
                  </div>

                  {/* Color Palette Swatches */}
                  <div className="pt-1">
                    <span className="text-xs text-slate-400 block mb-1.5">
                      Effectkleuren ({inspectedProduct.effect.style.replace(/_/g, ' ')})
                    </span>
                    <div className="flex items-center gap-2">
                      {inspectedProduct.effect.colors.map((c, i) => (
                        <span
                          key={c + i}
                          className="w-6 h-6 rounded border border-white/20"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-slate-400 text-sm">Selecteer een product om te inspecteren.</div>
              )}

              {inspectedProduct && (
                <div className="space-y-2.5 pt-4 border-t border-white/10 mt-4">
                  {/* Quantity Selector for Bulk Buying */}
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Aantal selecteren:</span>
                    <div className="flex items-center gap-1">
                      {([1, 5, 10] as const).map((q) => (
                        <button
                          key={q}
                          onClick={() => setBuyQty(q)}
                          className={`px-2.5 py-1 rounded font-mono-tabular font-bold ${
                            buyQty === q
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-[#151A26] text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {q}×
                        </button>
                      ))}
                    </div>
                  </div>

                  {onPreviewEffect && (
                    <button
                      onClick={() => {
                        soundEngine.unlock();
                        onPreviewEffect(inspectedProduct.id);
                      }}
                      className="w-full py-2 px-4 rounded-lg bg-white/8 hover:bg-white/15 text-slate-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Test effect op Afsteekzone
                    </button>
                  )}
                  {inMultiplayer && onShowcaseProduct && (
                    <button
                      onClick={() => {
                        soundEngine.playUiClick();
                        onShowcaseProduct(inspectedProduct);
                      }}
                      className="w-full py-2 px-4 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/35 text-sky-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      <Share2 className="w-4 h-4 text-sky-400" />
                      Toon aan Spelers
                    </button>
                  )}
                  <button
                    onClick={() => {
                      soundEngine.playPickup();
                      onAddToBasket(inspectedProduct.id, buyQty);
                      setFeedback({
                        type: 'ok',
                        text: `${buyQty}× ${inspectedProduct.name} toegevoegd aan winkelmand.`,
                      });
                    }}
                    className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold transition-colors"
                  >
                    Toevoegen aan Winkelmand ({buyQty}×)
                  </button>
                  <button
                    onClick={() => handleInstantBuy(inspectedProduct.id, buyQty)}
                    className="w-full py-2.5 px-4 rounded-lg bg-orange-600/25 hover:bg-orange-600/40 border border-orange-500/40 text-orange-200 text-sm font-semibold transition-colors"
                  >
                    Direct Kopen ({buyQty}× ·{' '}
                    {infiniteMoney ? '€∞' : `€${(inspectedProduct.price * buyQty).toFixed(2)}`})
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: BASKET & CHECKOUT */}
        {tab === 'basket' && (
          <div className="flex-1 min-h-0 flex flex-col p-6 overflow-y-auto">
            {basket.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 text-slate-400">
                <ShoppingCart className="w-12 h-12 text-slate-600" />
                <p className="text-base font-medium text-slate-300">Je winkelmand is leeg</p>
                <p className="text-xs max-w-sm">
                  Kies onbeperkt vuurwerk in de catalogus of loop door de schappen van het Vuurwerkpaleis.
                </p>
                <button
                  onClick={() => setTab('catalog')}
                  className="mt-2 px-4 py-2 rounded-lg bg-amber-500 text-slate-950 text-sm font-semibold"
                >
                  Naar Catalogus
                </button>
              </div>
            ) : (
              <div className="max-w-3xl w-full mx-auto space-y-4">
                {basket.map((item) => {
                  const prod = PRODUCT_MAP.get(item.productId);
                  if (!prod) return null;
                  return (
                    <div
                      key={item.productId}
                      className="flex items-center justify-between gap-4 p-3.5 rounded-lg bg-[#141925] border border-white/10"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <ProductPreviewGraphic product={prod} size="sm" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{prod.name}</div>
                          <div className="text-xs text-slate-400">
                            €{prod.price.toFixed(2)} per stuk · {prod.category}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1 bg-[#0B0E15] rounded-lg p-1 border border-white/10">
                          <button
                            onClick={() => onRemoveFromBasket(prod.id, 1)}
                            className="p-1 text-slate-300 hover:text-white"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm font-mono-tabular font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onAddToBasket(prod.id, 1)}
                            className="p-1 text-slate-300 hover:text-white"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="w-24 text-right text-sm font-bold text-amber-400 font-mono-tabular">
                          €{(prod.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}

                <div className="p-5 rounded-xl bg-[#0B0E15] border border-amber-500/30 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-slate-400">Totaalwaarde winkelmand</div>
                    <div className="text-2xl font-bold text-amber-400 font-mono-tabular">
                      €{basketTotal.toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Resterend saldo na aankoop:{' '}
                      {infiniteMoney ? (
                        <span className="font-mono-tabular font-semibold text-emerald-400">
                          €∞ (ONBEPERKT GELD)
                        </span>
                      ) : (
                        <span
                          className={`font-mono-tabular font-semibold ${
                            money - basketTotal >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          €{(money - basketTotal).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={onClearBasket}
                      className="px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Leegmand
                    </button>
                    <button
                      onClick={handleCheckout}
                      disabled={!infiniteMoney && basketTotal > money + 0.001}
                      className="px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-sm flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Afrekenen
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PURCHASE HISTORY */}
        {tab === 'history' && (
          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            {purchaseHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                Nog geen aankopen gedaan. Bezoek de catalogus om vuurwerk te kopen!
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-3">
                {purchaseHistory.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-4 rounded-lg bg-[#141925] border border-white/10 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400 border-b border-white/8 pb-2">
                      <span>Bon #{rec.id.slice(-6)} · {new Date(rec.timestamp).toLocaleString('nl-NL')}</span>
                      <span className="text-amber-400 font-bold font-mono-tabular text-sm">
                        €{rec.total.toFixed(2)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {rec.items.map((it) => (
                        <div key={it.productId} className="flex justify-between text-xs text-slate-200">
                          <span>
                            {it.quantity}× {it.name}
                          </span>
                          <span className="font-mono-tabular text-slate-400">
                            €{(it.unitPrice * it.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
