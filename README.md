# PMAC · AGSP — Centro de Operações da Guarda

Painel operacional tático para o **Arsenal de Guerra de São Paulo (AGSP)**, desenvolvido para a guarda do quartel. O sistema concentra em uma única tela o mapa tático do perímetro (6 postos sobre ortofoto real), o quadro de postos, o circuito de câmeras, o acionamento de PDA (Pedido de Apoio) com megafone sonoro por posto, a trilha de auditoria e a gestão de acessos.

**Aplicação publicada**: <https://plano-pda-agsp.lovable.app>

---

## Índice

1. [O que o sistema faz](#o-que-o-sistema-faz)
2. [Como foi desenvolvido](#como-foi-desenvolvido)
3. [Arquitetura técnica](#arquitetura-técnica)
4. [Como rodar localmente](#como-rodar-localmente)
5. [Histórico de evolução (por commit)](#histórico-de-evolução-por-commit)
6. [Papéis e permissões](#papéis-e-permissões)
7. [Segurança](#segurança)

---

## O que o sistema faz

O painel simula e substitui o quadro físico de posto de uma guarda de quartel. Cada um dos **6 postos** do perímetro do AGSP é monitorado em tempo real:

- **Mapa tático** — ortofoto real do arsenal com pinos dos 6 postos. Ao acionar um PDA, o pino do posto invadido fica **vermelho** (crítico) e todos os outros postos piscam em **laranja** (atenção/prevenção), avisando a toda a guarda onde está ocorrendo a invasão.
- **Quadro de Postos** — régua com o estado de cada posto (Normal / Atenção / Crítico), com cor + rótulo textual + barra lateral (sempre dois canais de alerta, nunca só cor).
- **Megafone / Sirene por posto** — quando o PDA do posto *N* é acionado, **todos** os postos emitem em loop uma voz robótica estridente anunciando *"PDA POSTO N"*, repetidamente, até a tratativa ser concluída. Cada posto tem sua própria sirene (voz distinta por número).
- **Câmeras** — circuito simulado de 6 canais, com destaque do posto selecionado.
- **Tratativa obrigatória** — nenhum alerta é descartado sem responsável, motivo e detalhe. O registro fica na trilha de auditoria.
- **Auditoria** — trilha imutável de todos os acionamentos e tratativas (quem, quando, onde, por quê), substituindo o livro de parte físico. Exportável como PDF ("Parte Diária").
- **Gestão de acessos** — painel administrativo restrito ao perfil **Administrador**, com criação/edição de usuários, definição de posto vinculado (1–6) e reset de senha.
- **PWA instalável** — pode ser instalado como aplicativo nas máquinas do quartel ou nos celulares dos responsáveis, para acesso remoto.

---

## Como foi desenvolvido

O projeto começou a partir de um protótipo em **Python/Streamlit** feito pelo autor (Manoel Junior), que servia de prova de conceito mas tinha layout inconsistente, fontes caóticas e animações excessivas. Foi decidido **reconstruir o painel como aplicação web React** dentro do [Lovable](https://lovable.dev), mantendo a lógica operacional do original mas com uma identidade visual tática coesa e profissional.

A identidade visual foi desenhada como um **tema tático dark único** (sem tema claro): fundo `oklch(0.145 0.021 252)`, sinal ciano, alerta vermelho, OK verde, cantos **sempre retos** (`--radius: 0`), tipografia em **Rajdhani** (display), **Source Sans 3** (corpo) e **IBM Plex Mono** (rótulos/instrumentação), numa escala tipográfica de 5 degraus e espaçamento em grade de 4px. A animação é restrita ao que está em alerta, com varredura lenta e discreta do mapa, e respeita `prefers-reduced-motion`.

O desenvolvimento seguiu por etapas incrementais (ver [histórico de evolução](#histórico-de-evolução-por-commit)): protótipo visual → mapa e PDF → sirene por posto + PWA → autenticação completa com Supabase → correções de segurança → ajustes de permissões e UI → persistência e sincronização em tempo real dos alertas.

---

## Arquitetura técnica

| Camada | Tecnologia |
| --- | --- |
| Framework | **TanStack Start v1** (React 19 full-stack, SSR/SSG) |
| Build | **Vite 8** |
| Estilo | **Tailwind CSS v4** via `src/styles.css` (tokens `oklch`, sem `tailwind.config`) |
| Backend / Auth / Realtime | **Lovable Cloud** (Supabase — Postgres, Auth, Realtime, RLS) |
| Componentes UI | **shadcn/ui** + Radix UI |
| Relatório PDF | **jsPDF** + jspdf-autotable |
| Áudio (megafone) | **Web Speech API** + **Web Audio API** |
| PWA | `manifest.webmanifest` + service worker (`public/sw.js`) |

### Estrutura principal

```
src/
├─ components/ops/
│  ├─ TacticalMap.tsx     # mapa tático com pinos sobre a ortofoto
│  ├─ MonitorBoard.tsx    # quadro de postos (régua de estado)
│  ├─ CameraGrid.tsx      # circuito de câmeras + miniaturas
│  ├─ AuditLog.tsx        # trilha de auditoria
│  ├─ TratativaForm.tsx   # formulário de tratativa (responsável/motivo/detalhe)
│  ├─ Siren.tsx           # indicador de sirene ativa
│  ├─ InstallButton.tsx  # botão de instalação PWA
│  └─ primitives.tsx      # Chip / StatusMsg / OpsButton / SectionTitle
├─ hooks/
│  ├─ useAuth.ts          # sessão Supabase + perfil + papel + logout seguro
│  ├─ useOps.ts           # estado dos alertas/eventos + Supabase Realtime
│  └─ useSirene.ts        # voz robótica + bipes em loop por posto
├─ lib/
│  ├─ agsp.ts             # dados dos 6 postos (coords, nomes, posicionamento)
│  ├─ permissoes.ts       # regras de autorização (admin/oficial/comum)
│  ├─ admin.shared.ts     # schemas Zod + verificação de admin (server-side)
│  ├─ admin.functions.ts  # server functions de gestão de usuários
│  └─ relatorio.ts        # geração do PDF "Parte Diária"
└─ routes/
   ├─ __root.tsx          # shell + fontes + metadata global
   ├─ auth.tsx            # login (client-only)
   ├─ reset-password.tsx # recuperação de senha
   ├─ _authenticated/
   │  ├─ route.tsx        # gate de autenticação (redireciona para /auth)
   │  ├─ index.tsx       # Centro de Operações (o painel)
   │  └─ admin.tsx       # painel administrativo de usuários
   └─ api/public/        # endpoints públicos (webhooks/cron)
```

### Banco de dados (Lovable Cloud)

- `profiles` — dados do usuário (nome, email, posto, `posto_id` 1–6, `ativo`), com trigger que impede auto-reativação/troca de e-mail por não-admin.
- `user_roles` — papéis (`admin` / `oficial` / `comum`), com RLS de escrita restrita a admin.
- `pda_alertas` — alertas de PDA ativos (um por posto), com RLS.
- `pda_eventos` — trilha de auditoria imutável (acionamentos + tratativas), com RLS.
- Função `private.has_role` (security definer, fora da API pública) usada pelas políticas RLS.

---

## Como rodar localmente

Pré-requisitos: Node.js 20+ (recomendado via [nvm](https://github.com/nvm-sh/nvm#installing-and-updating)).

```sh
git clone <este-repositório>
cd <repositório>
npm i
npm run dev
```

> As variáveis de ambiente do backend (URL e chave publicável do Lovable Cloud) já estão configuradas no projeto. Não é necessário criar `.env` manualmente.

---

## Histórico de evolução (por commit)

O sistema evoluiu em marcos. Abaixo, os principais commits e o que cada um mudou.

### 1. Protótipo tático (`e2cb55c` — Atualizou mapa e PDF, 2026-07-30)
- Reconstrução do painel em React (saída do protótipo Streamlit).
- Tema tático dark único em `src/styles.css` (tokens `oklch`, cantos retos, Rajdhani/IBM Plex Mono).
- Dados dos 6 postos em `src/lib/agsp.ts` sobre ortofoto real do AGSP.
- Hook `useOps.ts` com estado em memória dos alertas e eventos.
- Componentes táticos: `TacticalMap`, `MonitorBoard`, `CameraGrid`, `AuditLog`, `TratativaForm`.
- Geração do relatório PDF ("Parte Diária") via `src/lib/relatorio.ts`.

### 2. Avaliação e ajustes visuais (`bb351b1` — Avaliou sistema tático completo, 2026-07-30)
- Revisão geral do layout, escala tipográfica e espaçamento.
- Lógica de prevenção: posto invadido em **vermelho**, demais em **laranja**.
- Simplificação dos quadros (CT e Guarda) para "Posto 1..6".
- Explicação da auditoria no painel.

### 3. Sirene por posto + PWA (`e78406b` — Adicionou sirene por posto e PWA, 2026-07-31)
- `src/hooks/useSirene.ts`: voz robótica em loop *"PDA POSTO N"* + bipes estridentes via Web Speech/Web Audio.
- Cada posto tem sua própria sirene, que toca em **todos** os postos ao acionar.
- PWA: `public/manifest.webmanifest`, `public/sw.js` e ícones.
- `InstallButton.tsx` para instalação em desktop/celular.
- Megafone integrado à barra de ações do painel.

### 4. Autenticação completa (`1bca562` — Adicionou autenticação completa, 2026-08-04)
- Backend Lovable Cloud ativado (Postgres + Auth + RLS).
- Migrações: tipo `app_role`, tabelas `profiles` e `user_roles`, função `has_role`, trigger `handle_new_user`.
- `src/hooks/useAuth.ts`: sessão, perfil, papel, logout seguro (limpa estado + `replace`).
- Rotas protegidas em `src/routes/_authenticated/route.tsx`.
- Tela de login (`auth.tsx`), recuperação de senha (`reset-password.tsx`) e painel admin (`admin.tsx`).
- `src/lib/admin.functions.ts`: gestão de usuários via server functions.
- Admin padrão semeado via endpoint temporário (removido em seguida).
- Cadastros públicos desativados; mensagens de erro genéricas no login.

### 5. Correções de segurança (`e6154b0` — Fixed auth security issues, 2026-08-10)
- Função `has_role` movida para o schema `private`, EXECUTE revogado do público — impede RPC direto.
- Trigger `guard_profile_sensitive_columns` impede que usuário desativado reative a própria conta ou troque e-mail.
- Políticas explícitas de INSERT/UPDATE/DELETE em `user_roles`, restritas a admin.
- `exigirAdmin` refatorado para consulta direta à tabela.

### 6. Ajustes de permissões e UI (`04a28dc` — Corrigiu e ajustou o sistema, 2026-08-10)
- Papel `sentinela` renomeado para `comum`.
- Coluna `posto_id` (1–6) em `profiles` para vincular oficiais a um posto.
- `src/lib/permissoes.ts` centraliza as regras: admin tudo; oficial só seu posto; comum só leitura.
- Logout confiável (limpa sessão + estado local + `replace`).
- `/admin` com Nome Completo, Posto/Graduação e Posto Vinculado.
- Quadro único de postos; remoção completa de exportação CSV.

### 7. Layout do MonitorBoard (`f8ef00f` — Atualizou layout do MonitorBoard, 2026-08-11)
- `destaque` no `MonitorBoard` para aumentar fonte do quadro.
- Visão Geral: câmeras abaixo do Quadro de Postos; teste de megafone oculto para Comum.
- Aba Quadros: fonte ampliada e centralizada; sem "Situação operacional" para Comum.

### 8. PWA no login (`4c96079` — Corrigiu PWA no login, 2026-08-11)
- Service worker não cachear rotas de autenticação.
- `auth.tsx` e `reset-password.tsx` como client-only (`ssr: false`) para evitar mismatch de hidratação.

### 9. Alertas sincronizados ao banco (`e90d766` — Alertas sincronizados ao banco, 2026-08-11)
- Alertas e auditoria passam a viver no Postgres (`pda_alertas`, `pda_eventos`) — sobrevivem a F5.
- Sincronização em tempo real entre todos os dispositivos via **Supabase Realtime**.
- Reconciliação automática ao reabrir a aba (rede instável / aparelho suspenso).
- Tratativa obrigatória registrada como evento de auditoria.

---

## Papéis e permissões

| Papel | Acionar PDA | Tratar / Resetar central | Gestão de usuários |
| --- | --- | --- | --- |
| **Administrador** | Todos os 6 postos | Qualquer posto + resetar central | Sim (`/admin`) |
| **Oficial (Posto/Oficial de Dia)** | Apenas o posto vinculado (1–6) | Apenas o posto vinculado | Não |
| **Comum** | Não (somente visualização) | Não | Não |

As regras vivem em `src/lib/permissoes.ts` e são aplicadas tanto na UI quanto no hook `useOps`. A verificação de admin no backend é server-side (`exigirAdmin`), nunca baseada em `localStorage`.

---

## Segurança

- **Row Level Security** ativa em todas as tabelas públicas.
- Verificação de papel server-side (função `private.has_role`, fora da API pública).
- Usuário desativado não consegue reativar a própria conta nem trocar e-mail (trigger).
- Apenas admin altera papéis (RLS de escrita em `user_roles`).
- Logout seguro encerra a sessão no backend e limpa o estado local.
- Mensagens de erro genéricas no login (evita enumeração de contas).
- Cadastros públicos desativados; criação de usuário só pelo painel admin.

---

## Build with Lovable

Este projeto foi construído com o [Lovable](https://lovable.dev). Continue o desenvolvimento no [editor](https://lovable.dev/projects/88cf6190-b1e3-4304-8809-d5f0e9eb8ba4).

- **Ship faster**: descreva o que quer construir e o Lovable gera o código.
- **Stay in sync**: cada mudança no Lovable é commitada direto neste repositório.
- **Full ownership**: o código é seu — push para `main` no GitHub e as alterações sincronizam de volta ao Lovable.
