import { useState } from "react";
import { MOTIVOS, POSTO_BY_ID, type PostoId } from "@/lib/agsp";
import { OpsButton } from "./primitives";

interface Props {
  alvo: PostoId | "todos";
  onConfirmar: (responsavel: string, motivo: string, detalhe: string) => void;
  onCancelar: () => void;
}

export function TratativaForm({ alvo, onConfirmar, onCancelar }: Props) {
  const [responsavel, setResponsavel] = useState("");
  const [motivo, setMotivo] = useState<string>(MOTIVOS[0]);
  const [detalhe, setDetalhe] = useState("");
  const [erro, setErro] = useState(false);

  const titulo =
    alvo === "todos"
      ? "Limpeza geral da central"
      : `Desarme do Posto ${alvo} — ${POSTO_BY_ID[alvo].nome}`;

  return (
    <form
      className="border border-warn/45 border-l-4 border-l-warn bg-warn/8 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!responsavel.trim()) {
          setErro(true);
          return;
        }
        onConfirmar(responsavel.trim(), motivo, detalhe);
      }}
    >
      <h3 className="font-display text-lead font-bold tracking-[0.12em] uppercase text-warn">
        Tratativa obrigatória
      </h3>
      <p className="mt-1 text-base2 text-muted-foreground">{titulo}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="label-mono">Responsável *</span>
          <input
            value={responsavel}
            onChange={(e) => {
              setResponsavel(e.target.value);
              setErro(false);
            }}
            placeholder="Posto/Graduação e nome de guerra"
            aria-invalid={erro}
            className="border border-line bg-panel-2 px-3 py-2 text-base2 text-foreground placeholder:text-muted-foreground/60 focus:border-signal focus:outline-none aria-[invalid=true]:border-alert"
          />
        </label>

        <label className="grid gap-1.5">
          <span className="label-mono">Motivo *</span>
          <select
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="border border-line bg-panel-2 px-3 py-2 text-base2 text-foreground focus:border-signal focus:outline-none"
          >
            {MOTIVOS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 sm:col-span-2">
          <span className="label-mono">Detalhamento</span>
          <textarea
            value={detalhe}
            onChange={(e) => setDetalhe(e.target.value)}
            rows={2}
            placeholder="Descrição da providência adotada"
            className="resize-none border border-line bg-panel-2 px-3 py-2 text-base2 text-foreground placeholder:text-muted-foreground/60 focus:border-signal focus:outline-none"
          />
        </label>
      </div>

      {erro && (
        <p className="mt-3 font-mono text-micro tracking-[0.08em] uppercase text-alert">
          Informe o responsável para registrar a tratativa.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          className="inline-flex items-center justify-center border border-warn/70 bg-warn/20 px-4 py-2 font-display text-base2 font-semibold tracking-[0.1em] uppercase text-warn transition-colors hover:bg-warn/30"
        >
          Confirmar
        </button>
        <OpsButton onClick={onCancelar}>Cancelar</OpsButton>
      </div>
    </form>
  );
}
