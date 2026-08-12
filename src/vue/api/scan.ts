import type { ScanStatus } from "../../media/types";
import { apiClient, expectProtectedJson } from "./client.js";

export type { ScanStatus };

export const scanApi = {
  async getScanStatus(signal?: AbortSignal): Promise<ScanStatus> {
    return expectProtectedJson<ScanStatus>(await apiClient.api.scan.$get({}, { init: { signal } }));
  },
  async rescanCatalog(): Promise<ScanStatus> {
    return expectProtectedJson<ScanStatus>(await apiClient.api.scan.$post());
  },
};
