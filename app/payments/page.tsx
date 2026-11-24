"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CreditCard,
  Plus,
  Trash2,
  Wallet,
  TrendingUp,
  X,
} from "lucide-react";

import {
  getAllInvoices,
  getAllPayments,
  savePayment,
  removePayment,
  saveInvoice,
} from "@/lib/db";

import type { Invoice } from "@/types/invoice";
import type { Payment, PaymentMethod } from "@/types/payment";

const paymentMethods: PaymentMethod[] = [
  "Bank Transfer",
  "UPI",
  "Cash",
  "Credit Card",
  "PayPal",
  "Other",
];

const emptyForm = {
  invoiceId: "",
  amount: "",
  paymentDate: new Date().toISOString().slice(0, 10),
  paymentMethod: "UPI" as PaymentMethod,
  referenceNumber: "",
  notes: "",
};

export default function PaymentsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [invoiceData, paymentData] = await Promise.all([
        getAllInvoices(),
        getAllPayments(),
      ]);

      setInvoices(invoiceData);
      setPayments(
        paymentData.sort(
          (a, b) =>
            new Date(b.paymentDate).getTime() -
            new Date(a.paymentDate).getTime(),
        ),
      );
    } catch (err) {
      console.error(err);
      setError("Unable to load payment data.");
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedInvoice = invoices.find(
    (invoice) => invoice.id === form.invoiceId,
  );

  const getPaidAmount = (invoiceId: string) =>
    payments
      .filter((payment) => payment.invoiceId === invoiceId)
      .reduce((sum, payment) => sum + payment.amount, 0);

  const getOutstanding = (invoice: Invoice) =>
    Math.max(0, invoice.total - getPaidAmount(invoice.id));

  const formatMoney = (amount: number, currency = "INR") =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);

  const summary = useMemo(() => {
    const totalReceived = payments.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );

    const totalOutstanding = invoices.reduce(
      (sum, invoice) => sum + getOutstanding(invoice),
      0,
    );

    return {
      totalReceived,
      totalOutstanding,
      paymentCount: payments.length,
    };
  }, [payments, invoices]);

  const filteredPayments = payments.filter((payment) => {
    const query = search.toLowerCase();

    return (
      payment.invoiceNumber.toLowerCase().includes(query) ||
      payment.clientName.toLowerCase().includes(query) ||
      payment.referenceNumber.toLowerCase().includes(query)
    );
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!selectedInvoice) {
      setError("Please select an invoice.");
      return;
    }

    const amount = Number(form.amount);
    const outstanding = getOutstanding(selectedInvoice);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }

    if (amount > outstanding + 0.001) {
      setError(
        `Payment cannot exceed the outstanding balance of ${formatMoney(
          outstanding,
          selectedInvoice.currency,
        )}.`,
      );
      return;
    }

    if (form.paymentDate < selectedInvoice.issueDate) {
      setError("Payment date cannot be before the invoice issue date.");
      return;
    }

    setSaving(true);

    try {
      const now = new Date().toISOString();

      const payment: Payment = {
        id: crypto.randomUUID(),
        invoiceId: selectedInvoice.id,
        invoiceNumber: selectedInvoice.invoiceNumber,
        clientId: selectedInvoice.clientId,
        clientName: selectedInvoice.clientName,
        amount,
        currency: selectedInvoice.currency,
        paymentDate: form.paymentDate,
        paymentMethod: form.paymentMethod,
        referenceNumber: form.referenceNumber.trim(),
        notes: form.notes.trim(),
        createdAt: now,
      };

      await savePayment(payment);

      const newPaidAmount = getPaidAmount(selectedInvoice.id) + amount;

      await saveInvoice({
        ...selectedInvoice,
        status:
          newPaidAmount >= selectedInvoice.total - 0.001
            ? "Paid"
            : selectedInvoice.status === "Paid"
              ? "Sent"
              : selectedInvoice.status,
        updatedAt: now,
      });

      setForm(emptyForm);
      setShowForm(false);
      setNotice("Payment recorded successfully.");
      await loadData();
    } catch (err) {
      console.error(err);
      setError("Unable to save payment. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(payment: Payment) {
    const confirmed = window.confirm(
      `Delete payment of ${formatMoney(payment.amount, payment.currency)}?`,
    );

    if (!confirmed) return;

    try {
      await removePayment(payment.id);

      const invoice = invoices.find((item) => item.id === payment.invoiceId);

      if (invoice) {
        const remainingPaid = Math.max(
          0,
          getPaidAmount(invoice.id) - payment.amount,
        );

        await saveInvoice({
          ...invoice,
          status:
            remainingPaid >= invoice.total - 0.001
              ? "Paid"
              : invoice.status === "Paid"
                ? "Sent"
                : invoice.status,
          updatedAt: new Date().toISOString(),
        });
      }

      setNotice("Payment deleted successfully.");
      setError("");
      await loadData();
    } catch (err) {
      console.error(err);
      setError("Unable to delete payment.");
    }
  }

  return (
    <main className="payment-page">
      <header className="payment-topbar">
        <Link href="/" className="payment-back-link">
          <ArrowLeft size={17} />
          Dashboard
        </Link>
        <span className="payment-storage-label">
          <span className="payment-storage-dot" />
          Local storage
        </span>
      </header>

      <section className="payment-content">
        <div className="payment-heading">
          <div>
            <p className="payment-eyebrow">FINANCE MANAGEMENT</p>
            <h1>Payment Tracker</h1>
            <p>Track received payments and outstanding invoice balances.</p>
          </div>

          <button
            className="payment-primary-btn"
            onClick={() => {
              setError("");
              setNotice("");
              setForm(emptyForm);
              setShowForm(true);
            }}
          >
            <Plus size={17} />
            Record Payment
          </button>
        </div>

        {notice && <div className="payment-notice">{notice}</div>}
        {error && <div className="payment-error">{error}</div>}

        <div className="payment-summary">
          <article className="payment-summary-card">
            <span className="payment-summary-icon">
              <Wallet size={20} />
            </span>
            <p>Total Received</p>
            <h2>{formatMoney(summary.totalReceived)}</h2>
            <small>All recorded payments</small>
          </article>

          <article className="payment-summary-card">
            <span className="payment-summary-icon">
              <TrendingUp size={20} />
            </span>
            <p>Outstanding Balance</p>
            <h2>{formatMoney(summary.totalOutstanding)}</h2>
            <small>Across all invoices</small>
          </article>

          <article className="payment-summary-card">
            <span className="payment-summary-icon">
              <CreditCard size={20} />
            </span>
            <p>Transactions</p>
            <h2>{summary.paymentCount}</h2>
            <small>Payments recorded</small>
          </article>
        </div>

        {showForm && (
          <section className="payment-form-panel">
            <div className="payment-form-heading">
              <div>
                <h2>Record a payment</h2>
                <p>Select an invoice and enter the amount received.</p>
              </div>
              <button
                className="payment-close-btn"
                onClick={() => setShowForm(false)}
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="payment-form-grid">
                <label className="payment-field payment-field-full">
                  Invoice *
                  <select
                    value={form.invoiceId}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        invoiceId: event.target.value,
                        amount: "",
                      })
                    }
                    required
                  >
                    <option value="">Select invoice</option>
                    {invoices
                      .filter((invoice) => getOutstanding(invoice) > 0.001)
                      .map((invoice) => (
                        <option key={invoice.id} value={invoice.id}>
                          {invoice.invoiceNumber} — {invoice.clientName} —
                          Outstanding:{" "}
                          {formatMoney(
                            getOutstanding(invoice),
                            invoice.currency,
                          )}
                        </option>
                      ))}
                  </select>
                </label>

                {selectedInvoice && (
                  <div className="payment-invoice-info payment-field-full">
                    <div>
                      <span>Invoice Total</span>
                      <strong>
                        {formatMoney(
                          selectedInvoice.total,
                          selectedInvoice.currency,
                        )}
                      </strong>
                    </div>
                    <div>
                      <span>Already Paid</span>
                      <strong>
                        {formatMoney(
                          getPaidAmount(selectedInvoice.id),
                          selectedInvoice.currency,
                        )}
                      </strong>
                    </div>
                    <div>
                      <span>Balance Due</span>
                      <strong>
                        {formatMoney(
                          getOutstanding(selectedInvoice),
                          selectedInvoice.currency,
                        )}
                      </strong>
                    </div>
                  </div>
                )}

                <label className="payment-field">
                  Amount Received *
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={
                      selectedInvoice
                        ? getOutstanding(selectedInvoice)
                        : undefined
                    }
                    placeholder="Enter amount"
                    value={form.amount}
                    onChange={(event) =>
                      setForm({ ...form, amount: event.target.value })
                    }
                    required
                  />
                </label>

                <label className="payment-field">
                  Payment Date *
                  <input
                    type="date"
                    value={form.paymentDate}
                    onChange={(event) =>
                      setForm({ ...form, paymentDate: event.target.value })
                    }
                    required
                  />
                </label>

                <label className="payment-field">
                  Payment Method *
                  <select
                    value={form.paymentMethod}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        paymentMethod: event.target.value as PaymentMethod,
                      })
                    }
                  >
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="payment-field">
                  Transaction Reference
                  <input
                    type="text"
                    placeholder="Optional reference ID"
                    value={form.referenceNumber}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        referenceNumber: event.target.value,
                      })
                    }
                  />
                </label>

                <label className="payment-field payment-field-full">
                  Notes
                  <textarea
                    rows={3}
                    placeholder="Optional payment notes"
                    value={form.notes}
                    onChange={(event) =>
                      setForm({ ...form, notes: event.target.value })
                    }
                  />
                </label>
              </div>

              <div className="payment-form-actions">
                <button
                  type="button"
                  className="payment-cancel-btn"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="payment-primary-btn"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Payment"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="payment-list-panel">
          <div className="payment-list-heading">
            <div>
              <h2>Payment History</h2>
              <p>All recorded transactions</p>
            </div>
            <input
              className="payment-search"
              type="search"
              placeholder="Search invoice, client or reference..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="payment-table-wrap">
            <table className="payment-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Client</th>
                  <th>Payment Date</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.invoiceNumber}</td>
                    <td>{payment.clientName}</td>
                    <td>{payment.paymentDate}</td>
                    <td>{payment.paymentMethod}</td>
                    <td>{payment.referenceNumber || "—"}</td>
                    <td>
                      <strong>
                        {formatMoney(payment.amount, payment.currency)}
                      </strong>
                    </td>
                    <td>
                      <button
                        className="payment-delete-btn"
                        title="Delete payment"
                        onClick={() => void handleDelete(payment)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="payment-empty">
                      {search
                        ? "No matching payments found."
                        : "No payments recorded yet. Click Record Payment to begin."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
