import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api";

export interface IceServerItem {
  urls: string;
  username?: string;
  credential?: string;
}

interface RtcConfigData {
  iceServers: IceServerItem[];
  hasTurnCredentials: boolean;
}

let cachedConfig: RtcConfigData | null = null;

export const rtcApi = {
  async getConfig(): Promise<RtcConfigData> {
    if (cachedConfig) {
      return cachedConfig;
    }

    const { data } = await apiClient.get<ApiResponse<RtcConfigData>>("/rtc/config");

    if (!data.success) {
      throw new Error(data.message);
    }

    cachedConfig = data.data;
    return data.data;
  }
};
