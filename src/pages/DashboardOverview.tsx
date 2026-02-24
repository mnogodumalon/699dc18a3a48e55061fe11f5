import { useState, useMemo } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { ArtikelEinstellen } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { formatCurrency, formatDate, displayLookup, lookupKey } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Plus, Search, Tag, Trash2, Pencil, Package, ShoppingBag, Euro, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ArtikelEinstellenDialog } from '@/components/dialogs/ArtikelEinstellenDialog';
import { AI_PHOTO_SCAN } from '@/config/ai-features';

const KATEGORIEN: Record<string, string> = {
  elektronik: 'Elektronik',
  moebel: 'Möbel',
  kleidung: 'Kleidung',
  sport_freizeit: 'Sport & Freizeit',
  haushalt: 'Haushalt',
  garten: 'Garten',
  fahrzeuge: 'Fahrzeuge',
  buecher_medien: 'Bücher & Medien',
  sonstiges: 'Sonstiges',
};

const ZUSTAND_COLORS: Record<string, string> = {
  neu: 'bg-emerald-100 text-emerald-800',
  wie_neu: 'bg-teal-100 text-teal-800',
  sehr_gut: 'bg-blue-100 text-blue-800',
  gut: 'bg-violet-100 text-violet-800',
  akzeptabel: 'bg-orange-100 text-orange-800',
};

const KATEGORIE_COLORS: Record<string, string> = {
  elektronik: 'bg-blue-50 text-blue-700 border-blue-200',
  moebel: 'bg-amber-50 text-amber-700 border-amber-200',
  kleidung: 'bg-pink-50 text-pink-700 border-pink-200',
  sport_freizeit: 'bg-green-50 text-green-700 border-green-200',
  haushalt: 'bg-orange-50 text-orange-700 border-orange-200',
  garten: 'bg-lime-50 text-lime-700 border-lime-200',
  fahrzeuge: 'bg-slate-50 text-slate-700 border-slate-200',
  buecher_medien: 'bg-purple-50 text-purple-700 border-purple-200',
  sonstiges: 'bg-gray-50 text-gray-700 border-gray-200',
};

