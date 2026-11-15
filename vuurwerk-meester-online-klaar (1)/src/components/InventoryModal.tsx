import React, { useMemo, useState } from 'react';
import { Backpack, Flame, Hand, PackageMinus, Search, X } from 'lucide-react';
import { PRODUCT_MAP } from '../data/products';
import { InventoryItem } from '../types';
import { ProductPreviewGraphic } from './ProductPreviewGraphic';
import { soundEngine } from '../engine/audio';

interface InventoryModalProps {
  inventory: InventoryItem[];
  hotbar: (string | null)[];
  equippedTool: 'none' | 'lighter' | 'product';
  equippedProductId: string | null;
  onEquipProduct: (productId: string) => void;
  onEquipLighter: () => void;
  onUnequip: () => void;
  onAssignHotbar: (slotIdx: number, productId: string | null) => void;
  onDropItemToWorld: (productId: string) => void;
  onClose: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  inventory,
  hotbar,
  equippedTool,
  equippedProductId,
  onEquipProduct,
  onEquipLighter,
  onUnequip,
  onAssignHotbar,
  onDropItemToWorld,
  onClose,
}) => {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(
    equippedProductId || inventory[0]?.productId || null,
  );
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const itemsWithProduct = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inventory
      .map((inv) => ({ inv, prod: PRODUCT_MAP.get(inv.productId) }))
      .filter((x): x is { inv: InventoryItem; prod: NonNullable<typeof x.prod> } => {
        if (!x.prod) return false;
        if (!q) return true;
        return (
          x.prod.name.toLowerCase().includes(q) ||
          x.prod.category.toLowerCase().includes(q) ||
          x.prod.brand.toLowerCase().includes(q)
        );
      });
  }, [inventory, search]);

  const selectedProd = selectedId ? PRODUCT_MAP.get(selectedId) : undefined;
  const selectedQty = inventory.find((i) => i.productId === selectedId)?.quantity || 0;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#06080D]/85 p-4 md:p-6">
      <div className="w-full max-w-5xl h-[82vh] bg-[#10131C] border border-white/10 rounded-xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0B0E15]">
          <div className="flex items-center gap-3">
            <Backpack className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-lg font-bold text-white">Vuurwerk Inventaris</h2>
              <p className="text-xs text-slate-400">
                Selecteer of sleep producten naar de snelbalk (toetsen 2–7)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                soundEngine.playLighterFlick();
                onEquipLighter();
                onClose();
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
                equippedTool === 'lighter'
                  ? 'bg-orange-500 text-slate-950'
                  : 'bg-orange-500/15 text-orange-300 border border-orange-500/30 hover:bg-orange-500/25'
              }`}
            >
              <Flame className="w-4 h-4" />
              Aansteker [1]
            </button>
            <button
              onClick={() => {
                soundEngine.playUiClick();
                onUnequip();
              }}
              className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium"
            >
              Handen Leeg
            </button>
            <button
              onClick={() => {
                soundEngine.playUiClick();
                onClose();
              }}
              aria-label="Sluit inventaris"
              className="p-2 rounded-lg bg-white/5 text-slate-300 hover:bg-white/15 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12">
          {/* Left Grid */}
          <div className="md:col-span-8 flex flex-col min-h-0 border-r border-white/10">
            <div className="p-4 border-b border-white/10 bg-[#0D1018]">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Zoek in je inventaris..."
                  className="w-full bg-[#151A26] border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
              {itemsWithProduct.length === 0 ? (
                <div className="col-span-2 py-16 text-center text-slate-400 text-sm">
                  Geen vuurwerk in inventaris. Koop producten in het Vuurwerkpaleis!
                </div>
              ) : (
                itemsWithProduct.map(({ inv, prod }) => {
                  const isSelected = selectedId === prod.id;
                  const isEquipped = equippedTool === 'product' && equippedProductId === prod.id;
                  return (
                    <div
                      key={prod.id}
                      draggable
                      onDragStart={() => setDraggedId(prod.id)}
                      onDragEnd={() => setDraggedId(null)}
                      onClick={() => {
                        soundEngine.playUiClick();
                        setSelectedId(prod.id);
                      }}
                      className={`p-3 rounded-lg border cursor-grab active:cursor-grabbing flex items-center gap-3 transition-colors ${
                        isSelected
                          ? 'bg-[#1A2030] border-amber-500/70'
                          : 'bg-[#131722] border-white/8 hover:border-white/20'
                      }`}
                    >
                      <ProductPreviewGraphic product={prod} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{prod.name}</div>
                        <div className="text-xs text-slate-400 truncate">
                          {prod.category} · {prod.shots}s
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-xs font-mono-tabular font-bold text-amber-400">
                            {inv.quantity}× op voorraad
                          </span>
                          {isEquipped && (
                            <span className="text-[11px] font-semibold text-emerald-400">
                              Vastgehouden
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Inspector */}
          <div className="md:col-span-4 p-5 bg-[#0D1018] flex flex-col justify-between overflow-y-auto">
            {selectedProd && selectedQty > 0 ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <ProductPreviewGraphic product={selectedProd} size="lg" />
                  <div className="min-w-0">
                    <p className="text-xs text-amber-400">{selectedProd.brand}</p>
                    <h3 className="text-lg font-bold text-white leading-tight mt-0.5">
                      {selectedProd.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 font-mono-tabular">
                      Aantal: {selectedQty} stuks
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{selectedProd.description}</p>
                <div className="text-xs text-slate-400 space-y-1 border-t border-white/10 pt-3">
                  <div>Schoten: <span className="text-white font-mono-tabular">{selectedProd.shots}</span></div>
                  <div>Kaliber: <span className="text-white font-mono-tabular">{selectedProd.caliberMm} mm</span></div>
                  <div>Duur: <span className="text-white font-mono-tabular">~{selectedProd.durationSec} sec</span></div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-400">Selecteer een item uit je inventaris.</div>
            )}

            {selectedProd && selectedQty > 0 && (
              <div className="space-y-2.5 pt-4 border-t border-white/10 mt-4">
                <button
                  onClick={() => {
                    soundEngine.playPickup();
                    onEquipProduct(selectedProd.id);
                    onClose();
                  }}
                  className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold flex items-center justify-center gap-2"
                >
                  <Hand className="w-4 h-4" />
                  Vastpakken & Plaatsen
                </button>
                <button
                  onClick={() => {
                    soundEngine.playPickup();
                    onDropItemToWorld(selectedProd.id);
                    onClose();
                  }}
                  className="w-full py-2 px-4 rounded-lg bg-white/8 hover:bg-white/15 text-slate-200 text-xs font-medium flex items-center justify-center gap-2"
                >
                  <PackageMinus className="w-4 h-4" />
                  Direct op grond zetten
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Drag-and-Drop Hotbar Assignment */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-[#0B0E15]">
          <div className="text-xs text-slate-400 mb-2">
            Snelbalk (sleep hier een product naartoe, of klik op een vakje om toe te wijzen):
          </div>
          <div className="grid grid-cols-6 gap-2.5">
            {hotbar.map((pid, idx) => {
              const p = pid ? PRODUCT_MAP.get(pid) : null;
              const qty = pid ? inventory.find((i) => i.productId === pid)?.quantity || 0 : 0;
              return (
                <div
                  key={idx}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggedId) {
                      soundEngine.playPickup();
                      onAssignHotbar(idx, draggedId);
                      setDraggedId(null);
                    }
                  }}
                  onClick={() => {
                    if (selectedId && selectedQty > 0) {
                      soundEngine.playUiClick();
                      onAssignHotbar(idx, selectedId);
                    } else if (pid) {
                      onAssignHotbar(idx, null);
                    }
                  }}
                  className="h-14 rounded-lg bg-[#141925] border border-white/10 hover:border-amber-500/50 px-2.5 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <span className="text-xs font-mono-tabular text-slate-500 font-bold">
                    {idx + 2}
                  </span>
                  {p ? (
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-white truncate">{p.name}</div>
                      <div className="text-[11px] font-mono-tabular text-amber-400">{qty}×</div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-600">Leeg</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
