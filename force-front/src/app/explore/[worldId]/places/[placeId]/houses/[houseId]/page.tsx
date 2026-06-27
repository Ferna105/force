'use client';

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { housesService, inventoryService } from '@/api';
import type { House, HousePlacement, InventoryEntry } from '@/api/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { mediaUrl, strapiMedia, thumbFallback, fmt } from '@/lib/design';
import Topbar from '@/components/shell/Topbar';
import { Loading, ErrorState } from '@/components/ui/states';

const DEFAULT_SIZE = 15;

export default function HousePage() {
  const params = useParams();
  const worldId = params.worldId as string;
  const placeId = params.placeId as string;
  const houseId = Number(params.houseId);
  const { user } = useAuth();
  const toast = useToast();

  const [house, setHouse] = useState<House | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Muebles del inventario (solo dueño): para elegir cuál colocar.
  const [furniture, setFurniture] = useState<InventoryEntry[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const loadHouse = useCallback(async () => {
    setLoading(true);
    try {
      const res = await housesService.getHouse(houseId);
      if (!res.data) { setError('Casa no encontrada.'); return; }
      setHouse(res.data);
      setIsOwner(res.isOwner);
    } catch {
      setError('Esta casa es privada o no existe.');
    } finally {
      setLoading(false);
    }
  }, [houseId]);

  // Inventario de muebles del usuario (para el dueño).
  const loadFurniture = useCallback(async () => {
    if (!user) return;
    try {
      const inv = await inventoryService.getMine();
      const fs = (inv.data ?? []).filter(
        (e) => e.attributes.item?.data?.attributes.category === 'furniture' && e.attributes.quantity > 0,
      );
      setFurniture(fs);
      setSelectedItemId((cur) => cur ?? fs[0]?.attributes.item?.data?.id ?? null);
    } catch { /* noop */ }
  }, [user]);

  useEffect(() => { loadHouse(); }, [loadHouse]);
  useEffect(() => { if (isOwner) loadFurniture(); }, [isOwner, loadFurniture]);

  const a = house?.attributes;
  const w = a?.width ?? DEFAULT_SIZE;
  const h = a?.height ?? DEFAULT_SIZE;

  // Índice de muebles colocados por coordenada "x,y".
  const placedByCell = useMemo(() => {
    const map = new Map<string, HousePlacement>();
    (a?.placements?.data ?? []).forEach((p) => map.set(`${p.attributes.x},${p.attributes.y}`, p));
    return map;
  }, [a?.placements]);

  const onCube = async (x: number, y: number) => {
    if (!isOwner || busy) return;
    const placed = placedByCell.get(`${x},${y}`);
    setBusy(true);
    try {
      if (placed) {
        // Quitar el mueble (vuelve al inventario).
        const res = await housesService.remove(houseId, x, y);
        if (res.data) setHouse(res.data);
        await loadFurniture();
      } else {
        // Colocar el mueble seleccionado (consume 1 del inventario).
        if (!selectedItemId) { toast.show({ tone: 'info', icon: 'info', duration: 3600, message: 'Elegí un mueble de tu inventario para colocar.' }); return; }
        const res = await housesService.place(houseId, selectedItemId, x, y);
        if (res.data) setHouse(res.data);
        await loadFurniture();
      }
    } catch {
      toast.show({ tone: 'danger', icon: 'warning', duration: 4000, message: 'No se pudo actualizar la casa.' });
    } finally {
      setBusy(false);
    }
  };

  const toggleVisibility = async () => {
    if (!isOwner || !a || busy) return;
    setBusy(true);
    try {
      const next = a.visibility === 'public' ? 'private' : 'public';
      const res = await housesService.setVisibility(houseId, next);
      if (res.data) setHouse(res.data);
    } catch {
      toast.show({ tone: 'danger', icon: 'warning', duration: 4000, message: 'No se pudo cambiar la visibilidad.' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <><Topbar crumb="Casa" /><div className="page"><Loading /></div></>;
  if (error || !house || !a) return <><Topbar crumb="Casa" /><div className="page"><ErrorState message={error ?? undefined} /></div></>;

  const ownerName = a.owner?.username ?? 'Domadora';
  const interiorUrl = mediaUrl(a.design?.data?.attributes.Interior ?? null);
  const placedCount = a.placements?.data?.length ?? 0;

  return (
    <>
      <Topbar
        crumb={<><Link href={`/explore/${worldId}/places/${placeId}`} style={{ color: 'var(--gold-soft)' }}>{a.place?.Name ?? 'Vecindario'}</Link> · <b>Casa de {ownerName}</b></>}
      />
      <div className="page">
        <div className="sec-title">
          <h3 className="cinzel">{isOwner ? 'Tu casa' : `Casa de ${ownerName}`}</h3>
          <a>{placedCount} mueble{placedCount === 1 ? '' : 's'} · {w}×{h}</a>
        </div>
        <p className="sub" style={{ marginBottom: 18 }}>
          {isOwner
            ? 'Elegí un mueble de tu inventario y tocá un cubo libre para colocarlo. Tocá un mueble colocado para quitarlo (vuelve a tu inventario).'
            : 'Estás visitando esta casa. Solo el dueño puede modificarla.'}
        </p>

        {isOwner && (
          <div className="house-toolbar">
            <button
              className={`btn btn-sm ${a.visibility === 'public' ? 'btn-verdant' : 'btn-ghost'}`}
              disabled={busy}
              onClick={toggleVisibility}
            >
              {a.visibility === 'public' ? '🌐 Pública' : '🔒 Privada'} · cambiar
            </button>
          </div>
        )}

        <div className="house-layout">
          {/* Grilla interior */}
          <div
            className="house-grid"
            style={{
              gridTemplateColumns: `repeat(${w}, 1fr)`,
              ...(interiorUrl ? { backgroundImage: `url(${strapiMedia(interiorUrl)})` } : {}),
            }}
          >
            {Array.from({ length: w * h }).map((_, i) => {
              const x = i % w;
              const y = Math.floor(i / w);
              const placed = placedByCell.get(`${x},${y}`);
              const item = placed?.attributes.item?.data;
              return (
                <button
                  key={i}
                  className={`house-cube${placed ? ' filled' : ''}${isOwner ? ' editable' : ''}`}
                  disabled={!isOwner || busy}
                  title={item ? item.attributes.name : `Cubo ${x + 1}, ${y + 1}`}
                  onClick={() => onCube(x, y)}
                >
                  {item && <img src={mediaUrl(item.attributes.icon, thumbFallback(item.attributes.name))} alt={item.attributes.name} />}
                </button>
              );
            })}
          </div>

          {/* Paleta de muebles (solo dueño) */}
          {isOwner && (
            <div className="house-palette panel">
              <div className="kicker" style={{ marginBottom: 10 }}>Tus muebles</div>
              {furniture.length === 0 && (
                <p className="sub">No tenés muebles. Conseguilos en una tienda y volvé a decorar.</p>
              )}
              <div className="house-pal-grid">
                {furniture.map((e) => {
                  const it = e.attributes.item?.data;
                  if (!it) return null;
                  const sel = selectedItemId === it.id;
                  return (
                    <button
                      key={e.id}
                      className={`house-pal-item${sel ? ' on' : ''}`}
                      onClick={() => setSelectedItemId(it.id)}
                      title={it.attributes.name}
                    >
                      <img src={mediaUrl(it.attributes.icon, thumbFallback(it.attributes.name))} alt={it.attributes.name} />
                      <span className="qty">{fmt(e.attributes.quantity)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
