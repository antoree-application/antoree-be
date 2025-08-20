// Note: ReportStatus enum doesn't exist in current schema
// This is a placeholder until the Report model is added
export enum ReportStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export class ReportVM {
  id: number;
  userId: number;
  participantId: number;
  reportType: string;
  notes?: string;
  status: ReportStatus;
  createdAt: Date;
  rejectedReason?: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  participant: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export class ReportListVM {
  items: ReportVM[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
} 
