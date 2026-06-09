'use client';

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState } from 'react';
import { useInventory } from '@/api';
import type { InventoryEntry } from '@/api/types';
import { useAuth } from '@/hooks/useAuth';
import {
  RARITY, ITEM_TYPE_ES, mediaUrl, thumbFallback, fmt, type Rarity,
} from '@/lib/design';
import Topbar from '@/components/shell/Topbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Loading, ErrorState, Empty, RarityChips } from '@/components/ui/states';
import { RarityPill } from '@/components/ui/tags';
import { ItemSlot } from '@/components/ui/cards';

const CAPACITY = 40;

export default function InventoryPage() {
  return (
    <ProtectedRoute>
      <InventoryContent />
    </ProtectedRoute>
  );
}

function InventoryContent() {
  const { user } = useAuth();
  const { data: entries, loading, error } = useInventory(user?.id ?? null);
  const [rarity, setRarity] = useState<Rarity | 'all'>('all');
  const [sel, setSel] = useState(0);

  const all = useMemo(() => (entries ?? []).filter((e) => e.attributes.item?.data), [entries]);
  const visible = useMemo(
    () => all.filter((e) => rarity === 'all' || e.attributes.item!.data!.attributes.rarity === rarity),
    [all, rarity]
  );
  const used = all.length;
  const selected = visible[sel] ?? visible[0];

  return (
    <>
      <Topbar crumb="Inventario" />
      <div className="page">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <div className="kicker">Tu mochila</div>
            <h1 className="h-page" style={{ margin: '8px 0 6px' }}>Inventario</h1>
            <p className="sub">{used} de {CAPACITY} espacios usados.</p>
          </div>
          <div className="capbar" style={{ minWidth: 240 }}>
            <div className="meter" style={{ margin: 0 }}>
              <div className="top"><span>Capacidad</span><b>{used} / {CAPACITY}</b></div>
              <div className="bar"><i className="fill-gold" style={{ width: `${Math.min(100, (used / CAPACITY) * 100)}%` }} /></div>
            </div>
          </div>
        </div>

        <div style={{ margin: '24px 0' }}>
          <RarityChips value={rarity} onChange={(v) => { setRarity(v); setSel(0); }} />
        </div>

        {loading && <Loading />}
        {error && <ErrorState message={error} />}
        {!loading && !error && all.length === 0 && <Empty label="Tu mochila está vacía. Visitá una tienda para conseguir objetos." />}

        {!loading && visible.length > 0 && (
          <div className="inv-wrap">
            <div className="inv-grid">
              {visible.map((e, i) => {
                const it = e.attributes.item!.data!.attributes;
                return (
                  <ItemSlot
                    key={e.id}
                    name={it.name}
                    img={mediaUrl(it.icon, thumbFallback(it.name))}
                    rarity={it.rarity}
                    type={it.type}
                    value={it.value}
                    qty={e.attributes.quantity}
                    selected={i === sel}
                    onClick={() => setSel(i)}
                  />
                );
              })}
            </div>
            {selected && <Detail entry={selected} />}
          </div>
        )}
      </div>
    </>
  );
}

function Detail({ entry }: { entry: InventoryEntry }) {
  const it = entry.attributes.item!.data!.attributes;
  const r = RARITY[it.rarity];
  const img = mediaUrl(it.icon, thumbFallback(it.name));
  return (
    <aside className="panel detail" style={{ padding: '22px 24px' }}>
      <div className="dimg" style={{ '--g': r.g, '--bd': r.bd } as React.CSSProperties}>
        {img && <img src={img} alt={it.name} />}
      </div>
      <RarityPill rarity={it.rarity} />
      <h3 className="cinzel" style={{ fontSize: 24, color: '#F6ECD7', margin: '12px 0 6px' }}>{it.name}</h3>
      {it.description && <p className="sub" style={{ fontSize: 14 }}>{it.description}</p>}
      <div style={{ marginTop: 16 }}>
        <div className="drow"><span>Tipo</span><b>{ITEM_TYPE_ES[it.type]}</b></div>
        <div className="drow"><span>Valor</span><b style={{ color: 'var(--gold-soft)' }}>F {fmt(it.value)}</b></div>
        <div className="drow"><span>Peso</span><b>{(it.weight ?? 0).toLocaleString('es')} kg</b></div>
        <div className="drow"><span>Cantidad</span><b>×{entry.attributes.quantity}</b></div>
        <div className="drow"><span>Apilable</span><b>{it.is_stackable ? `Sí · máx ${it.max_stack}` : 'No'}</b></div>
        <div className="drow"><span>Usable</span><b>{it.usable ? 'Sí' : 'No'}</b></div>
        {it.usable && <div className="drow"><span>Reutilización</span><b>{it.cooldown}s</b></div>}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        {it.usable && <button className="btn btn-verdant" style={{ flex: 1, justifyContent: 'center' }}>Usar</button>}
        <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Vender</button>
      </div>
    </aside>
  );
}
