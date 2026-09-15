import { parseTextExtraction } from './txt-parser.js?v=1';

export async function parseDOCXArrayBuffer(arrayBuffer, fileMeta) {
  const empty = { name: null, objective: null, description: null, startDate: null, endDate: null, budget: null, status: null, progress: null, plannedProgress: null, tasks: [], risks: [], milestones: [], stakeholders: [], issues: [], resources: [], notes: [], warnings: [], scanned: false };
  try {
    const text = await window.mammoth.extractRawText({ arrayBuffer });
    if (!text.value || !text.value.trim()) {
      empty.warnings.push('DOCX produced no readable text.');
      return empty;
    }
    const extracted = parseTextExtraction(text.value, fileMeta && fileMeta.name ? fileMeta.name : 'DOCX');
    extracted.scanned = false;
    extracted.notes.push('DOCX parsed (Mammoth).');
    return extracted;
  } catch (err) {
    empty.warnings.push(`Invalid DOCX: ${fileMeta && fileMeta.name ? fileMeta.name : 'file'} could not be processed.`);
    return empty;
  }
}