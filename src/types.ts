export interface ImpactItem {
  num: string;
  lbl: string;
}

export interface Campaign {
  id: number;
  icon: string;
  category: string;
  title: string;
  org: string;
  desc: string;
  short: string;
  raised: number;
  target: number;
  donors: number;
  verified: boolean;
  impact: ImpactItem[];
  usage: string;
  color: string;
}

export type UserRole = 'donor' | 'organisation' | 'admin';

export interface User {
  name: string;
  email: string;
  role: UserRole;
  photoUrl?: string;
  memberSince?: string;
  totalContributed?: number;
  campaignsSupported?: number;
}
