export type PaymentMethod =
  | "Bank Transfer"
  | "UPI"
  | "Cash"
  | "Credit Card"
  | "PayPal"
  | "Other";

export type Payment = {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  amount: number;
  currency: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber: string;
  notes: string;
  createdAt: string;
};
