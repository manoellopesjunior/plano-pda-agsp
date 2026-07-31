import { useCallback, useEffect, useRef, useState } from "react";
import type { PostoId } from "@/lib/agsp";

/**
 * Megafone da guarda: enquanto houver posto acionado, todos os terminais
 * repetem em voz alta "PDA POSTO N" — precedido de um bip estridente —
 * até que a ocorrência seja tratada.
 */
const STORAGE_KEY = "agsp:som";

export function useSirene(alertas: PostoId[]) {
  const [somAtivo, setSomAtivo] = useState(true);
  const [disponivel, setDisponivel] = useState(false);
  const rodando = useRef(false);
  const alertasRef = useRef<PostoId[]>([]);
  const ativoRef = useRef(true);
  const ctxRef = useRef<AudioContext | null>(null);
  const idx = useRef(0);

  alertasRef.current = alertas;
  ativoRef.current = somAtivo;

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDisponivel("speechSynthesis" in window);
    const salvo = window.localStorage.getItem(STORAGE_KEY);
    if (salvo === "off") setSomAtivo(false);
  }, []);

  const bip = useCallback(() => {
    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) return;
      ctxRef.current ??= new Ctx();
      const ctx = ctxRef.current;
      if (ctx.state === "suspended") void ctx.resume();
      const t0 = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(880, t0);
      osc.frequency.linearRampToValueAtTime(1560, t0 + 0.22);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.16, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.32);
    } catch {
      /* áudio indisponível */
    }
  }, []);

  const falar = useCallback((texto: string, aoTerminar: () => void) => {
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = "pt-BR";
    u.rate = 1.05;
    u.pitch = 0.4; // voz robótica, grave e estridente
    u.volume = 1;
    u.onend = aoTerminar;
    u.onerror = aoTerminar;
    window.speechSynthesis.speak(u);
  }, []);

  const ciclo = useCallback(() => {
    const lista = alertasRef.current;
    if (!lista.length || !ativoRef.current) {
      rodando.current = false;
      return;
    }
    const posto = lista[idx.current % lista.length];
    idx.current += 1;
    bip();
    window.setTimeout(() => {
      if (!alertasRef.current.length || !ativoRef.current) {
        rodando.current = false;
        return;
      }
      falar(`P D A. Posto ${posto}.`, () => {
        window.setTimeout(ciclo, 500);
      });
    }, 340);
  }, [bip, falar]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (alertas.length && somAtivo && !rodando.current) {
      rodando.current = true;
      idx.current = 0;
      ciclo();
    }
    if ((!alertas.length || !somAtivo) && rodando.current) {
      rodando.current = false;
      window.speechSynthesis.cancel();
    }
    if (!alertas.length) window.speechSynthesis.cancel();
  }, [alertas, somAtivo, ciclo]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const alternarSom = useCallback(() => {
    setSomAtivo((v) => {
      const novo = !v;
      window.localStorage.setItem(STORAGE_KEY, novo ? "on" : "off");
      if (!novo) window.speechSynthesis.cancel();
      return novo;
    });
  }, []);

  /** Teste de megafone de um posto específico (checagem de equipamento). */
  const testar = useCallback(
    (posto: PostoId) => {
      bip();
      window.setTimeout(() => falar(`P D A. Posto ${posto}.`, () => {}), 340);
    },
    [bip, falar],
  );

  return { somAtivo, alternarSom, disponivel, testar };
}
