/**
 * Heuristic auto-tagging of pages/sections.
 * The LLM step further refines these — this gives a reliable static baseline.
 */
const RULES = [
  { tag: 'billing', re: /\b(billing|invoice|invoices|subscription|subscriptions|plan|plans|pricing|payment|payments|checkout|stripe)\b/i },
  { tag: 'usage', re: /\b(usage|quota|limits|metering|consumption)\b/i },
  { tag: 'team', re: /\b(team|teams|members|workspace|organization|organisation|org)\b/i },
  { tag: 'permissions', re: /\b(permissions?|roles?|access|rbac|policy|policies)\b/i },
  { tag: 'api-keys', re: /\b(api[-_ ]?keys?|tokens?|credentials?|service[-_ ]?accounts?)\b/i },
  { tag: 'integrations', re: /\b(integrations?|webhooks?|connect(ions?)?|connectors?)\b/i },
  { tag: 'security', re: /\b(security|2fa|mfa|password|sso|saml|oauth)\b/i },
  { tag: 'notifications', re: /\b(notifications?|alerts?|emails?|preferences)\b/i },
  { tag: 'onboarding', re: /\b(onboard(ing)?|welcome|getting[-_ ]?started|setup|wizard)\b/i },
  { tag: 'settings', re: /\b(settings?|preferences?|profile|account)\b/i },
  { tag: 'analytics', re: /\b(analytics|insights|reports?|dashboard|metrics)\b/i },
];

export function categorize(route, data) {
  const haystack = [
    route,
    ...(data?.interactive || []).map((x) => x.label || ''),
    ...(data?.visuals || []).map((x) => x.label || ''),
    ...(data?.links || []),
  ]
    .join(' ')
    .toLowerCase();
  const tags = new Set();
  for (const r of RULES) if (r.re.test(haystack)) tags.add(r.tag);
  return [...tags];
}
