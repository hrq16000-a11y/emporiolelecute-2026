import { escapeCsv } from '@/lib/seoExport';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious, PaginationEllipsis,
} from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, RefreshCw, Search, Download, History, FileText, ArrowUp, ArrowDown,
  AlertTriangle, ShieldAlert, EyeOff, Eye,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TimelineRow {
  source: 'audit' | 'request' | 'notification';
  event_id: string;
  created_at: string;
  status: string;
  role: string | null;
  target_user_id: string | null;
  target_email: string | null;
  actor_email: string | null;
  details: string | null;
}

interface Anomaly {
  target_email: string;
  target_user_id: string | null;
  event_count: number;
  approvals: number;
  requests: number;
  negatives: number;
  first_event: string;
  last_event: string;
}

const STATUS_OPTIONS = [
  'all', 'requested', 'success', 'rejected', 'revoked', 'noop', 'error',
  'pending', 'approved', 'denied', 'sent', 'failed',
] as const;
const SOURCE_OPTIONS = ['all', 'audit', 'request', 'notification'] as const;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
type SortKey = 'created_at' | 'status' | 'target_email' | 'actor_email' | 'source';
type SortDir = 'asc' | 'desc';

const MASK_KEY = 'admin_audit_mask_pii';

function maskEmail(e?: string | null): string {
  if (!e) return '—';
  const [user, domain] = e.split('@');
  if (!domain) return e.length <= 2 ? '••' : e[0] + '••• ';
  const maskedUser = user.length <= 2 ? user[0] + '•' : user[0] + '•••' + user.slice(-1);
  const dotIdx = domain.lastIndexOf('.');
  const dPart = dotIdx > 0 ? domain.slice(0, dotIdx) : domain;
  const tld = dotIdx > 0 ? domain.slice(dotIdx) : '';
  const maskedDomain = (dPart.length <= 2 ? dPart[0] + '•' : dPart[0] + '•••') + tld;
  return `${maskedUser}@${maskedDomain}`;
}

function fmt(e: string | null | undefined, mask: boolean) {
  if (!e) return '—';
  return mask ? maskEmail(e) : e;
}

function toCsv(rows: TimelineRow[], mask: boolean): string {
  const header = ['created_at', 'source', 'status', 'role', 'target_email', 'target_user_id', 'actor_email', 'details'];
  const escape = (v: any) => escapeCsv(v === null || v === undefined ? '' : String(v));
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push([
      r.created_at, r.source, r.status, r.role ?? '',
      fmt(r.target_email, mask),
      r.target_user_id ?? '',
      fmt(r.actor_email, mask),
      r.details ?? '',
    ].map(escape).join(','));
  }
  return lines.join('\n');
}

