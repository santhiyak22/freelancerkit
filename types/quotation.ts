export type QuotationItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

export type QuotationStatus = "Draft" | "Sent" | "Accepted" | "Rejected";

export type Quotation = {
  id: string;
  quotationNumber: string;

  clientId: string;
  clientName: string;
  clientEmail: string;
  clientCompany: string;

  issueDate: string;
  validUntil: string;

  items: QuotationItem[];

  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;

  currency: string;
  notes: string;
  status: QuotationStatus;

  createdAt: string;
  updatedAt: string;
};
