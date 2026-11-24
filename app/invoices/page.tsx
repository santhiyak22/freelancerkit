"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Download,
  FileText,
  RefreshCw,
  X,
} from "lucide-react";

import {
  getAllClients,
  getAllInvoices,
  saveInvoice,
  removeInvoice,
} from "@/lib/db";

import type { Client } from "@/types/client";
import type { Invoice, InvoiceItem } from "@/types/invoice";

const today = new Date().toISOString().slice(0, 10);

const currencies = [
  { value: "INR", label: "INR (₹)" },
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
];

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function createItem(): InvoiceItem {
  return {
    id: "",
    description: "",
    quantity: 1,
    unitPrice: 0,
  };
}

function createItemWithId(): InvoiceItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: 1,
    unitPrice: 0,
  };
}
export default function InvoicesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(today);
  const [currency, setCurrency] = useState("INR");
  const [taxRate, setTaxRate] = useState("0");
  const [notes, setNotes] = useState("");
const [items, setItems] = useState<InvoiceItem[]>([]);
  const selectedClient = clients.find((client) => client.id === clientId);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items],
  );

  const taxAmount = (subtotal * (Number(taxRate) || 0)) / 100;
  const total = subtotal + taxAmount;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [clientData, invoiceData] = await Promise.all([
        getAllClients(),
        getAllInvoices(),
      ]);

      setClients(clientData);
      setInvoices(
        invoiceData.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      );
    } catch (err) {
      console.error(err);
      setError("Unable to load invoices. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, []);

useEffect(() => {
  setItems([createItemWithId()]);
  void loadData();
}, [loadData]);

  function updateItem(
    id: string,
    field: keyof InvoiceItem,
    value: string | number,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  }

function addItem() {
  setItems((current) => [
    ...current,
    {
      ...createItem(),
      id: crypto.randomUUID(),
    },
  ]);
}

  function deleteItem(id: string) {
    setItems((current) =>
      current.length > 1 ? current.filter((item) => item.id !== id) : current,
    );
  }

  function resetForm() {
    setClientId("");
    setIssueDate(today);
    setDueDate(today);
    setCurrency("INR");
    setTaxRate("0");
    setNotes("");
   setItems([createItemWithId()]);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!selectedClient) {
      setError("Please select a client.");
      return;
    }

    if (dueDate < issueDate) {
      setError("Due date cannot be earlier than issue date.");
      return;
    }

    if (
      items.some(
        (item) =>
          !item.description.trim() || item.quantity <= 0 || item.unitPrice < 0,
      )
    ) {
      setError(
        "Enter a description, a quantity greater than zero and a valid price for every item.",
      );
      return;
    }

    const numericTaxRate = Number(taxRate);

    if (
      !Number.isFinite(numericTaxRate) ||
      numericTaxRate < 0 ||
      numericTaxRate > 100
    ) {
      setError("Tax rate must be between 0 and 100.");
      return;
    }

    setSaving(true);

    try {
      const now = new Date().toISOString();

      const invoice: Invoice = {
        id: crypto.randomUUID(),
        invoiceNumber: `INV-${Date.now()}`,
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        clientEmail: selectedClient.email,
        clientCompany: selectedClient.company,
        issueDate,
        dueDate,
        items: items.map((item) => ({ ...item })),
        subtotal,
        taxRate: numericTaxRate,
        taxAmount,
        total,
        currency,
        notes: notes.trim(),
        status: "Draft",
        createdAt: now,
        updatedAt: now,
      };

      await saveInvoice(invoice);

      setNotice(`Invoice ${invoice.invoiceNumber} saved successfully.`);
      setShowForm(false);
      resetForm();
      await loadData();
    } catch (err) {
      console.error(err);
      setError("Could not save the invoice. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(invoice: Invoice) {
    const confirmed = window.confirm(
      `Delete invoice ${invoice.invoiceNumber}? This cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      await removeInvoice(invoice.id);
      setNotice(`${invoice.invoiceNumber} deleted.`);
      await loadData();
    } catch (err) {
      console.error(err);
      setError("Unable to delete this invoice.");
    }
  }

  async function downloadPDF(invoice: Invoice) {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();

      const pageWidth = doc.internal.pageSize.getWidth();
      const right = pageWidth - 20;
      let y = 22;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.text("INVOICE", 20, y);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(invoice.invoiceNumber, right, y, {
        align: "right",
      });

      y += 15;
      doc.setFont("helvetica", "bold");
      doc.text("BILL TO", 20, y);

      y += 7;
      doc.setFont("helvetica", "normal");
      doc.text(invoice.clientName, 20, y);
      y += 6;

      if (invoice.clientCompany) {
        doc.text(invoice.clientCompany, 20, y);
        y += 6;
      }

      doc.text(invoice.clientEmail, 20, y);

      doc.setFont("helvetica", "bold");
      doc.text("Invoice details", 125, 37);

      doc.setFont("helvetica", "normal");
      doc.text(`Issue date: ${invoice.issueDate}`, 125, 44);
      doc.text(`Due date: ${invoice.dueDate}`, 125, 51);

      y = Math.max(y + 15, 72);

      doc.setFont("helvetica", "bold");
      doc.setFillColor(235, 242, 239);
      doc.rect(20, y, pageWidth - 40, 10, "F");

      doc.text("Description", 23, y + 7);
      doc.text("Qty", 120, y + 7);
      doc.text("Rate", 143, y + 7);
      doc.text("Amount", right - 2, y + 7, {
        align: "right",
      });

      y += 17;
      doc.setFont("helvetica", "normal");

      for (const item of invoice.items) {
        if (y > 255) {
          doc.addPage();
          y = 20;
        }

        const description = doc.splitTextToSize(item.description, 88);

        doc.text(description, 23, y);
        doc.text(String(item.quantity), 120, y);
        doc.text(formatMoney(item.unitPrice, invoice.currency), 143, y);
        doc.text(
          formatMoney(item.quantity * item.unitPrice, invoice.currency),
          right - 2,
          y,
          { align: "right" },
        );

        y += Math.max(9, description.length * 5);
      }

      y += 8;

      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.line(20, y, right, y);
      y += 10;

      doc.text("Subtotal", 135, y);
      doc.text(formatMoney(invoice.subtotal, invoice.currency), right, y, {
        align: "right",
      });

      y += 8;
      doc.text(`Tax (${invoice.taxRate}%)`, 135, y);
      doc.text(formatMoney(invoice.taxAmount, invoice.currency), right, y, {
        align: "right",
      });

      y += 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Total", 135, y);
      doc.text(formatMoney(invoice.total, invoice.currency), right, y, {
        align: "right",
      });

      if (invoice.notes) {
        y += 17;
        doc.setFontSize(10);
        doc.text("Notes", 20, y);
        y += 7;
        doc.setFont("helvetica", "normal");
        doc.text(doc.splitTextToSize(invoice.notes, pageWidth - 40), 20, y);
      }

      doc.save(`${invoice.invoiceNumber}.pdf`);
    } catch (err) {
      console.error(err);
      setError("PDF download failed. Please try again.");
    }
  }

  return (
    <main className="invoice-page">
      <header className="invoice-topbar">
        <Link href="/" className="invoice-back-link">
          <ArrowLeft size={17} />
          Dashboard
        </Link>

        <span className="invoice-storage-label">
          <span className="invoice-storage-dot" />
          Local storage
        </span>
      </header>

      <section className="invoice-content">
        <div className="invoice-heading">
          <div>
            <p className="invoice-eyebrow">BUSINESS MANAGEMENT</p>
            <h1>Invoices</h1>
            <p>Create, save and download professional invoices.</p>
          </div>

          <button
            className="invoice-primary-btn"
            onClick={() => {
              setError("");
              setNotice("");
              setShowForm(true);
            }}
          >
            <Plus size={18} />
            Create invoice
          </button>
        </div>

        {notice && (
          <div className="invoice-notice">
            {notice}
            <button onClick={() => setNotice("")} aria-label="Dismiss">
              <X size={16} />
            </button>
          </div>
        )}

        {error && (
          <div className="invoice-error">
            {error}
            <button onClick={() => setError("")} aria-label="Dismiss">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="invoice-summary">
          <div className="invoice-summary-card">
            <span>Total invoices</span>
            <strong>{invoices.length}</strong>
          </div>

          <div className="invoice-summary-card">
            <span>Draft invoices</span>
            <strong>
              {invoices.filter((item) => item.status === "Draft").length}
            </strong>
          </div>

          <div className="invoice-summary-card">
            <span>Total invoice value</span>
            <strong>
              {formatMoney(
                invoices.reduce((sum, item) => sum + item.total, 0),
                "INR",
              )}
            </strong>
            <small>
              Displayed in INR equivalent only when invoices use INR
            </small>
          </div>
        </div>

        {showForm && (
          <form className="invoice-form-panel" onSubmit={handleSubmit}>
            <div className="invoice-form-heading">
              <div>
                <h2>Create new invoice</h2>
                <p>Enter the client and invoice details below.</p>
              </div>

              <button
                type="button"
                className="invoice-icon-btn"
                onClick={() => {
                  setShowForm(false);
                  setError("");
                }}
                aria-label="Close form"
              >
                <X size={19} />
              </button>
            </div>

            <div className="invoice-form-grid">
              <label className="invoice-field invoice-field-full">
                Client
                <select
                  value={clientId}
                  onChange={(event) => setClientId(event.target.value)}
                  required
                >
                  <option value="">Select a saved client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                      {client.company ? ` — ${client.company}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="invoice-field">
                Issue date
                <input
                  type="date"
                  value={issueDate}
                  onChange={(event) => setIssueDate(event.target.value)}
                  required
                />
              </label>

              <label className="invoice-field">
                Due date
                <input
                  type="date"
                  value={dueDate}
                  min={issueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  required
                />
              </label>

              <label className="invoice-field">
                Currency
                <select
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                >
                  {currencies.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="invoice-field">
                Tax rate (%)
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={taxRate}
                  onChange={(event) => setTaxRate(event.target.value)}
                />
              </label>
            </div>

            {selectedClient && (
              <div className="invoice-selected-client">
                <strong>{selectedClient.name}</strong>
                <span>{selectedClient.email}</span>
                {selectedClient.company && (
                  <span>{selectedClient.company}</span>
                )}
              </div>
            )}

            <div className="invoice-items-heading">
              <h3>Invoice items</h3>
              <button
                type="button"
                className="invoice-add-item-btn"
                onClick={addItem}
              >
                <Plus size={15} />
                Add item
              </button>
            </div>

            <div className="invoice-items-list">
              {items.map((item, index) => (
                <div className="invoice-item-row" key={item.id}>
                  <label className="invoice-field invoice-description">
                    <span>Description</span>
                    <input
                      type="text"
                      placeholder="e.g. Website development"
                      value={item.description}
                      onChange={(event) =>
                        updateItem(item.id, "description", event.target.value)
                      }
                      required
                    />
                  </label>

                  <label className="invoice-field invoice-quantity">
                    <span>Quantity</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(event) =>
                        updateItem(
                          item.id,
                          "quantity",
                          Number(event.target.value),
                        )
                      }
                      required
                    />
                  </label>

                  <label className="invoice-field invoice-price">
                    <span>Unit price</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(event) =>
                        updateItem(
                          item.id,
                          "unitPrice",
                          Number(event.target.value),
                        )
                      }
                      required
                    />
                  </label>

                  <div className="invoice-line-total">
                    <span>Amount</span>
                    <strong>
                      {formatMoney(item.quantity * item.unitPrice, currency)}
                    </strong>
                  </div>

                  <button
                    type="button"
                    className="invoice-delete-item"
                    onClick={() => deleteItem(item.id)}
                    disabled={items.length === 1}
                    aria-label={`Remove item ${index + 1}`}
                    title="Remove item"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
            </div>

            <label className="invoice-field invoice-notes-field">
              Notes (optional)
              <textarea
                rows={3}
                placeholder="Payment instructions or additional information..."
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>

            <div className="invoice-total-panel">
              <div>
                <span>Subtotal</span>
                <strong>{formatMoney(subtotal, currency)}</strong>
              </div>
              <div>
                <span>Tax ({Number(taxRate) || 0}%)</span>
                <strong>{formatMoney(taxAmount, currency)}</strong>
              </div>
              <div className="invoice-grand-total">
                <span>Grand total</span>
                <strong>{formatMoney(total, currency)}</strong>
              </div>
            </div>

            <div className="invoice-form-actions">
              <button
                type="button"
                className="invoice-cancel-btn"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                  setError("");
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="invoice-primary-btn"
                disabled={saving || clients.length === 0}
              >
                {saving ? "Saving..." : "Save invoice"}
              </button>
            </div>
          </form>
        )}

        <section className="invoice-list-panel">
          <div className="invoice-list-heading">
            <div>
              <h2>Recent invoices</h2>
              <p>Your saved invoice records.</p>
            </div>

            <button
              className="invoice-refresh-btn"
              onClick={() => void loadData()}
              title="Refresh invoices"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          {loading ? (
            <div className="invoice-empty">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="invoice-empty">
              <FileText size={34} />
              <strong>No invoices yet</strong>
              <span>Create your first invoice to see it here.</span>
            </div>
          ) : (
            <div className="invoice-table-wrap">
              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Client</th>
                    <th>Issue date</th>
                    <th>Due date</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>
                        <strong>{invoice.invoiceNumber}</strong>
                      </td>
                      <td>{invoice.clientName}</td>
                      <td>{invoice.issueDate}</td>
                      <td>{invoice.dueDate}</td>
                      <td>
                        <strong>
                          {formatMoney(invoice.total, invoice.currency)}
                        </strong>
                      </td>
                      <td>
                        <span className="invoice-status">{invoice.status}</span>
                      </td>
                      <td>
                        <div className="invoice-actions">
                          <button
                            onClick={() => void downloadPDF(invoice)}
                            title="Download PDF"
                            aria-label="Download PDF"
                          >
                            <Download size={17} />
                          </button>
                          <button
                            onClick={() => void handleDelete(invoice)}
                            title="Delete invoice"
                            aria-label="Delete invoice"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {clients.length === 0 && (
          <div className="invoice-empty-clients">
            You need at least one saved client before creating an invoice.
            <Link href="/clients">Go to Client Management</Link>
          </div>
        )}
      </section>
    </main>
  );
}