const AdminAudit = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<TimelineRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [status, setStatus] = useState<typeof STATUS_OPTIONS[number]>('all');
  const [source, setSource] = useState<typeof SOURCE_OPTIONS[number]>('all');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [maskPii, setMaskPii] = useState<boolean>(() => {
    try { return localStorage.getItem(MASK_KEY) === '1'; } catch { return false; }
  });
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [windowHours, setWindowHours] = useState(24);
  const [threshold, setThreshold] = useState(3);

  // Persist masking preference
  useEffect(() => {
    try { localStorage.setItem(MASK_KEY, maskPii ? '1' : '0'); } catch { /* noop */ }
  }, [maskPii]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, status, source, from, to, sortKey, sortDir, pageSize]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('list_admin_audit_timeline', {
      _search: debouncedQuery || null,
      _status: status === 'all' ? null : status,
      _source: source === 'all' ? null : source,
      _from: from ? new Date(from).toISOString() : null,
      _to: to ? new Date(to + 'T23:59:59').toISOString() : null,
      _sort_key: sortKey,
      _sort_dir: sortDir,
      _limit: pageSize,
      _offset: (page - 1) * pageSize,
    });
    if (error) {
      toast({ title: 'Erro ao carregar auditoria', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }
    const payload = (data ?? {}) as { total?: number; rows?: TimelineRow[] };
    setRows(payload.rows ?? []);
    setTotal(payload.total ?? 0);
    setLoading(false);
  }, [debouncedQuery, status, source, from, to, sortKey, sortDir, page, pageSize, toast]);

  const loadAnomalies = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_audit_anomalies', {
      _window_hours: windowHours,
      _threshold: threshold,
    });
    if (error) return;
    const payload = (data ?? {}) as { items?: Anomaly[] };
    setAnomalies(payload.items ?? []);
  }, [windowHours, threshold]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadAnomalies(); }, [loadAnomalies]);

  const refreshAll = async () => {
    setRefreshing(true);
    const { error } = await supabase.rpc('refresh_admin_audit_timeline');
    setRefreshing(false);
    if (error) {
      toast({ title: 'Falha ao atualizar', description: error.message, variant: 'destructive' });
      return;
    }
    await Promise.all([load(), loadAnomalies()]);
    toast({ title: 'Auditoria atualizada' });
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);

  const anomalyEmails = useMemo(
    () => new Set(anomalies.map((a) => (a.target_email || '').toLowerCase())),
    [anomalies],
  );

  const [exportScope, setExportScope] = useState<'page' | 'all'>('page');
  const [exporting, setExporting] = useState(false);

  // Fetches rows respecting current filters/search/sort. When scope='all' loops
  // server pages of 200 (cap 5000) so memory and DB load stay bounded.
  const fetchExportRows = async (): Promise<TimelineRow[]> => {
    if (exportScope === 'page') return rows;
    const CHUNK = 200;
    const HARD_CAP = 5000;
    const out: TimelineRow[] = [];
    let offset = 0;
    while (out.length < HARD_CAP) {
      const { data, error } = await supabase.rpc('list_admin_audit_timeline', {
        _search: debouncedQuery || null,
        _status: status === 'all' ? null : status,
        _source: source === 'all' ? null : source,
        _from: from ? new Date(from).toISOString() : null,
        _to: to ? new Date(to + 'T23:59:59').toISOString() : null,
        _sort_key: sortKey,
        _sort_dir: sortDir,
        _limit: CHUNK,
        _offset: offset,
      });
      if (error) throw error;
      const payload = (data ?? {}) as { total?: number; rows?: TimelineRow[] };
      const chunk = payload.rows ?? [];
      out.push(...chunk);
      if (chunk.length < CHUNK) break;
      offset += CHUNK;
      if (payload.total != null && offset >= payload.total) break;
    }
    return out.slice(0, HARD_CAP);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const data = await fetchExportRows();
      const csv = toCsv(data, maskPii);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `auditoria-${exportScope}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: 'CSV gerado', description: `${data.length} evento(s).` });
    } catch (e: any) {
      toast({ title: 'Falha ao exportar CSV', description: e.message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const exportPdf = async () => {
    setExporting(true);
    try {
      const data = await fetchExportRows();
      buildPdf(data);
      toast({ title: 'PDF gerado', description: `${data.length} evento(s).` });
    } catch (e: any) {
      toast({ title: 'Falha ao exportar PDF', description: e.message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const buildPdf = (data: TimelineRow[]) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const today = new Date().toLocaleString('pt-BR');
    doc.setFontSize(14);
    doc.text('Auditoria Consolidada — Acesso Administrativo', 40, 40);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(
      `Gerado em ${today} • escopo=${exportScope === 'page' ? `página ${currentPage}` : `tudo (${data.length} de ${total})`}` +
      (status !== 'all' ? ` • status=${status}` : '') +
      (source !== 'all' ? ` • origem=${source}` : '') +
      (debouncedQuery ? ` • busca="${debouncedQuery}"` : '') +
      (from ? ` • de ${from}` : '') + (to ? ` até ${to}` : '') +
      ` • ordem=${sortKey} ${sortDir}` +
      (maskPii ? ' • PII mascarada (LGPD)' : ''),
      40, 56,
    );
    doc.setTextColor(0);

    autoTable(doc, {
      startY: 72,
      head: [['Data', 'Origem', 'Status', 'Alvo', 'Por', 'Detalhes']],
      body: data.map((r) => [
        new Date(r.created_at).toLocaleString('pt-BR'),
        r.source,
        r.status,
        fmt(r.target_email, maskPii),
        fmt(r.actor_email, maskPii),
        r.details || '—',
      ]),
      styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
      headStyles: { fillColor: [232, 93, 58] },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 60 },
        2: { cellWidth: 60 },
        3: { cellWidth: 150 },
        4: { cellWidth: 150 },
        5: { cellWidth: 'auto' },
      },
      didDrawPage: () => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        const pageNum = (doc as any).internal.getCurrentPageInfo().pageNumber;
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(
          `Página ${pageNum} de ${pageCount}`,
          doc.internal.pageSize.getWidth() - 80,
          doc.internal.pageSize.getHeight() - 20,
        );
      },
    });

    doc.save(`auditoria-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const badgeVariant = (s: string): 'default' | 'destructive' | 'secondary' | 'outline' => {
    if (s === 'success' || s === 'approved' || s === 'sent') return 'default';
    if (s === 'rejected' || s === 'denied' || s === 'error' || s === 'revoked' || s === 'failed') return 'destructive';
    if (s === 'requested' || s === 'pending') return 'secondary';
    return 'outline';
  };

  const sourceLabel = (s: string) => {
    if (s === 'audit') return 'Promoção';
    if (s === 'request') return 'Solicitação';
    if (s === 'notification') return 'Notificação';
    return s;
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir(key === 'created_at' ? 'desc' : 'asc'); }
  };

  const SortHeader = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      onClick={() => toggleSort(k)}
      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
      type="button"
    >
      {label}
      {sortKey === k && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
    </button>
  );

  const pageNumbers = useMemo(() => {
    const out: (number | 'ellipsis')[] = [];
    const last = totalPages;
    const c = currentPage;
    const win = 1;
    out.push(1);
    if (c - win > 2) out.push('ellipsis');
    for (let i = Math.max(2, c - win); i <= Math.min(last - 1, c + win); i++) out.push(i);
    if (c + win < last - 1) out.push('ellipsis');
    if (last > 1) out.push(last);
    return out;
  }, [currentPage, totalPages]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link to="/admin" className="inline-flex items-center hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-1" /> Painel
            </Link>
          </div>
          <h1 className="text-2xl font-display flex items-center gap-2">
            <History className="w-6 h-6 text-primary" /> Auditoria Consolidada
          </h1>
          <p className="text-muted-foreground text-sm">
            Linha do tempo unificada de promoções, solicitações de acesso e tentativas de notificação.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex items-center gap-2 px-3 py-1.5 border rounded-md bg-card">
            {maskPii ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
            <Label htmlFor="mask-pii" className="text-xs cursor-pointer select-none">
              Mascarar PII (LGPD)
            </Label>
            <Switch id="mask-pii" checked={maskPii} onCheckedChange={setMaskPii} />
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 border rounded-md bg-card">
            <Label className="text-xs select-none">Escopo</Label>
            <Select value={exportScope} onValueChange={(v) => setExportScope(v as 'page' | 'all')}>
              <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="page">Página atual</SelectItem>
                <SelectItem value="all">Todos filtrados</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={refreshAll} disabled={refreshing || loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0 || exporting}>
            <Download className="w-4 h-4 mr-2" /> {exporting ? 'Gerando…' : 'CSV'}
          </Button>
          <Button onClick={exportPdf} disabled={rows.length === 0 || exporting}>
            <FileText className="w-4 h-4 mr-2" /> {exporting ? 'Gerando…' : 'PDF'}
          </Button>
        </div>
      </div>

      {/* Anomaly detection */}
      <Card className={anomalies.length > 0 ? 'border-destructive/40' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className={`w-5 h-5 ${anomalies.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
              Detecção de anomalias
            </CardTitle>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Janela</span>
              <Select value={String(windowHours)} onValueChange={(v) => setWindowHours(Number(v))}>
                <SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hora</SelectItem>
                  <SelectItem value="6">6 horas</SelectItem>
                  <SelectItem value="24">24 horas</SelectItem>
                  <SelectItem value="72">3 dias</SelectItem>
                  <SelectItem value="168">7 dias</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-muted-foreground">Limite</span>
              <Select value={String(threshold)} onValueChange={(v) => setThreshold(Number(v))}>
                <SelectTrigger className="h-8 w-[80px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2, 3, 5, 10].map((n) => (
                    <SelectItem key={n} value={String(n)}>≥ {n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <CardDescription className="text-xs">
            Usuários com {threshold}+ eventos em {windowHours}h. Linhas destacadas na tabela abaixo.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {anomalies.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Nenhuma anomalia no período.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {anomalies.slice(0, 6).map((a) => (
                <div
                  key={(a.target_user_id ?? '') + a.target_email}
                  className="border border-destructive/30 rounded-md p-3 text-xs bg-destructive/5"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{fmt(a.target_email, maskPii)}</div>
                      <div className="text-muted-foreground mt-1">
                        {a.event_count} eventos · {a.approvals} aprov. · {a.requests} solic. · {a.negatives} neg.
                      </div>
                      <div className="text-muted-foreground text-[10px] mt-0.5">
                        Último: {new Date(a.last_event).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eventos</CardTitle>
          <CardDescription>
            {loading
              ? 'Carregando…'
              : `${rows.length} de ${total} eventos · página ${currentPage} de ${totalPages}`}
          </CardDescription>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por e-mail, detalhes…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={source} onValueChange={(v) => setSource(v as any)}>
              <SelectTrigger><SelectValue placeholder="Origem" /></SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s === 'all' ? 'Todas as origens' : sourceLabel(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s === 'all' ? 'Todos os status' : s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><SortHeader k="created_at" label="Data" /></TableHead>
                  <TableHead><SortHeader k="source" label="Origem" /></TableHead>
                  <TableHead><SortHeader k="status" label="Status" /></TableHead>
                  <TableHead><SortHeader k="target_email" label="Alvo" /></TableHead>
                  <TableHead><SortHeader k="actor_email" label="Por" /></TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const isAnomaly = !!r.target_email && anomalyEmails.has(r.target_email.toLowerCase());
                  return (
                    <TableRow key={`${r.source}-${r.event_id}`} className={isAnomaly ? 'bg-destructive/5' : undefined}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] uppercase">{sourceLabel(r.source)}</Badge>
                      </TableCell>
                      <TableCell><Badge variant={badgeVariant(r.status)}>{r.status}</Badge></TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1.5">
                          {isAnomaly && <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />}
                          <span>{fmt(r.target_email, maskPii)}</span>
                        </div>
                        {r.target_user_id && (
                          <code className="text-[10px] text-muted-foreground">{r.target_user_id.slice(0, 8)}…</code>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{fmt(r.actor_email, maskPii)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-md">
                        {r.details || '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!loading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                      Nenhum evento para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Por página</span>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="h-8 w-[80px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {totalPages > 1 && (
              <Pagination className="mx-0 w-auto justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                  {pageNumbers.map((n, i) =>
                    n === 'ellipsis' ? (
                      <PaginationItem key={`e-${i}`}><PaginationEllipsis /></PaginationItem>
                    ) : (
                      <PaginationItem key={n}>
                        <PaginationLink
                          href="#"
                          isActive={n === currentPage}
                          onClick={(e) => { e.preventDefault(); setPage(n); }}
                        >
                          {n}
                        </PaginationLink>
                      </PaginationItem>
                    ),
                  )}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)); }}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAudit;
