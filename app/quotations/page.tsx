"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
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
  getAllQuotations,
  saveQuotation,
  removeQuotation,
  getAllInvoices,
  saveInvoice,
} from "@/lib/db";

import type { Client } from "@/types/client";
import type {
  Quotation,
  QuotationItem,
  QuotationStatus,
} from "@/types/quotation";
import type { Invoice } from "@/types/invoice";

const today = new Date().toISOString().slice(0, 10);

const currencies = [
  { value: "INR", label: "INR (₹)" },
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
];

const statuses: QuotationStatus[] = ["Draft", "Sent", "Accepted", "Rejected"];

function createQuotationItem(): QuotationItem {
  return {
    id: "",
    description: "",
    quantity: 1,
    unitPrice: 0,
  };
}

function createQuotationItemWithId(): QuotationItem {
  return {
    ...createQuotationItem(),
    id: crypto.randomUUID(),
  };
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function QuotationsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState(today);
  const [validUntil, setValidUntil] = useState(today);
  const [currency, setCurrency] = useState("INR");
  const [taxRate, setTaxRate] = useState("0");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<QuotationItem[]>([]);

  const selectedClient = clients.find((client) => client.id === clientId);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items],
  );

  const numericTaxRate = Number(taxRate) || 0;
  const taxAmount = (subtotal * numericTaxRate) / 100;
  const total = subtotal + taxAmount;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [clientData, quotationData, invoiceData] = await Promise.all([
        getAllClients(),
        getAllQuotations(),
        getAllInvoices(),
      ]);

      setClients(clientData);

      setQuotations(
        quotationData.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      );

      setInvoices(invoiceData);
    } catch (err) {
      console.error(err);
      setError("Unable to load quotations. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setItems([createQuotationItemWithId()]);
    void loadData();
  }, [loadData]);

  function resetForm() {
    setClientId("");
    setIssueDate(today);
    setValidUntil(today);
    setCurrency("INR");
    setTaxRate("0");
    setNotes("");
    setItems([createQuotationItemWithId()]);
  }

  function updateItem(
    id: string,
    field: keyof QuotationItem,
    value: string | number,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  }

  function addItem() {
    setItems((current) => [...current, createQuotationItemWithId()]);
  }

  function deleteItem(id: string) {
    setItems((current) =>
      current.length > 1 ? current.filter((item) => item.id !== id) : current,
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!selectedClient) {
      setError("Please select a saved client.");
      return;
    }

    if (validUntil < issueDate) {
      setError("Valid-until date cannot be earlier than issue date.");
      return;
    }

    if (
      items.length === 0 ||
      items.some(
        (item) =>
          !item.description.trim() ||
          !Number.isFinite(item.quantity) ||
          item.quantity <= 0 ||
          !Number.isFinite(item.unitPrice) ||
          item.unitPrice < 0,
      )
    ) {
      setError("Please enter valid details for every quotation item.");
      return;
    }

    const parsedTax = Number(taxRate);

    if (!Number.isFinite(parsedTax) || parsedTax < 0 || parsedTax > 100) {
      setError("Tax rate must be between 0 and 100.");
      return;
    }

    setSaving(true);

    try {
      const now = new Date().toISOString();

      const quotation: Quotation = {
        id: crypto.randomUUID(),
        quotationNumber: `QUO-${Date.now()}`,
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        clientEmail: selectedClient.email,
        clientCompany: selectedClient.company,
        issueDate,
        validUntil,
        items: items.map((item) => ({ ...item })),
        subtotal,
        taxRate: parsedTax,
        taxAmount,
        total,
        currency,
        notes: notes.trim(),
        status: "Draft",
        createdAt: now,
        updatedAt: now,
      };

      await saveQuotation(quotation);

      setNotice(`Quotation ${quotation.quotationNumber} saved successfully.`);

      setShowForm(false);
      resetForm();
      await loadData();
    } catch (err) {
      console.error(err);
      setError("Unable to save quotation. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(quotation: Quotation, status: QuotationStatus) {
    try {
      const updated: Quotation = {
        ...quotation,
        status,
        updatedAt: new Date().toISOString(),
      };

      await saveQuotation(updated);

      setNotice(`${quotation.quotationNumber} marked as ${status}.`);

      await loadData();
    } catch (err) {
      console.error(err);
      setError("Unable to update quotation status.");
    }
  }

  // Convert an accepted quotation into an invoice.
  async function handleConvertToInvoice(quotation: Quotation) {
    if (quotation.status !== "Accepted") {
      setError("Only accepted quotations can be converted.");
      return;
    }

    if (convertingId) return;

    setError("");
    setNotice("");
    setConvertingId(quotation.id);

    try {
      // Read the latest invoice records before converting.
      const existingInvoices = await getAllInvoices();

      const existingInvoice = existingInvoices.find(
        (invoice) => invoice.sourceQuotationId === quotation.id,
      );

      // Prevent duplicate conversion.
      if (existingInvoice) {
        setInvoices(existingInvoices);

        setNotice(
          `This quotation has already been converted to ${existingInvoice.invoiceNumber}.`,
        );

        return;
      }

      const now = new Date();
      const issueDate = now.toISOString().slice(0, 10);

      // Default payment due date: 14 days from issue date.
      const due = new Date(now);
      due.setDate(due.getDate() + 14);

      const dueDate = due.toISOString().slice(0, 10);

      const invoice: Invoice = {
        id: crypto.randomUUID(),
        invoiceNumber: `INV-${Date.now()}`,

        clientId: quotation.clientId,
        clientName: quotation.clientName,
        clientEmail: quotation.clientEmail,
        clientCompany: quotation.clientCompany,

        issueDate,
        dueDate,

        items: quotation.items.map((item) => ({
          ...item,
          id: crypto.randomUUID(),
        })),

        subtotal: quotation.subtotal,
        taxRate: quotation.taxRate,
        taxAmount: quotation.taxAmount,
        total: quotation.total,

        currency: quotation.currency,
        notes: quotation.notes,
        status: "Draft",

        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),

        sourceQuotationId: quotation.id,
      };

      await saveInvoice(invoice);

      setNotice(
        `Successfully converted ${quotation.quotationNumber} to ${invoice.invoiceNumber}.`,
      );

      await loadData();
    } catch (err) {
      console.error(err);
      setError("Unable to convert quotation. Please try again.");
    } finally {
      setConvertingId(null);
    }
  }

  async function handleDelete(quotation: Quotation) {
    const confirmed = window.confirm(
      `Delete ${quotation.quotationNumber}? This cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      await removeQuotation(quotation.id);

      setNotice(`${quotation.quotationNumber} deleted.`);
      await loadData();
    } catch (err) {
      console.error(err);
      setError("Unable to delete quotation.");
    }
  }

  async function downloadPDF(quotation: Quotation) {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();

      const pageWidth = doc.internal.pageSize.getWidth();
      const right = pageWidth - 20;
      let y = 22;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(23);
      doc.text("QUOTATION", 20, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      doc.text(quotation.quotationNumber, right, y, { align: "right" });

      y += 15;

      doc.setFont("helvetica", "bold");
      doc.text("PREPARED FOR", 20, y);

      y += 7;

      doc.setFont("helvetica", "normal");
      doc.text(quotation.clientName, 20, y);

      y += 6;

      if (quotation.clientCompany) {
        doc.text(quotation.clientCompany, 20, y);
        y += 6;
      }

      doc.text(quotation.clientEmail, 20, y);

      doc.setFont("helvetica", "bold");
      doc.text("Quotation details", 125, 37);

      doc.setFont("helvetica", "normal");
      doc.text(`Issue date: ${quotation.issueDate}`, 125, 44);
      doc.text(`Valid until: ${quotation.validUntil}`, 125, 51);

      y = Math.max(y + 15, 72);

      doc.setFillColor(235, 242, 239);
      doc.rect(20, y, pageWidth - 40, 10, "F");

      doc.setFont("helvetica", "bold");
      doc.text("Description", 23, y + 7);
      doc.text("Qty", 120, y + 7);
      doc.text("Rate", 143, y + 7);

      doc.text("Amount", right - 2, y + 7, { align: "right" });

      y += 17;

      doc.setFont("helvetica", "normal");

      for (const item of quotation.items) {
        const description = doc.splitTextToSize(item.description, 88);

        const rowHeight = Math.max(9, description.length * 5);

        if (y + rowHeight > 265) {
          doc.addPage();
          y = 20;
        }

        doc.text(description, 23, y);
        doc.text(String(item.quantity), 120, y);

        doc.text(formatMoney(item.unitPrice, quotation.currency), 143, y);

        doc.text(
          formatMoney(item.quantity * item.unitPrice, quotation.currency),
          right - 2,
          y,
          { align: "right" },
        );

        y += rowHeight;
      }

      y += 8;

      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.line(20, y, right, y);
      y += 10;

      doc.text("Subtotal", 135, y);

      doc.text(formatMoney(quotation.subtotal, quotation.currency), right, y, {
        align: "right",
      });

      y += 8;

      doc.text(`Tax (${quotation.taxRate}%)`, 135, y);

      doc.text(formatMoney(quotation.taxAmount, quotation.currency), right, y, {
        align: "right",
      });

      y += 10;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);

      doc.text("Estimated total", 135, y);

      doc.text(formatMoney(quotation.total, quotation.currency), right, y, {
        align: "right",
      });

      y += 18;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");

      doc.text(`Quotation status: ${quotation.status}`, 20, y);

      if (quotation.notes) {
        y += 10;

        doc.setFont("helvetica", "bold");
        doc.text("Notes", 20, y);

        y += 6;

        doc.setFont("helvetica", "normal");

        doc.text(doc.splitTextToSize(quotation.notes, pageWidth - 40), 20, y);
      }

      doc.save(`${quotation.quotationNumber}.pdf`);
    } catch (err) {
      console.error(err);
      setError("PDF download failed. Please try again.");
    }
  }

  return (
    <main className="quotation-page">
      <header className="quotation-topbar">
        <Link href="/" className="quotation-back-link">
          <ArrowLeft size={17} />
          Dashboard
        </Link>

        <span className="quotation-storage-label">
          <span className="quotation-storage-dot" />
          Local storage
        </span>
      </header>

      <section className="quotation-content">
        <div className="quotation-heading">
          <div>
            <p className="quotation-eyebrow">BUSINESS MANAGEMENT</p>

            <h1>Quotations</h1>

            <p>Prepare and share professional project estimates.</p>
          </div>

          <button
            className="quotation-primary-btn"
            onClick={() => {
              setError("");
              setNotice("");
              setShowForm(true);
            }}
          >
            <Plus size={18} />
            Create quotation
          </button>
        </div>

        {notice && (
          <div className="quotation-notice">
            {notice}

            <button onClick={() => setNotice("")} aria-label="Dismiss">
              <X size={16} />
            </button>
          </div>
        )}

        {error && (
          <div className="quotation-error">
            {error}

            <button onClick={() => setError("")} aria-label="Dismiss">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="quotation-summary">
          <div className="quotation-summary-card">
            <span>Total quotations</span>
            <strong>{quotations.length}</strong>
          </div>

          <div className="quotation-summary-card">
            <span>Accepted</span>
            <strong>
              {quotations.filter((q) => q.status === "Accepted").length}
            </strong>
          </div>

          <div className="quotation-summary-card">
            <span>Draft</span>
            <strong>
              {quotations.filter((q) => q.status === "Draft").length}
            </strong>
          </div>
        </div>

        {showForm && (
          <form className="quotation-form-panel" onSubmit={handleSubmit}>
            <div className="quotation-form-heading">
              <div>
                <h2>Create new quotation</h2>
                <p>Enter the client and project estimate details.</p>
              </div>

              <button
                type="button"
                className="quotation-icon-btn"
                onClick={() => {
                  setShowForm(false);
                  setError("");
                }}
                aria-label="Close form"
              >
                <X size={19} />
              </button>
            </div>

            <div className="quotation-form-grid">
              <label className="quotation-field quotation-field-full">
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

              <label className="quotation-field">
                Issue date
                <input
                  type="date"
                  value={issueDate}
                  onChange={(event) => setIssueDate(event.target.value)}
                  required
                />
              </label>

              <label className="quotation-field">
                Valid until
                <input
                  type="date"
                  min={issueDate}
                  value={validUntil}
                  onChange={(event) => setValidUntil(event.target.value)}
                  required
                />
              </label>

              <label className="quotation-field">
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

              <label className="quotation-field">
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
              <div className="quotation-selected-client">
                <strong>{selectedClient.name}</strong>
                <span>{selectedClient.email}</span>

                {selectedClient.company && (
                  <span>{selectedClient.company}</span>
                )}
              </div>
            )}

            <div className="quotation-items-heading">
              <h3>Quotation items</h3>

              <button
                type="button"
                className="quotation-add-item-btn"
                onClick={addItem}
              >
                <Plus size={15} />
                Add item
              </button>
            </div>

            <div className="quotation-items-list">
              {items.map((item, index) => (
                <div className="quotation-item-row" key={item.id}>
                  <label className="quotation-field quotation-description">
                    <span>Description</span>

                    <input
                      type="text"
                      placeholder="e.g. Website design"
                      value={item.description}
                      onChange={(event) =>
                        updateItem(item.id, "description", event.target.value)
                      }
                      required
                    />
                  </label>

                  <label className="quotation-field quotation-quantity">
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

                  <label className="quotation-field quotation-price">
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

                  <div className="quotation-line-total">
                    <span>Amount</span>

                    <strong>
                      {formatMoney(item.quantity * item.unitPrice, currency)}
                    </strong>
                  </div>

                  <button
                    type="button"
                    className="quotation-delete-item"
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

            <label className="quotation-field quotation-notes-field">
              Notes and terms (optional)
              <textarea
                rows={3}
                placeholder="Project scope, payment terms, or other conditions..."
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>

            <div className="quotation-total-panel">
              <div>
                <span>Subtotal</span>
                <strong>{formatMoney(subtotal, currency)}</strong>
              </div>

              <div>
                <span>Tax ({numericTaxRate}%)</span>
                <strong>{formatMoney(taxAmount, currency)}</strong>
              </div>

              <div className="quotation-grand-total">
                <span>Estimated total</span>
                <strong>{formatMoney(total, currency)}</strong>
              </div>
            </div>

            <div className="quotation-form-actions">
              <button
                type="button"
                className="quotation-cancel-btn"
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
                className="quotation-primary-btn"
                disabled={saving || clients.length === 0}
              >
                {saving ? "Saving..." : "Save quotation"}
              </button>
            </div>
          </form>
        )}

        <section className="quotation-list-panel">
          <div className="quotation-list-heading">
            <div>
              <h2>Recent quotations</h2>
              <p>Your saved project estimates.</p>
            </div>

            <button
              className="quotation-refresh-btn"
              onClick={() => void loadData()}
              title="Refresh quotations"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          {loading ? (
            <div className="quotation-empty">Loading quotations...</div>
          ) : quotations.length === 0 ? (
            <div className="quotation-empty">
              <FileText size={34} />
              <strong>No quotations yet</strong>
              <span>Create your first project estimate.</span>
            </div>
          ) : (
            <div className="quotation-table-wrap">
              <table className="quotation-table">
                <thead>
                  <tr>
                    <th>Quotation</th>
                    <th>Client</th>
                    <th>Issue date</th>
                    <th>Valid until</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {quotations.map((quotation) => {
                    const convertedInvoice = invoices.find(
                      (invoice) => invoice.sourceQuotationId === quotation.id,
                    );

                    return (
                      <tr key={quotation.id}>
                        <td>
                          <strong>{quotation.quotationNumber}</strong>
                        </td>

                        <td>{quotation.clientName}</td>
                        <td>{quotation.issueDate}</td>
                        <td>{quotation.validUntil}</td>

                        <td>
                          <strong>
                            {formatMoney(quotation.total, quotation.currency)}
                          </strong>
                        </td>

                        <td>
                          <select
                            className="quotation-status-select"
                            value={quotation.status}
                            onChange={(event) =>
                              void updateStatus(
                                quotation,
                                event.target.value as QuotationStatus,
                              )
                            }
                            aria-label={`Status for ${quotation.quotationNumber}`}
                          >
                            {statuses.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td>
                          <div className="quotation-actions">
                            <button
                              onClick={() => void downloadPDF(quotation)}
                              title="Download PDF"
                              aria-label="Download PDF"
                            >
                              <Download size={17} />
                            </button>

                            {quotation.status === "Accepted" &&
                              (convertedInvoice ? (
                                <Link
                                  href="/invoices"
                                  className="quotation-converted-link"
                                  title={`Converted to ${convertedInvoice.invoiceNumber}`}
                                >
                                  <FileText size={16} />
                                  Converted
                                </Link>
                              ) : (
                                <button
                                  onClick={() =>
                                    void handleConvertToInvoice(quotation)
                                  }
                                  disabled={convertingId !== null}
                                  title="Convert to invoice"
                                  aria-label="Convert to invoice"
                                >
                                  {convertingId === quotation.id ? (
                                    <RefreshCw size={17} />
                                  ) : (
                                    <FileText size={17} />
                                  )}
                                </button>
                              ))}

                            <button
                              onClick={() => void handleDelete(quotation)}
                              title="Delete quotation"
                              aria-label="Delete quotation"
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {clients.length === 0 && (
          <div className="quotation-empty-clients">
            Add at least one client before creating a quotation.
            <Link href="/clients">Go to Client Management</Link>
          </div>
        )}
      </section>
    </main>
  );
}
