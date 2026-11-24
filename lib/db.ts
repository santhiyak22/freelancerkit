import { openDB, type DBSchema } from "idb";
import type { Client } from "@/types/client";
import type { Invoice } from "@/types/invoice";
import { Quotation } from "@/types/quotation";
import type { Payment } from "@/types/payment";

interface FreelancerDB extends DBSchema {
  clients: {
    key: string;
    value: Client;
    indexes: {
      "by-name": string;
      "by-email": string;
    };
  };

  invoices: {
    key: string;
    value: Invoice;
    indexes: {
      "by-client": string;
      "by-date": string;
      "by-number": string;
    };
  };
  quotations: {
    key: string;
    value: Quotation;
    indexes: {
      "by-client": string;
      "by-date": string;
      "by-number": string;
    };
  };
  payments: {
    key: string;
    value: Payment;
    indexes: {
      "by-invoice": string;
      "by-client": string;
      "by-date": string;
      "by-reference": string;
    };
  };
}

const DB_NAME = "freelancer-business-kit";
const DB_VERSION = 56;

function getDB() {
  if (typeof window === "undefined" || !window.indexedDB) {
    throw new Error("IndexedDB is available only in the browser.");
  }

  return openDB<FreelancerDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("clients")) {
        const clientStore = db.createObjectStore("clients", {
          keyPath: "id",
        });

        clientStore.createIndex("by-name", "name");
        clientStore.createIndex("by-email", "email");
      }

      if (!db.objectStoreNames.contains("invoices")) {
        const invoiceStore = db.createObjectStore("invoices", {
          keyPath: "id",
        });

        invoiceStore.createIndex("by-client", "clientId");
        invoiceStore.createIndex("by-date", "issueDate");
        invoiceStore.createIndex("by-number", "invoiceNumber");
      }
      if (!db.objectStoreNames.contains("quotations")) {
        const quotationStore = db.createObjectStore("quotations", {
          keyPath: "id",
        });

        quotationStore.createIndex("by-client", "clientId");
        quotationStore.createIndex("by-date", "issueDate");
        quotationStore.createIndex("by-number", "quotationNumber");
      }
      if (!db.objectStoreNames.contains("payments")) {
        const paymentStore = db.createObjectStore("payments", {
          keyPath: "id",
        });

        paymentStore.createIndex("by-invoice", "invoiceId");
        paymentStore.createIndex("by-client", "clientId");
        paymentStore.createIndex("by-date", "paymentDate");
        paymentStore.createIndex("by-reference", "referenceNumber");
      }
    },
  });
}

// CLIENT FUNCTIONS

export async function getAllClients(): Promise<Client[]> {
  const db = await getDB();
  return db.getAll("clients");
}

export async function saveClient(client: Client): Promise<void> {
  const db = await getDB();
  await db.put("clients", client);
}

export async function removeClient(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("clients", id);
}

export async function getClientById(id: string): Promise<Client | undefined> {
  const db = await getDB();
  return db.get("clients", id);
}

// INVOICE FUNCTIONS

export async function getAllInvoices(): Promise<Invoice[]> {
  const db = await getDB();
  return db.getAll("invoices");
}

export async function saveInvoice(invoice: Invoice): Promise<void> {
  const db = await getDB();
  await db.put("invoices", invoice);
}

export async function removeInvoice(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("invoices", id);
}

export async function getInvoiceById(id: string): Promise<Invoice | undefined> {
  const db = await getDB();
  return db.get("invoices", id);
}

// QUOTATION FUNCTIONS

export async function getAllQuotations(): Promise<Quotation[]> {
  const db = await getDB();
  return db.getAll("quotations");
}

export async function saveQuotation(quotation: Quotation): Promise<void> {
  const db = await getDB();
  await db.put("quotations", quotation);
}

export async function removeQuotation(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("quotations", id);
}

export async function getQuotationById(
  id: string,
): Promise<Quotation | undefined> {
  const db = await getDB();
  return db.get("quotations", id);
}

// PAYMENT FUNCTIONS

export async function getAllPayments(): Promise<Payment[]> {
  const db = await getDB();
  return db.getAll("payments");
}

export async function savePayment(payment: Payment): Promise<void> {
  const db = await getDB();
  await db.put("payments", payment);
}

export async function removePayment(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("payments", id);
}

export async function getPaymentById(id: string): Promise<Payment | undefined> {
  const db = await getDB();
  return db.get("payments", id);
}

export async function getPaymentsByInvoiceId(
  invoiceId: string,
): Promise<Payment[]> {
  const db = await getDB();
  return db.getAllFromIndex("payments", "by-invoice", invoiceId);
}



