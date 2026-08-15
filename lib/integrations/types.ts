import type { Capability, ProviderId } from '@/lib/config/workspace-config';

/**
 * Shared vocabulary for the integration layer.
 *
 * Rule (spec §5): a feature never imports a vendor SDK. It asks the registry for
 * the workspace's provider for a capability and talks to the interface.
 */

export type { Capability, ProviderId };

export interface DateRange {
  start: Date;
  end: Date;
}

/** Thrown when a workspace's chosen provider cannot run — missing key, revoked
 *  token, provider outage. Carries enough context for a useful UI message. */
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly capability: Capability,
    readonly provider: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

/** Thrown when the coach has selected a provider we have not built yet. */
export class ProviderNotImplementedError extends ProviderError {
  constructor(capability: Capability, provider: string) {
    super(
      `The ${provider} ${capability} integration is not available yet. ` +
        `Switch to a different provider in Settings.`,
      capability,
      provider,
    );
    this.name = 'ProviderNotImplementedError';
  }
}
