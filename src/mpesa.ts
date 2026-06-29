export type MpesaEnvironment = 'sandbox' | 'production';

export interface StkPushRequest {

  campaignId: number;
  amountKES: number;
  phone: string; // e.g. 2547XXXXXXXX or 07XXXXXXXX
  donorEmail?: string;
  donorName?: string;
}

export interface StkPushResponse {
  ok: true;
  checkoutRequestId: string;
  merchantRequestId: string;
}

export interface MpesaStkCallback {
  success: boolean;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  amountKES?: number;
  mpesaReceiptNumber?: string;
  phone?: string;
  raw: any;
}

