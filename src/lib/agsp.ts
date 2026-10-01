export type PostoId = "1" | "2" | "3" | "4" | "5" | "6";

export interface Posto {
  id: PostoId;
  codigo: string;
  nome: string;
  lat: number;
  lon: number;
  /** posição do pino sobre a imagem de satélite, em % */
  x: number;
  y: number;
}

export const POSTOS: Posto[] = [
  {
    id: "1",
    codigo: "P-01",
    nome: "Posto 1",
    lat: -23.51435,
    lon: -46.86842,
    x: 33.6,
    y: 70.2,
  },
  {
    id: "2",
    codigo: "P-02",
    nome: "Posto 2",
    lat: -23.51266,
    lon: -46.86674,
    x: 65.4,
    y: 51.6,
  },
  {
    id: "3",
    codigo: "P-03",
    nome: "Posto 3",
    lat: -23.51154,
    lon: -46.86693,
    x: 70.1,
    y: 32.4,
  },
  {
    id: "4",
    codigo: "P-04",
    nome: "Posto 4",
    lat: -23.51041,
    lon: -46.86644,
    x: 69.8,
    y: 17,
  },
  {
    id: "5",
    codigo: "P-05",
    nome: "Posto 5",
    lat: -23.51053,
    lon: -46.8699,
    x: 29.8,
    y: 13.9,
  },
  {
    id: "6",
    codigo: "P-06",
    nome: "Posto 6",
    lat: -23.51244,
    lon: -46.8697,
    x: 33.9,
    y: 46.8,
  },
];

export const POSTO_BY_ID = Object.fromEntries(POSTOS.map((p) => [p.id, p])) as Record<
  PostoId,
  Posto
>;

/** Central Tática — referência fixa no terreno */
export const CT = { x: 46.2, y: 46.7 };


export const MOTIVOS = [
  "Falso positivo / teste",
  "Situação controlada no local",
  "Apoio acionado e estabilizado",
  "Falha técnica no acionador",
  "Encerramento após inspeção",
  "Outro",
] as const;

export type Nivel = "critico" | "info" | "atencao";

export interface Evento {
  id: string;
  hora: string;
  posto: string;
  categoria: string;
  nivel: Nivel;
  mensagem: string;
  responsavel: string;
  motivo: string;
}

export const TELAS = ["Visão Geral", "Mapa", "Quadros", "Auditoria"] as const;
export type Tela = (typeof TELAS)[number];
