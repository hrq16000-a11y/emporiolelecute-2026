import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, RefreshCw, Activity, Search, Download, Copy, Eye } from "lucide-react";
import { toast } from "sonner";
import { escapeCsv as csvEscape } from '@/lib/seoExport';

interface StaleLog {
  id: string;
  occurred_at: string;
  route: string | null;
  message: string | null;
  stack: string | null;
  user_agent: string | null;
  reloaded: boolean;
}

interface ParsedLog extends StaleLog {
  cid: string | null;
  source: string | null;
  component: string | null;
  cleanMessage: string;
}

const PAGE_SIZE = 25;

// Parses tagged messages produced by telemetry.ts:
//   "[cid:abc12345] [source][Component] message"
// Older logs without prefixes still display correctly.
function parseLog(row: StaleLog): ParsedLog {
  const msg = row.message || "";
  let cid: string | null = null;
  let source: string | null = null;
  let component: string | null = null;
  let rest = msg;

  const cidMatch = rest.match(/^\[cid:([^\]]+)\]\s*/);
  if (cidMatch) {
    cid = cidMatch[1];
    rest = rest.slice(cidMatch[0].length);
  }
  const sourceMatch = rest.match(/^\[([^\]]+)\]\s*/);
  if (sourceMatch) {
    source = sourceMatch[1];
    rest = rest.slice(sourceMatch[0].length);
  }
  const compMatch = rest.match(/^\[([^\]]+)\]\s*/);
  if (compMatch) {
    component = compMatch[1];
    rest = rest.slice(compMatch[0].length);
  }
  return { ...row, cid, source, component, cleanMessage: rest.trim() || msg };
}


