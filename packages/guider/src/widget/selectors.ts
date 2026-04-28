export type SelectorCandidate =
  | string
  | {
      kind?: 'css' | 'data-guider' | 'testid' | 'aria' | 'role-name' | 'text';
      value?: string;
      role?: string;
      name?: string;
      tag?: string;
    };

type RankedMatch = {
  el: HTMLElement;
  matched: SelectorCandidate;
  score: number;
};

const KIND_WEIGHT: Record<string, number> = {
  'data-guider': 100,
  testid: 90,
  aria: 82,
  'role-name': 74,
  text: 60,
  css: 42,
};

export function findElement(candidates?: SelectorCandidate[] | null) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const matches: RankedMatch[] = [];
  for (const candidate of candidates) {
    const resolved = resolveCandidate(candidate);
    for (const element of resolved) {
      if (!isVisible(element)) continue;
      matches.push({
        el: element,
        matched: candidate,
        score: scoreElement(candidate, element),
      });
    }
  }

  matches.sort((left, right) => right.score - left.score);
  return matches[0] ? { el: matches[0].el, matched: matches[0].matched } : null;
}

function resolveCandidate(candidate: SelectorCandidate): HTMLElement[] {
  if (!candidate) return [];
  if (typeof candidate === 'string') {
    return querySelectorAllSafe(candidate);
  }

  switch (candidate.kind) {
    case 'css':
      return querySelectorAllSafe(candidate.value || '');
    case 'data-guider':
      return querySelectorAllSafe(`[data-guider="${cssEscape(candidate.value)}"]`);
    case 'testid':
      return querySelectorAllSafe(`[data-testid="${cssEscape(candidate.value)}"]`);
    case 'aria':
      return querySelectorAllSafe(`[aria-label="${cssEscape(candidate.value)}"]`);
    case 'role-name':
      return findByRoleName(candidate.role, candidate.name);
    case 'text':
      return findByText(candidate.value, candidate.tag);
    default:
      return [];
  }
}

function querySelectorAllSafe(selector: string) {
  if (!selector) return [];
  try {
    return Array.from(document.querySelectorAll<HTMLElement>(selector));
  } catch {
    return [];
  }
}

function findByRoleName(role?: string, name?: string) {
  if (!role || !name) return [];
  const query = String(name).trim().toLowerCase();
  if (!query) return [];
  const elements = document.querySelectorAll<HTMLElement>(`[role="${cssEscape(role)}"]`);
  return Array.from(elements).filter((element) => {
    const accessibleName = getAccessibleName(element).toLowerCase();
    return accessibleName === query || accessibleName.includes(query);
  });
}

function findByText(text?: string, tag?: string) {
  const query = String(text || '').trim().toLowerCase();
  if (!query) return [];

  const selector = tag || 'a, button, input, [role=button], [role=link], [role=tab], summary, label';
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).filter((element) => {
    const valueText = getAccessibleName(element).toLowerCase();
    return valueText === query || valueText.includes(query);
  });
}

function getAccessibleName(element: HTMLElement) {
  return (
    element.getAttribute('aria-label') ||
    (element instanceof HTMLInputElement ? element.value : '') ||
    element.textContent ||
    ''
  ).trim();
}

function scoreElement(candidate: SelectorCandidate, element: HTMLElement) {
  const kind = typeof candidate === 'string' ? 'css' : candidate.kind || 'css';
  const rect = element.getBoundingClientRect();
  const viewportArea = Math.max(1, window.innerWidth * window.innerHeight);
  const elementArea = Math.max(1, rect.width * rect.height);
  const areaScore = Math.min(18, (elementArea / viewportArea) * 240);
  const viewportScore = rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth ? 10 : 0;
  const occlusionPenalty = isOccluded(element) ? -50 : 0;
  const exactNameBonus = typeof candidate === 'object' && candidate.value
    ? getAccessibleName(element).toLowerCase() === candidate.value.toLowerCase()
      ? 12
      : 0
    : 0;
  return (KIND_WEIGHT[kind] || 0) + areaScore + viewportScore + exactNameBonus + occlusionPenalty;
}

function isVisible(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const styles = getComputedStyle(element);
  if (styles.visibility === 'hidden' || styles.display === 'none' || parseFloat(styles.opacity) === 0) {
    return false;
  }
  return rect.bottom >= 0 && rect.right >= 0 && rect.top <= window.innerHeight && rect.left <= window.innerWidth;
}

function isOccluded(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const points = [
    { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
    { x: rect.left + 8, y: rect.top + 8 },
    { x: rect.right - 8, y: rect.bottom - 8 },
  ].filter((point) => point.x >= 0 && point.y >= 0 && point.x <= window.innerWidth && point.y <= window.innerHeight);

  for (const point of points) {
    const topElement = document.elementFromPoint(point.x, point.y);
    if (!topElement) continue;
    if (topElement === element || element.contains(topElement)) {
      return false;
    }
  }
  return points.length > 0;
}

function cssEscape(value?: string) {
  return String(value || '').replace(/["\\]/g, '\\$&');
}