export type FreelancerBackup = {
  app: "freelancer-business-kit";
  version: 1;
  exportedAt: string;
  data: {
    clients: Client[];
    invoices: Invoice[];
    quotations: Quotation[];
    payments: Payment[];
  };
};

// Validate individual records before importing them.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateRecords(
  records: unknown,
  section: string,
  requiredFields: string[],
): void {
  if (!Array.isArray(records)) {
    throw new Error(`Invalid backup: ${section} must be an array.`);
  }

  const seenIds = new Set<string>();

  records.forEach((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`Invalid ${section} record at position ${index + 1}.`);
    }

    if (typeof item.id !== "string" || item.id.trim().length === 0) {
      throw new Error(`${section} record ${index + 1} has an invalid ID.`);
    }

    if (seenIds.has(item.id)) {
      throw new Error(`Duplicate ID found in ${section}: ${item.id}`);
    }

    seenIds.add(item.id);

    for (const field of requiredFields) {
      if (typeof item[field] !== "string") {
        throw new Error(
          `${section} record ${item.id} has an invalid ${field} field.`,
        );
      }
    }
  });
}

// EXPORT ALL DATA

export async function createBackup(): Promise<FreelancerBackup> {
  const db = await getDB();

  const tx = db.transaction(
    ["clients", "invoices", "quotations", "payments"],
    "readonly",
  );

  const [clients, invoices, quotations, payments] = await Promise.all([
    tx.objectStore("clients").getAll(),
    tx.objectStore("invoices").getAll(),
    tx.objectStore("quotations").getAll(),
    tx.objectStore("payments").getAll(),
  ]);

  await tx.done;

  return {
    app: "freelancer-business-kit",
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      clients,
      invoices,
      quotations,
      payments,
    },
  };
}

// VALIDATE BACKUP

function validateBackup(backup: unknown): FreelancerBackup {
  if (!isRecord(backup)) {
    throw new Error("Invalid backup file.");
  }

  if (backup.app !== "freelancer-business-kit" || backup.version !== 1) {
    throw new Error("Unsupported backup format or version.");
  }

  if (
    typeof backup.exportedAt !== "string" ||
    Number.isNaN(Date.parse(backup.exportedAt))
  ) {
    throw new Error("Invalid backup export date.");
  }

  if (!isRecord(backup.data)) {
    throw new Error("Backup data is missing or invalid.");
  }

  const data = backup.data;

  validateRecords(data.clients, "Clients", ["name", "email"]);

  validateRecords(data.invoices, "Invoices", [
    "clientId",
    "issueDate",
    "invoiceNumber",
  ]);

  validateRecords(data.quotations, "Quotations", [
    "clientId",
    "issueDate",
    "quotationNumber",
  ]);

  validateRecords(data.payments, "Payments", [
    "invoiceId",
    "clientId",
    "paymentDate",
    "referenceNumber",
  ]);

  for (const payment of data.payments as Record<string, unknown>[]) {
    if (
      typeof payment.amount !== "number" ||
      !Number.isFinite(payment.amount) ||
      payment.amount < 0
    ) {
      throw new Error(`Payment ${String(payment.id)} has an invalid amount.`);
    }
  }

  return backup as unknown as FreelancerBackup;
}

// IMPORT / RESTORE DATA

export async function restoreBackup(backup: unknown): Promise<void> {
  // Complete validation happens BEFORE opening a write transaction.
  const validBackup = validateBackup(backup);

  const db = await getDB();

  const tx = db.transaction(
    ["clients", "invoices", "quotations", "payments"],
    "readwrite",
  );

  try {
    const stores = {
      clients: tx.objectStore("clients"),
      invoices: tx.objectStore("invoices"),
      quotations: tx.objectStore("quotations"),
      payments: tx.objectStore("payments"),
    };

    // Merge by ID. Existing records not in the backup are preserved.
    // Matching IDs are updated with the imported records.
    await Promise.all([
      ...validBackup.data.clients.map((item) => stores.clients.put(item)),
      ...validBackup.data.invoices.map((item) => stores.invoices.put(item)),
      ...validBackup.data.quotations.map((item) => stores.quotations.put(item)),
      ...validBackup.data.payments.map((item) => stores.payments.put(item)),
    ]);

    await tx.done;
  } catch (error) {
    try {
      tx.abort();
    } catch {
      // The transaction may already have been aborted.
    }

    try {
      await tx.done;
    } catch {
      // Ignore the transaction rejection while preserving the original error.
    }

    throw error;
  }
}
