import { loadLib } from '../lib-loader.js?v=1';
import { parseExcelArrayBuffer } from './excel-parser.js?v=1';
import { parsePDFArrayBuffer } from './pdf-parser.js?v=1';
import { parseDOCXArrayBuffer } from './docx-parser.js?v=1';
import { parseTextExtraction } from './txt-parser.js?v=1';

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export async function analyzeDocuments(files) {
  const docs = [];
  const extractions = [];
  const warnings = [];
  for (const file of files) {
    const meta = { name: file.name, size: file.size, type: fileExt(file.name) };
    const entry = { ...meta, status: 'ok', message: '' };
    if (file.size === 0) {
      entry.status = 'error';
      entry.message = 'File is empty.';
      warnings.push(`${file.name}: empty file.`);
      docs.push(entry);
      continue;
    }
    if (file.size > MAX_FILE_SIZE) {
      entry.status = 'error';
      entry.message = 'File exceeds 20 MB maximum.';
      warnings.push(`${file.name}: exceeds 20 MB.`);
      docs.push(entry);
      continue;
    }
    if (meta.type === 'doc') {
      entry.status = 'error';
      entry.message = 'Legacy .doc is not supported. Please convert to .docx.';
      warnings.push(`${file.name}: legacy .doc unsupported.`);
      docs.push(entry);
      continue;
    }
    if (!['xlsx', 'xls', 'csv', 'pdf', 'docx', 'txt'].includes(meta.type)) {
      entry.status = 'error';
      entry.message = 'Unsupported file type.';
      warnings.push(`${file.name}: unsupported type.`);
      docs.push(entry);
      continue;
    }
    try {
      const buf = await file.arrayBuffer();
      let ext = null;
      if (meta.type === 'xlsx' || meta.type === 'xls') {
        await loadLib('xlsx');
        ext = parseExcelArrayBuffer(buf, meta);
      } else if (meta.type === 'pdf') {
        await loadLib('pdfjs');
        ext = await parsePDFArrayBuffer(buf, meta);
      } else if (meta.type === 'docx') {
        await loadLib('docx');
        ext = await parseDOCXArrayBuffer(buf, meta);
      } else if (meta.type === 'csv') {
        const text = decodeText(buf);
        ext = parseTextExtraction(text, meta.name);
      } else {
        const text = decodeText(buf);
        ext = parseTextExtraction(text, meta.name);
      }
      extractions.push({ meta, ext });
      if (ext.warnings && ext.warnings.length) {
        entry.status = 'warning';
        entry.message = ext.warnings[0];
        warnings.push(...ext.warnings.map((w) => `${meta.name}: ${w}`));
      }
      if (ext.scanned) {
        entry.status = 'warning';
        entry.message = 'Scanned/image-based PDF — limited text.';
        warnings.push(`${meta.name}: scanned PDF, limited extraction.`);
      }
    } catch (err) {
      entry.status = 'error';
      entry.message = 'Processing failed.';
      warnings.push(`${meta.name}: failed to process (${err.message || 'unknown error'}).`);
    }
    docs.push(entry);
  }
  return { docs, extractions, warnings };
}

function fileExt(name) {
  const parts = String(name || '').split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

function decodeText(buf) {
  const bytes = new Uint8Array(buf);
  try {
    const ascii = new TextDecoder('utf-8').decode(bytes);
    if (ascii.includes('\uFFFD') && bytes.length > 0) {
      return new TextDecoder('iso-8859-1').decode(bytes);
    }
    return ascii;
  } catch (e) {
    return new TextDecoder('iso-8859-1').decode(bytes);
  }
}