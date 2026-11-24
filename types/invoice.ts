export type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

export type InvoiceStatus = "Draft" | "Sent" | "Paid";

export type Invoice = {
  id: string;
  invoiceNumber: string;

  clientId: string;
  clientName: string;
  clientEmail: string;
  clientCompany: string;

  issueDate: string;
  dueDate: string;

  items: InvoiceItem[];

  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;

  currency: string;
  notes: string;
  status: InvoiceStatus;

  createdAt: string;
  updatedAt: string;

  // Links an invoice to the quotation it was converted from.
  sourceQuotationId?: string;
};
