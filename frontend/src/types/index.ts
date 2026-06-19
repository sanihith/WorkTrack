export interface User {
  id: number;
  employeeId: string;
  name: string;
  email: string;
  managerId?: number;
  role: string;
}

export interface Request {
  id: number;
  subject: string;
  explanation: string;
  createdBy: User;
  assignedTo?: User;
  requestedByDate: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  createdAt: string;
  ccUsers?: User[];
  attachments?: Attachment[];
}

export interface Attachment {
  id: number;
  fileName: string;
  filePath: string;
}