export type DBType = 'postgres' | 'mongodb';
export type UserRole = 'admin' | 'operator' | 'viewer';

export interface User {
  id: string;
  email: string;
  role: UserRole;
}

export interface DBConnection {
  id: string;
  name: string;
  type: DBType;
  environment: 'development' | 'staging' | 'production';
  connection_string: string;
  created_at: string;
}

export interface MetricData {
  timestamp: number;
  cpu: number;
  memory: number;
  iops: number;
  diskIo?: number;
  latency: number;
  queryLatency?: number;
  queryThroughput?: number;
  connections: number;
  replicationLag?: number;
  diskUsage?: number;
  lockWaits?: number;
  longRunningQueries?: number;
  slowQueries?: number;
}

export interface Alert {
  id: string;
  connection_id: string;
  metric: string;
  threshold: number;
  operator: '>' | '<';
  channel: 'email' | 'slack';
  enabled: boolean;
}

export interface SlowQueryAnalysis {
  analysis: string;
  recommendations: {
    query: string;
    issue: string;
    suggestion: string;
    impact: string;
  }[];
}

export interface IncidentReport {
  status: string;
  issues: {
    title: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    runbook: string;
  }[];
}

export interface ExplainPlanNode {
  name: string;
  cost: number;
  rows: number;
  type: string;
  children?: ExplainPlanNode[];
}
