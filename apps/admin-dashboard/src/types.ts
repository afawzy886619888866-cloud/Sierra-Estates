/**
 * Sierra Estates 3.0 TypeScript Type Definitions
 */

export * from './types/index';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  interest: string;
  stage: "Viewing Scheduled" | "AI Matched" | "Contract Draft" | "Initial Contact" | "Negotiating";
  color: string;
  hot: boolean;
  source?: "Property Finder" | "Client Portal" | "WhatsApp Bot" | "Manual";
  email?: string;
  budget?: string;
  createdAt: Date;
  updatedAt: Date;
  ownerId?: string;
  archived?: boolean;
}

export interface Listing {
  id: string;
  code: string;
  cmp: string;
  type: string;
  beds: number;
  area: number;
  price: string;
  ai: number;
  status: "Active" | "Review" | "Sold" | string;
  img: number;
  images?: string[];
  ownerPhone?: string;
  ownerName?: string;
  source?: "EasyListing" | "Property Finder" | "Manual" | string;
  publishToClient?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Agent {
  id: string;
  name: string;
  desc: string;
  emoji: string;
  color: string;
  status: "Online" | "Running" | "Idle" | string;
  load: number;
  tasks: number;
  updatedAt?: Date;
}

export interface AdminWorkflow {
  id: string;
  name: string;
  nameAr?: string;
  desc?: string;
  descAr?: string;
  status: "active" | "warning" | "paused";
  runs: number;
  last: string;
  color: string;
  updatedAt: Date;
}

export interface AdminUser {
  id: string;
  email: string;
  role: "Admin" | "Superadmin";
  status?: "approved" | "pending";
  createdAt: Date;
}

export interface SierraNotification {
  id: string;
  type: "lead" | "listing" | "error" | "system";
  title: string;
  titleAr?: string;
  message: string;
  messageAr?: string;
  read: boolean;
  createdAt: Date;
}

export interface SearchLog {
  id: string;
  query: string;
  scope: 'all' | 'leads' | 'listings' | 'agents' | 'workflows';
  timestamp: Date;
  userId?: string;
  isVoice?: boolean;
}