export default function DashboardOverview() {
  const { artikelEinstellen, loading, error, fetchAll } = useDashboardData();

  const [search, setSearch] = useState('');
  const [activeKategorie, setActiveKategorie] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<ArtikelEinstellen | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ArtikelEinstellen | null>(null);

  const filtered = useMemo(() => {
    return artikelEinstellen.filter(a => {
      const matchSearch = !search ||
        (a.fields.artikelname ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (a.fields.beschreibung ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (a.fields.stadt ?? '').toLowerCase().includes(search.toLowerCase());
      const matchKat = !activeKategorie || lookupKey(a.fields.kategorie) === activeKategorie;
      return matchSearch && matchKat;
    });
  }, [artikelEinstellen, search, activeKategorie]);

  const stats = useMemo(() => {
    const total = artikelEinstellen.length;
    const mitPreis = artikelEinstellen.filter(a => a.fields.preis != null);
    const gesamtwert = mitPreis.reduce((s, a) => s + (a.fields.preis ?? 0), 0);
    const avgPreis = mitPreis.length ? gesamtwert / mitPreis.length : 0;
    const kategorienCount = new Set(artikelEinstellen.map(a => lookupKey(a.fields.kategorie)).filter(Boolean)).size;
    return { total, gesamtwert, avgPreis, kategorienCount };
  }, [artikelEinstellen]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteArtikelEinstellenEntry(deleteTarget.record_id);
    setDeleteTarget(null);
    fetchAll();
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Marktplatz</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{artikelEinstellen.length} Artikel eingestellt</p>
        </div>
        <Button onClick={() => { setEditRecord(null); setDialogOpen(true); }} className="gap-2 shrink-0">
          <Plus size={16} />
          Artikel einstellen
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Artikel"
          value={String(stats.total)}
          description="Insgesamt eingestellt"
          icon={<ShoppingBag size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Gesamtwert"
          value={formatCurrency(stats.gesamtwert)}
          description="Aller Artikel"
          icon={<Euro size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Ø Preis"
          value={formatCurrency(stats.avgPreis)}
          description="Pro Artikel"
          icon={<Tag size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Kategorien"
          value={String(stats.kategorienCount)}
          description="Verschiedene"
          icon={<Package size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Search + Category Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Artikel suchen..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveKategorie(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              activeKategorie === null
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:border-primary/50'
            }`}
          >
            Alle
          </button>
          {Object.entries(KATEGORIEN).map(([key, label]) => {
            const count = artikelEinstellen.filter(a => lookupKey(a.fields.kategorie) === key).length;
            if (count === 0) return null;
            return (
              <button
                key={key}
                onClick={() => setActiveKategorie(activeKategorie === key ? null : key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  activeKategorie === key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                }`}
              >
                {label} <span className="opacity-60">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Listings Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <ShoppingBag size={24} className="text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Keine Artikel gefunden</p>
            <p className="text-sm text-muted-foreground mt-1">
              {search || activeKategorie ? 'Probiere andere Filter.' : 'Stell deinen ersten Artikel ein!'}
            </p>
          </div>
          {!search && !activeKategorie && (
            <Button onClick={() => { setEditRecord(null); setDialogOpen(true); }} size="sm" className="gap-2">
              <Plus size={14} />
              Jetzt einstellen
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(artikel => (
            <ArtikelCard
              key={artikel.record_id}
              artikel={artikel}
              onEdit={() => { setEditRecord(artikel); setDialogOpen(true); }}
              onDelete={() => setDeleteTarget(artikel)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <ArtikelEinstellenDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditRecord(null); }}
        onSubmit={async (fields) => {
          if (editRecord) {
            await LivingAppsService.updateArtikelEinstellenEntry(editRecord.record_id, fields);
          } else {
            await LivingAppsService.createArtikelEinstellenEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editRecord?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['ArtikelEinstellen']}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Artikel löschen"
        description={`"${deleteTarget?.fields.artikelname ?? 'Artikel'}" wirklich löschen?`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function ArtikelCard({
  artikel,
  onEdit,
  onDelete,
}: {
  artikel: ArtikelEinstellen;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const zustandKey = lookupKey(artikel.fields.zustand);
  const kategorieKey = lookupKey(artikel.fields.kategorie);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-200 flex flex-col">
      {/* Photo / Placeholder */}
      <div className="relative h-52 bg-muted flex items-center justify-center overflow-hidden">
        {artikel.fields.fotos ? (
          <img
            src={artikel.fields.fotos}
            alt={artikel.fields.artikelname ?? 'Artikelfoto'}
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground/30">
            <Package size={40} />
            <span className="text-xs">Kein Foto</span>
          </div>
        )}

        {/* Zustand badge */}
        {zustandKey && (
          <div className="absolute bottom-3 left-3">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm ${ZUSTAND_COLORS[zustandKey] ?? 'bg-gray-100 text-gray-700'}`}>
              {displayLookup(artikel.fields.zustand)}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        {kategorieKey && (
          <span className={`self-start text-xs font-medium px-2.5 py-1 rounded-md border ${KATEGORIE_COLORS[kategorieKey] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
            {KATEGORIEN[kategorieKey] ?? displayLookup(artikel.fields.kategorie)}
          </span>
        )}

        <h3 className="font-bold text-foreground text-base leading-snug line-clamp-2">
          {artikel.fields.artikelname ?? '—'}
        </h3>

        {artikel.fields.beschreibung && (
          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
            {artikel.fields.beschreibung}
          </p>
        )}

        <div className="mt-auto pt-3 flex items-end justify-between gap-2 border-t border-border/50">
          <div>
            {artikel.fields.preis != null ? (
              <span className="text-xl font-bold text-foreground">
                {formatCurrency(artikel.fields.preis)}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground italic">Preis auf Anfrage</span>
            )}
            {(artikel.fields.stadt || artikel.fields.postleitzahl) && (
              <div className="flex items-center gap-1 text-muted-foreground text-xs mt-0.5">
                <MapPin size={11} />
                <span>{[artikel.fields.postleitzahl, artikel.fields.stadt].filter(Boolean).join(' ')}</span>
              </div>
            )}
          </div>

          {/* Action buttons — always visible */}
          <div className="flex gap-2 shrink-0">
            <button
              onClick={onEdit}
              className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={onDelete}
              className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {(artikel.fields.vorname || artikel.fields.nachname) && (
          <div className="text-xs text-muted-foreground">
            von {[artikel.fields.vorname, artikel.fields.nachname].filter(Boolean).join(' ')}
            {artikel.createdat && (
              <span className="ml-2 opacity-60">· {formatDate(artikel.createdat)}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <AlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{error.message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>Erneut versuchen</Button>
    </div>
  );
}
