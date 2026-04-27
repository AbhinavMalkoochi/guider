import * as React from 'react';

export interface GuiderWidgetProps {
  apiKey: string;
  mapUrl?: string;
  map?: object;
  model?: string;
  endpoint?: string;
  whisperEndpoint?: string;
  currentRoute?: string;
  position?: 'bottom-right' | 'bottom-left';
  accent?: string;
  onAgentMode?: () => void;
}

export const GuiderWidget: React.FC<GuiderWidgetProps>;
export const agentMode: {
  available: boolean;
  run: (args: { plan: object; controls?: { abort?: AbortController } }) => Promise<{
    status: 'completed' | 'failed' | 'aborted';
    steps: object[];
  }>;
};
