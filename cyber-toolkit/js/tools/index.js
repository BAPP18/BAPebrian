import { initPasswordTool } from './password.js?v=1';
import { initLogAnalyzer } from './log.js?v=1';
import { initPhishingDetector } from './phishing.js?v=1';
import { initPortScanner } from './port.js?v=1';
import { initVulnScanner } from './vuln.js?v=1';

export function initAllTools() {
  initPasswordTool();
  initLogAnalyzer();
  initPhishingDetector();
  initPortScanner();
  initVulnScanner();
}