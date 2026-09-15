import { parseTextExtraction } from './txt-parser.js?v=1';

export async function parsePDFArrayBuffer(arrayBuffer, fileMeta) {
  const pdfjsLib = window.pdfjsLib;
  const empty = { name: null, objective: null, description: null, startDate: null, endDate: null, budget: null, status: null, progress: null, plannedProgress: null, tasks: [], risks: [], milestones: [], stakeholders: [], issues: [], resources: [], notes: [], warnings: [], scanned: false };
  try {
    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const pageTexts = [];
    for (let p = 1; p <= Math.min(doc.numPages, 60); p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const text = groupText(content);
      pageTexts.push(text);
    }
    const full = pageTexts.join('\n');
    const chars = full.replace(/\s/g, '').length;
    const scanned = doc.numPages > 0 && chars / doc.numPages < 60;
    if (scanned) {
      empty.scanned = true;
      empty.warnings.push('Text extraction was limited because this PDF appears to be scanned/image-based.');
      return empty;
    }
    const extracted = parseTextExtraction(full, fileMeta && fileMeta.name ? fileMeta.name : 'PDF');
    extracted.scanned = false;
    extracted.notes.push(`PDF parsed: ${doc.numPages} page(s), ${pageTexts.length} page(s) read.`);
    return extracted;
  } catch (err) {
    empty.warnings.push(`Invalid PDF: ${fileMeta && fileMeta.name ? fileMeta.name : 'file'} could not be processed.`);
    return empty;
  }
}

function groupText(content) {
  const lines = [];
  let lastY = null;
  let line = '';
  for (const item of content.items) {
    if (!item.str) continue;
    const y = item.transform ? item.transform[5] : 0;
    if (lastY !== null && Math.abs(y - lastY) > 2) {
      lines.push(line);
      line = '';
    }
    line += item.str + (item.hasEOL ? ' ' : ' ');
    lastY = y;
  }
  if (line) lines.push(line);
  return lines.join('\n');
}