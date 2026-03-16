export type BridgeOpenClosed = "open" | "closed" | "unknown";

export interface BridgeStatus {
  id: string;
  name: string;
  status: BridgeOpenClosed;
  currentMessage: string | null;
  nextClosureStart: string | null;
  nextClosureEnd: string | null;
  nextClosureMessage: string | null;
  updatedAt: string;
}

