import sat from "@/assets/agsp-satelite.jpg.asset.json";
import { CT, type Posto, type PostoId } from "@/lib/agsp";
import { cn } from "@/lib/utils";

interface Props {
  postos: Posto[];
  emAlerta: (id: PostoId) => boolean;
  emPrevencao: (id: PostoId) => boolean;
  selecionado?: PostoId | null;
  onSelect?: (id: PostoId) => void;
  relogio: string;
  nAlertas: number;
}

export function TacticalMap({
  postos,
  emAlerta,
  emPrevencao,
  selecionado,
  onSelect,
  relogio,
  nAlertas,
}: Props) {
  return (
    <figure className="relative w-full overflow-hidden border border-signal/35 bg-[#02060c] shadow-[0_0_0_4px_var(--panel-2),0_24px_60px_-20px_rgba(0,0,0,.8)]">
      <div className="relative aspect-[1600/1570] w-full">
        <img
          src={sat.url}
          alt="Vista aérea do Arsenal de Guerra de São Paulo com os seis postos de sentinela"
          className="absolute inset-0 size-full object-cover brightness-[.82] saturate-[1.05] contrast-[1.05]"
          loading="eager"
        />

        {/* malha técnica */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(rgba(122,236,255,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(122,236,255,.045)_1px,transparent_1px)] bg-[length:12.5%_12.5%]"
        />
        {/* vinheta */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[3] bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,.55)_100%)]"
        />
        {/* varredura discreta */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-[3] overflow-hidden">
          <div className="scanline h-[14%] w-full bg-[linear-gradient(180deg,transparent,rgba(122,236,255,.035),transparent)]" />
        </div>

        {/* cantos de mira */}
        {(["tl", "tr", "bl", "br"] as const).map((c) => (
          <span
            key={c}
            aria-hidden
            className={cn(
              "pointer-events-none absolute z-[6] size-5 border-signal-soft/70",
              c === "tl" && "top-2 left-2 border-t-2 border-l-2",
              c === "tr" && "top-2 right-2 border-t-2 border-r-2",
              c === "bl" && "bottom-2 left-2 border-b-2 border-l-2",
              c === "br" && "bottom-2 right-2 border-b-2 border-r-2",
            )}
          />
        ))}

        {/* faixa superior de instrumentação */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[7] grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 bg-[linear-gradient(180deg,rgba(4,10,18,.9),transparent)] p-3 pl-8">
          <div className="min-w-0">
            <p className="truncate font-display text-base2 font-bold tracking-[0.16em] uppercase text-foreground">
              AGSP · Perímetro tático
            </p>
            <p className="label-mono mt-0.5 truncate">
              LAT −23.5126 · LON −46.8681 · {relogio}
            </p>
          </div>
          <div className="border border-signal/35 bg-[rgba(6,14,24,.85)] px-2 py-1 text-right">
            <p className="label-mono">Uptime</p>
            <p className="font-display text-base2 font-bold text-ok">99,8%</p>
          </div>
        </div>

        {/* Central Tática */}
        <div
          aria-hidden
          className="absolute z-[7] -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${CT.x}%`, top: `${CT.y}%` }}
        >
          <div className="flex flex-col items-center gap-1">
            <span className="size-2 rotate-45 border border-signal-soft bg-signal/40" />
            <span className="border border-signal/40 bg-[rgba(6,14,24,.85)] px-1.5 py-0.5 font-display text-micro font-bold tracking-[0.14em] text-signal-soft">
              CT
            </span>
          </div>
        </div>

        {/* pinos */}
        {postos.map((p) => {
          const on = emAlerta(p.id);
          const ativo = selecionado === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect?.(p.id)}
              aria-label={`Posto ${p.id} — ${p.nome}${on ? " — em alerta" : " — normal"}`}
              aria-pressed={ativo}
              className="absolute z-[8] -translate-x-1/2 -translate-y-full"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              <span className="relative flex flex-col items-center">
                {on && (
                  <span
                    className="absolute top-0 size-9 rounded-full border border-alert"
                    style={{ animation: "alert-ring 1.5s ease-out infinite" }}
                  />
                )}
                <span
                  className={cn(
                    "grid size-8 place-items-center rounded-full border-2 font-display text-base2 font-bold transition-colors",
                    on
                      ? "border-alert bg-alert text-[#170303]"
                      : "border-signal-soft bg-[rgba(6,20,30,.9)] text-signal-soft",
                    ativo && "ring-2 ring-signal ring-offset-2 ring-offset-[#02060c]",
                  )}
                >
                  {p.id}
                </span>
                <span
                  className={cn(
                    "h-3 w-px",
                    on ? "bg-alert" : "bg-signal-soft/70",
                  )}
                />
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    on ? "bg-alert" : "bg-signal-soft",
                  )}
                />
              </span>
            </button>
          );
        })}

        {/* rodapé de estado */}
        <div className="absolute inset-x-0 bottom-0 z-[7] grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 bg-[linear-gradient(180deg,transparent,rgba(4,10,18,.94))] px-3 pt-8 pb-2 pl-8">
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
            <span className="label-mono flex items-center gap-1.5">
              <i className="size-1.5 rounded-full bg-ok" /> Operacional
            </span>
            <span className="label-mono flex items-center gap-1.5">
              <i className="size-1.5 rounded-full bg-alert" /> Alerta
            </span>
          </div>
          <span
            className={cn(
              "shrink-0 font-mono text-micro font-semibold tracking-[0.12em] uppercase",
              nAlertas ? "text-alert" : "text-ok",
            )}
          >
            {nAlertas ? `${nAlertas} em alerta` : "6/6 normais"}
          </span>
        </div>
      </div>
    </figure>
  );
}
