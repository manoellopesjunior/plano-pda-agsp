import { useEffect, useState } from "react";
import { OpsButton } from "./primitives";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Botão de instalação do painel como aplicativo (PWA) nas máquinas do
 * quartel ou nos celulares dos responsáveis.
 */
export function InstallButton() {
  const [prompt, setPrompt] = useState<BIPEvent | null>(null);
  const [instalado, setInstalado] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalado(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalado(true);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (instalado || !prompt) return null;

  return (
    <OpsButton
      variant="signal"
      onClick={async () => {
        await prompt.prompt();
        await prompt.userChoice;
        setPrompt(null);
      }}
    >
      Instalar aplicativo
    </OpsButton>
  );
}
