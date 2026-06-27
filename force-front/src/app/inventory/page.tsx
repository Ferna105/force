'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from 'react';
import { useInventory, useActiveCompanion, companionsService } from '@/api';
import type { Companion, InventoryEntry } from '@/api/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import {
  RARITY, ITEM_TYPE_ES, mediaUrl, thumbFallback, fmt, type Rarity,
} from '@/lib/design';
import Topbar from '@/components/shell/Topbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Loading, ErrorState, Empty, RarityChips } from '@/components/ui/states';
import { RarityPill } from '@/components/ui/tags';
import { ItemSlot } from '@/components/ui/cards';

const CAPACITY = 40;
const MAX_EQUIP = 5;

export default function InventoryPage() {
  return (
    <ProtectedRoute>
      <InventoryContent />
    </ProtectedRoute>
  );
}

function InventoryContent() {
  const { user } = useAuth();
  const toast = useToast();
  const { data: entries, loading, error } = useInventory(user?.id ?? null);
  const { data: activeCompanion } = useActiveCompanion(user?.id ?? null);
  const [rarity, setRarity] = useState<Rarity | 'all'>('all');
  const [sel, setSel] = useState(0);

  // Copia local del compañero para reflejar equipar/quitar/alimentar sin recargar.
  const [companion, setCompanion] = useState<Companion | null>(null);
  const [busyItem, setBusyItem] = useState<number | null>(null);
  useEffect(() => { setCompanion(activeCompanion ?? null); }, [activeCompanion]);

  // Copia local del inventario: al alimentar se consume 1 unidad (o desaparece
  // la entrada si era la última) sin tener que recargar la página.
  const [items, setItems] = useState<InventoryEntry[]>([]);
  useEffect(() => { setItems(entries ?? []); }, [entries]);

  const equipped = useMemo(() => companion?.attributes.equippedItems?.data ?? [], [companion]);
  const equippedIds = useMemo(() => new Set(equipped.map((it) => it.id)), [equipped]);
  const equipFull = equipped.length >= MAX_EQUIP;
  const companionName = companion?.attributes.monster?.data?.attributes.Name ?? 'tu compañero';

  const all = useMemo(() => items.filter((e) => e.attributes.item?.data), [items]);
  const visible = useMemo(
    () => all.filter((e) => rarity === 'all' || e.attributes.item!.data!.attributes.rarity === rarity),
    [all, rarity]
  );
  const used = all.length;
  const selected = visible[sel] ?? visible[0];

  // Equipa o quita el objeto al compañero activo y refleja el resultado localmente.
  const toggleEquip = async (itemId: number, itemName: string, isEquipped: boolean) => {
    if (!companion) {
      toast.show({ tone: 'gold', icon: 'warning', message: 'Primero necesitás un compañero para equiparle objetos.', primary: { label: 'Entendido' } });
      return;
    }
    setBusyItem(itemId);
    try {
      const res = isEquipped
        ? await companionsService.unequip(companion.id, itemId)
        : await companionsService.equip(companion.id, itemId);
      setCompanion(res.data);
      toast.show({
        tone: 'verdant', icon: 'success', duration: 3200,
        message: isEquipped ? <>Quitaste <b>{itemName}</b> del equipamiento.</> : <>Equipaste <b>{itemName}</b>.</>,
      });
    } catch {
      toast.show({ tone: 'danger', icon: 'warning', message: 'No se pudo actualizar el equipamiento. Intentá de nuevo.', primary: { label: 'Entendido' } });
    } finally {
      setBusyItem(null);
    }
  };

  // Consume el alimento para curar al compañero activo: descuenta 1 unidad del
  // inventario local (o quita la entrada si era la última) y refleja la salud.
  const feedCompanion = async (entry: InventoryEntry) => {
    const it = entry.attributes.item!.data!;
    if (!companion) {
      toast.show({ tone: 'gold', icon: 'warning', message: 'Primero necesitás un compañero para alimentar.', primary: { label: 'Entendido' } });
      return;
    }
    setBusyItem(it.id);
    try {
      const res = await companionsService.heal(companion.id, it.id);
      setCompanion(res.data);
      // Descontar la unidad consumida del inventario local.
      setItems((prev) =>
        prev
          .map((e) => (e.id === entry.id ? { ...e, attributes: { ...e.attributes, quantity: e.attributes.quantity - 1 } } : e))
          .filter((e) => e.attributes.quantity > 0)
      );
      toast.show({
        tone: 'verdant', icon: 'success', duration: 3600,
        message: <>Alimentaste a <b>{companionName}</b> con <b>{it.attributes.name}</b>. +{it.attributes.heal} de salud.</>,
      });
    } catch (err) {
      // El backend rechaza con 400 si el compañero ya tiene la salud completa;
      // su mensaje viene en response.data.error.message (axios).
      const backendMsg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      const msg = backendMsg && /salud completa/i.test(backendMsg)
        ? `${companionName} ya tiene la salud completa.`
        : 'No se pudo alimentar al compañero. Intentá de nuevo.';
      toast.show({ tone: 'danger', icon: 'warning', message: msg, primary: { label: 'Entendido' } });
    } finally {
      setBusyItem(null);
    }
  };

  // Abre el toast de confirmación antes de consumir el alimento.
  const confirmFeed = (entry: InventoryEntry) => {
    const it = entry.attributes.item!.data!.attributes;
    if (!companion) {
      toast.show({ tone: 'gold', icon: 'warning', message: 'Primero necesitás un compañero para alimentar.', primary: { label: 'Entendido' } });
      return;
    }
    toast.show({
      tone: 'gold', icon: 'question',
      message: <>¿Alimentar a <b>{companionName}</b> con <b>{it.name}</b>? Recuperará <b>{it.heal}</b> de salud y se consumirá.</>,
      secondary: { label: 'Cancelar' },
      primary: { label: 'Alimentar', variant: 'verdant', onClick: () => feedCompanion(entry) },
    });
  };

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
            {selected && (() => {
              const it = selected.attributes.item!.data!;
              const equippable = it.attributes.attack > 0 || it.attributes.defense > 0;
              const isEquipped = equippedIds.has(it.id);
              // Alimentable: cualquier objeto que cure (alimentos y pociones).
              const feedable = (it.attributes.heal ?? 0) > 0;
              return (
                <Detail
                  entry={selected}
                  equippable={equippable}
                  isEquipped={isEquipped}
                  canEquip={!!companion && (isEquipped || !equipFull)}
                  feedable={feedable}
                  busy={busyItem === it.id}
                  onToggleEquip={() => toggleEquip(it.id, it.attributes.name, isEquipped)}
                  onUse={() => confirmFeed(selected)}
                />
              );
            })()}
          </div>
        )}
      </div>
    </>
  );
}

