import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import type { Evento } from "./agsp";

const NIVEL_LABEL: Record<string, string> = {
  critico: "CRITICO",
  atencao: "ATENCAO",
  info: "INFO",
};

/**
 * Gera o relatório de ocorrências do turno em PDF, no formato de parte diária:
 * cabeçalho da unidade, resumo quantitativo e a trilha completa de auditoria.
 */
export function gerarRelatorioPdf(eventos: Evento[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const largura = doc.internal.pageSize.getWidth();
  const agora = new Date();
  const carimbo = agora.toLocaleString("pt-BR");

  // Cabeçalho
  doc.setFillColor(14, 20, 30);
  doc.rect(0, 0, largura, 76, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("PMAC · AGSP — CENTRO DE OPERACOES DA GUARDA", 40, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(170, 200, 215);
  doc.text("Arsenal de Guerra de Sao Paulo — Relatorio de ocorrencias do PDA", 40, 52);
  doc.text(`Emitido em ${carimbo}`, 40, 66);

  // Resumo
  const acionamentos = eventos.filter((e) => e.categoria === "PDA").length;
  const tratativas = eventos.filter((e) => e.categoria === "Tratativa").length;
  const criticos = eventos.filter((e) => e.nivel === "critico").length;

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Resumo do turno", 40, 106);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    [
      `Registros no periodo: ${eventos.length}`,
      `Acionamentos de PDA: ${acionamentos}`,
      `Tratativas concluidas: ${tratativas}`,
      `Eventos de nivel critico: ${criticos}`,
    ].join("    |    "),
    40,
    124,
  );

  autoTable(doc, {
    startY: 146,
    head: [["Hora", "Posto", "Categoria", "Nivel", "Ocorrencia", "Responsavel", "Motivo"]],
    body: eventos.map((e) => [
      e.hora,
      e.posto,
      e.categoria,
      NIVEL_LABEL[e.nivel] ?? e.nivel.toUpperCase(),
      e.mensagem,
      e.responsavel,
      e.motivo,
    ]),
    styles: { fontSize: 8.5, cellPadding: 5, lineColor: [210, 216, 222], lineWidth: 0.4 },
    headStyles: { fillColor: [18, 30, 44], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [244, 247, 250] },
    columnStyles: {
      0: { cellWidth: 52 },
      1: { cellWidth: 46 },
      2: { cellWidth: 58 },
      3: { cellWidth: 50 },
      5: { cellWidth: 74 },
      6: { cellWidth: 84 },
    },
    margin: { left: 40, right: 40 },
  });

  if (!eventos.length) {
    const y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 160;
    doc.setFontSize(10);
    doc.setTextColor(110, 110, 110);
    doc.text("Nenhuma ocorrencia registrada nesta sessao.", 40, y + 22);
  }

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      "Documento gerado automaticamente pelo painel do Centro de Operacoes — uso interno.",
      40,
      doc.internal.pageSize.getHeight() - 24,
    );
    doc.text(
      `Pagina ${i}/${total}`,
      largura - 40,
      doc.internal.pageSize.getHeight() - 24,
      { align: "right" },
    );
  }

  const nome = `relatorio-ocorrencias-agsp-${agora.toISOString().slice(0, 19).replace(/[:T]/g, "")}.pdf`;
  doc.save(nome);
}
