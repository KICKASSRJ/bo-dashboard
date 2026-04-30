export interface EdidcRecord {
  messageType: string;
  idocNumber: string;
  idocStatus: string;
  senderPartnerNo: string;
  ediArchiveKey: string;
  createdOn: string;
  createdAt: string;
  changedOn: string;
  timeChanged: string;
}

export interface RsnRecord {
  rsn: string;
  [key: string]: string;
}

export interface EkesRecord {
  purchasingDocument: string;
  reference: string;
  [key: string]: string;
}

export interface MsegRecord {
  purchaseOrder: string;
  shortText: string;
  [key: string]: string;
}

export interface UploadedFiles {
  edidc: EdidcRecord[] | null;
  mseg: MsegRecord[] | null;
  ekes: EkesRecord[] | null;
  rsn: RsnRecord[] | null;
}

export interface CidResult {
  correlationId: string;
  found: boolean;
  idocNumber: string;
  idocStatus: string;
  statusDescription: string;
  displayStatus: string;
  messageType: string;
  senderPartnerNo: string;
  createdOn: string;
}

export interface RsnResult {
  rsn: string;
  found: boolean;
  status: string;
}

export interface BorGrResult {
  bo: string;
  borPid: string;
  materialDocument: string;
  grPid: string;
  mismatch: string;
}

export const IDOC_STATUS_MAP: Record<string, string> = {
  '53': 'Application document posted',
  '51': 'Application document not posted',
  '64': 'IDoc ready to be processed (inbound)',
  '68': 'Error, no further processing',
  '60': 'IDoc ready for dispatch (outbound)',
  '61': 'IDoc passed to port OK (outbound)',
};

export type TabId = 'upload' | 'idoc-status' | 'cid-status' | 'rsn-status' | 'bor-gr-mismatch';
