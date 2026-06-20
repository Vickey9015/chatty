export interface IceConfig {
  iceServers: RTCIceServer[];
  iceTransportPolicy?: RTCIceTransportPolicy;
  source?: string;
}

const RTC_OPTIONS: Omit<RTCConfiguration, 'iceServers' | 'iceTransportPolicy'> = {
  iceCandidatePoolSize: 4,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

const STATIC_FALLBACK: IceConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: [
        'turn:openrelay.metered.ca:443?transport=tcp',
        'turns:openrelay.metered.ca:443',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceTransportPolicy: 'all',
  source: 'static',
};

export function toRtcConfiguration(config: IceConfig): RTCConfiguration {
  return {
    ...RTC_OPTIONS,
    iceServers: config.iceServers,
    iceTransportPolicy: config.iceTransportPolicy ?? 'all',
  };
}

/** Load ICE servers from the backend (Metered API when configured). */
export async function fetchIceConfig(): Promise<IceConfig> {
  try {
    const res = await fetch('/api/turn-credentials', { credentials: 'same-origin' });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as IceConfig;
    if (!Array.isArray(data.iceServers) || data.iceServers.length === 0) {
      throw new Error('empty iceServers');
    }
    return data;
  } catch {
    return STATIC_FALLBACK;
  }
}
