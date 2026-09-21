import { initDNSLookup } from './dns.js?v=1';
import { initSecurityHeaders } from './headers.js?v=1';
import { initJWTHashInspector } from './jwt.js?v=1';
import { initEnumeration } from './enum.js?v=1';
import { initHTTPRepeater } from './repeater.js?v=1';
import { initAttackSurface } from './attack-surface.js?v=1';
import { initCSRFGen } from './csrf.js?v=1';

export function initAllTools() {
  initDNSLookup();
  initSecurityHeaders();
  initJWTHashInspector();
  initEnumeration();
  initHTTPRepeater();
  initAttackSurface();
  initCSRFGen();
}