function downloadCsv(rows: ParsedLog[]) {
  const headers = ["occurred_at", "cid", "source", "component", "route", "message", "user_agent", "reloaded"];
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.occurred_at,
        r.cid ?? "",
        r.source ?? "",
        r.component ?? "",
        r.route ?? "",
        r.cleanMessage,
        r.user_agent ?? "",
        r.reloaded,
      ]
        .map(csvEscape)
        .join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `telemetria-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AdminTelemetry() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<ParsedLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [routeFilter, setRouteFilter] = useState("");
  const [componentFilter, setComponentFilter] = useState("");
  const [messageFilter, setMessageFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [cidFilter, setCidFilter] = useState(searchParams.get("cid") ?? "");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [grouped, setGrouped] = useState(false);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<ParsedLog | null>(null);

  const load = async () => {
    setLoading(true);
    let q = (supabase as any)
      .from("stale_bundle_logs")
      .select("*")
      .order("occurred_at", { ascending: false })
      .limit(1000);
    if (from) q = q.gte("occurred_at", new Date(from).toISOString());
    if (to) q = q.lte("occurred_at", new Date(`${to}T23:59:59`).toISOString());
    const { data, error } = await q;
    if (error) toast.error("Falha ao carregar telemetria");
    setRows(((data as StaleLog[]) || []).map(parseLog));
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  // Sync cid filter to URL so it's shareable.
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (cidFilter) next.set("cid", cidFilter);
    else next.delete("cid");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cidFilter]);

  const sources = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => r.source && s.add(r.source));
    return Array.from(s).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const r = routeFilter.trim().toLowerCase();
    const c = componentFilter.trim().toLowerCase();
    const m = messageFilter.trim().toLowerCase();
    const cid = cidFilter.trim().toLowerCase();
    return rows.filter((row) => {
      if (sourceFilter !== "all" && row.source !== sourceFilter) return false;
      if (r && !(row.route || "").toLowerCase().includes(r)) return false;
      if (c && !(row.component || "").toLowerCase().includes(c)) return false;
      if (m && !(row.cleanMessage || "").toLowerCase().includes(m)) return false;
      if (cid && !(row.cid || "").toLowerCase().includes(cid)) return false;
      return true;
    });
  }, [rows, routeFilter, componentFilter, messageFilter, sourceFilter, cidFilter]);

  // Optional dedup grouping: collapse rows with same source+component+cleanMessage+route
  // and show count + first/last occurrence.
  const displayRows = useMemo(() => {
    if (!grouped) return filtered;
    const map = new Map<string, ParsedLog & { count: number; firstAt: string; lastAt: string }>();
    for (const r of filtered) {
      const key = [r.source, r.component, r.route, r.cleanMessage].join("|");
      const ex = map.get(key);
      if (ex) {
        ex.count++;
        if (r.occurred_at < ex.firstAt) ex.firstAt = r.occurred_at;
        if (r.occurred_at > ex.lastAt) ex.lastAt = r.occurred_at;
      } else {
        map.set(key, { ...r, count: 1, firstAt: r.occurred_at, lastAt: r.occurred_at });
      }
    }
    return Array.from(map.values()).sort((a, b) => (b.lastAt > a.lastAt ? 1 : -1));
  }, [filtered, grouped]);

  const totalPages = Math.max(1, Math.ceil(displayRows.length / PAGE_SIZE));
  const pageRows = displayRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => {
    setPage(1);
  }, [routeFilter, componentFilter, messageFilter, sourceFilter, cidFilter, from, to, grouped]);

  const copyStack = async (row: ParsedLog) => {
    const text = [
      `route: ${row.route ?? ""}`,
      `cid: ${row.cid ?? ""}`,
      `source: ${row.source ?? ""}`,
      `component: ${row.component ?? ""}`,
      `occurred_at: ${row.occurred_at}`,
      `message: ${row.cleanMessage}`,
      "",
      row.stack ?? "",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Stack copiada para a área de transferência");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link to="/admin" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-1">
            <ArrowLeft className="w-4 h-4 mr-1" /> Admin
          </Link>
          <h1 className="text-2xl font-display flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" /> Telemetria — Erros e falhas em runtime
          </h1>
          <p className="text-muted-foreground text-sm">
            Erros React, falhas de chunk, rejeições de promise e falhas de rede (fetch/XHR), com correlation id por sessão.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => downloadCsv(filtered)} disabled={!filtered.length}>
            <Download className="w-4 h-4 mr-2" /> CSV
          </Button>
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            {loading ? "Carregando..." : `${displayRows.length}${grouped ? " grupos" : ""} de ${filtered.length} eventos (total bruto: ${rows.length})`}
          </CardDescription>
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-3 pt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rota" value={routeFilter} onChange={(e) => setRouteFilter(e.target.value)} className="pl-9" />
            </div>
            <Input placeholder="Componente" value={componentFilter} onChange={(e) => setComponentFilter(e.target.value)} />
            <Input placeholder="Mensagem contém..." value={messageFilter} onChange={(e) => setMessageFilter(e.target.value)} />
            <Input
              placeholder="Correlation id (cid)"
              value={cidFilter}
              onChange={(e) => setCidFilter(e.target.value)}
            />
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">Todas as origens</option>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            <label className="flex items-center gap-2 text-sm h-10 px-3">
              <input type="checkbox" checked={grouped} onChange={(e) => setGrouped(e.target.checked)} />
              Agrupar duplicados
            </label>
          </div>
        </CardHeader>
        <CardContent>
          {!loading && filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhum evento no período/filtro.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Componente</TableHead>
                    <TableHead>Rota</TableHead>
                    <TableHead>Mensagem</TableHead>
                    <TableHead>CID</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((r) => {
                    const count = (r as ParsedLog & { count?: number }).count;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(r.occurred_at).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          {r.source ? <Badge variant="outline" className="text-xs">{r.source}</Badge> : "—"}
                        </TableCell>
                        <TableCell className="text-xs font-mono">{r.component || "—"}</TableCell>
                        <TableCell className="text-xs font-mono max-w-[180px] truncate" title={r.route || ""}>
                          {r.route || "—"}
                        </TableCell>
                        <TableCell className="text-xs max-w-[320px] truncate" title={r.cleanMessage}>
                          <span className="inline-flex items-center gap-2">
                            {grouped && count && count > 1 && (
                              <Badge variant="secondary" className="text-[10px]">×{count}</Badge>
                            )}
                            <span className="truncate">{r.cleanMessage || "—"}</span>
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {r.cid ? (
                            <button
                              onClick={() => setCidFilter(r.cid!)}
                              className="hover:text-foreground hover:underline"
                              title="Filtrar por este cid"
                            >
                              {r.cid.slice(0, 8)}
                            </button>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="icon" variant="ghost" onClick={() => setDetail(r)} title="Ver detalhes">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => copyStack(r)} title="Copiar stack">
                            <Copy className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 text-sm">
                  <span className="text-muted-foreground">
                    Página {page} de {totalPages}
                  </span>
                  <div className="space-x-2">
                    <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                      Anterior
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do evento</DialogTitle>
            <DialogDescription>
              {detail && new Date(detail.occurred_at).toLocaleString("pt-BR")} · cid {detail?.cid ?? "—"}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Origem:</span> {detail.source ?? "—"}</div>
                <div><span className="text-muted-foreground">Componente:</span> {detail.component ?? "—"}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Rota:</span> <code>{detail.route || "—"}</code></div>
                <div className="col-span-2"><span className="text-muted-foreground">Mensagem:</span> {detail.cleanMessage}</div>
                <div className="col-span-2 text-xs text-muted-foreground break-all">UA: {detail.user_agent || "—"}</div>
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => copyStack(detail)}>
                  <Copy className="w-4 h-4 mr-2" /> Copiar stack
                </Button>
              </div>
              <pre className="text-xs bg-muted p-3 rounded max-h-[40vh] overflow-auto whitespace-pre-wrap break-words">
{detail.stack || "(sem stack)"}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
