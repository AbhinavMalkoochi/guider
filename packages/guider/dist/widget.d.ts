import * as React from 'react';

export interface SelectorCandidate {
  kind: 'data-guider' | 'testid' | 'aria' | 'role-name' | 'text' | 'css';
  value?: string;
  role?: string;
  name?: string;
  tag?: string;
}

export interface GuidanceTarget {
  title: string;
  body?: string;
  selectors: SelectorCandidate[];
  visualHint?: string;
  expectedRoute?: string | null;
}

export interface GuidanceResponse {
  summary?: string | null;
  immediateSpeech?: string | null;
  target: GuidanceTarget | null;
  routeIntent?: string | null;
  confidence: 'high' | 'medium' | 'low';
  fallbackMessage?: string | null;
}

export interface GuiderWidgetProps {
  /** OpenAI API key (dev). For production prefer `proxyUrl`. */
  apiKey?: string;
  /** Path or URL to your generated guider.map.json */
  mapUrl?: string;
  /** Or pass the parsed map object directly */
  map?: object;
  /** Override OpenAI model (default: 'gpt-5-nano-2025-08-07') */
  model?: string;
  /** Override OpenAI chat completions URL */
  endpoint?: string;
  /** Server-proxy plan endpoint (SSE). When set, `apiKey` is not needed. */
  proxyUrl?: string;
  /** Server-proxy whisper endpoint. When set, voice goes through your server. */
  whisperUrl?: string;
  /** Override route detection (defaults to window.location.pathname) */
  currentRoute?: string;
  /** Hex accent color (default: '#3080ff') */
  accent?: string;
  /** Enable speech synthesis output. Default true. */
  speak?: boolean;
}

export const GuiderWidget: React.FC<GuiderWidgetProps>;
export const GuiderProvider: React.FC<{ children: React.ReactNode; value?: any }>;
export function useGuider(): any;

export const agentMode: {
  available: boolean;
  run(args: {
    plan: {
      steps: Array<{
        title: string;
        body?: string;
        selectors: SelectorCandidate[];
        visualHint?: string;
        expectedRoute?: string | null;
        action?: { kind: 'click' | 'type' | 'select' | 'press'; value?: string; key?: string; clear?: boolean };
        value?: string;
      }>;
      confidence: 'high' | 'medium' | 'low';
      fallbackMessage?: string | null;
    };
    onProgress?: (event: {
      phase: 'starting' | 'completed' | 'failed';
      index: number;
      step: {
        title: string;
        body?: string;
        selectors: SelectorCandidate[];
        visualHint?: string;
        expectedRoute?: string | null;
      };
      action?: string;
      error?: string;
    }) => void;
    signal?: AbortSignal;
    showHighlight?: boolean;
  }): Promise<{ status: 'completed' | 'failed' | 'aborted'; steps: any[]; reason?: string; failedStep?: number }>;
};