function Detail({
  entry, equippable, isEquipped, canEquip, feedable, busy, onToggleEquip, onUse,
}: {
  entry: InventoryEntry;
  equippable: boolean;
  isEquipped: boolean;
  canEquip: boolean;
  feedable: boolean;
  busy: boolean;
  onToggleEquip: () => void;
  onUse: () => void;
}) {
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
        {it.attack > 0 && <div className="drow"><span>Ataque</span><b style={{ color: '#f0a17a' }}>+{it.attack}</b></div>}
        {it.defense > 0 && <div className="drow"><span>Defensa</span><b style={{ color: '#73b0f0' }}>+{it.defense}</b></div>}
        {feedable && <div className="drow"><span>Salud</span><b style={{ color: '#6cc063' }}>+{it.heal}</b></div>}
        <div className="drow"><span>Valor</span><b style={{ color: 'var(--gold-soft)' }}>F {fmt(it.value)}</b></div>
        <div className="drow"><span>Peso</span><b>{(it.weight ?? 0).toLocaleString('es')} kg</b></div>
        <div className="drow"><span>Cantidad</span><b>×{entry.attributes.quantity}</b></div>
        <div className="drow"><span>Apilable</span><b>{it.is_stackable ? `Sí · máx ${it.max_stack}` : 'No'}</b></div>
        <div className="drow"><span>Usable</span><b>{it.usable ? 'Sí' : 'No'}</b></div>
        {it.usable && <div className="drow"><span>Reutilización</span><b>{it.cooldown}s</b></div>}
        {equippable && <div className="drow"><span>Equipado</span><b>{isEquipped ? 'Sí' : 'No'}</b></div>}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        {equippable && (
          <button
            className={`btn ${isEquipped ? 'btn-secondary' : 'btn-primary'}`}
            style={{ flex: 1, justifyContent: 'center' }}
            disabled={busy || (!isEquipped && !canEquip)}
            onClick={onToggleEquip}
            title={!isEquipped && !canEquip ? `Tu compañero ya tiene ${MAX_EQUIP} objetos equipados` : undefined}
          >
            {busy ? '…' : isEquipped ? 'Quitar' : 'Equipar'}
          </button>
        )}
        {feedable && (
          <button
            className="btn btn-verdant"
            style={{ flex: 1, justifyContent: 'center' }}
            disabled={busy}
            onClick={onUse}
          >
            {busy ? '…' : 'Usar'}
          </button>
        )}
        <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Vender</button>
      </div>
    </aside>
  );
}
