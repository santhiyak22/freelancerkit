"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  Plus,
  ArrowUpRight,
  MoreHorizontal,
  Download,
  Clock3,
  CheckCircle2,
  CircleDollarSign,
  BriefcaseBusiness,
  ChevronDown,
  CalendarDays,
  Sparkles,
} from "lucide-react";

import { getAllClients, getAllInvoices, getAllPayments } from "@/lib/db";

import type { Client } from "@/types/client";
import type { Invoice } from "@/types/invoice";
import type { Payment } from "@/types/payment";

type DashboardInvoice = Invoice & {
  paidAmount: number;
  outstanding: number;
  displayStatus: "Paid" | "Pending" | "Overdue" | "Draft";
};

type CurrencyTotal = {
  currency: string;
  amount: number;
};

function formatMoney(amount: number, currency: string) {
  const value = Number.isFinite(amount) ? amount : 0;

  if (/^[A-Z]{3}$/.test(currency)) {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      // Use generic formatting below.
    }
  }

  return `${currency || ""}${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(date: string) {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  );
}

const avatarColors = ["purple", "blue", "orange", "green"];

function getAvatarColor(value: string) {
  const total = value
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return avatarColors[total % avatarColors.length];
}

function groupByCurrency(items: CurrencyTotal[]) {
  const grouped = new Map<string, number>();

  items.forEach((item) => {
    grouped.set(item.currency, (grouped.get(item.currency) || 0) + item.amount);
  });

  return Array.from(grouped.entries()).map(([currency, amount]) => ({
    currency,
    amount,
  }));
}

function Avatar({ initials, color }: { initials: string; color: string }) {
  return <div className={`avatar ${color}`}>{initials}</div>;
}

function RevenueChart({
  payments,
  currency,
  period,
  currentDate,
}: {
  payments: Payment[];
  currency: string;
  period: string;
  currentDate: Date | null;
}) {
  const months = useMemo(() => {
    if (!currentDate) return [];

    const count = period === "This year" ? 12 : 7;

    return Array.from({ length: count }, (_, index) => {
      const monthOffset =
        period === "This year"
          ? index
          : currentDate.getMonth() - count + 1 + index;

      const date = new Date(currentDate.getFullYear(), monthOffset, 1);

      return {
        month: date.toLocaleDateString("en-US", {
          month: "short",
        }),
        year: date.getFullYear(),
        monthIndex: date.getMonth(),
        value: 0,
      };
    });
  }, [period, currentDate]);

  const chartData = useMemo(() => {
    if (!currentDate) return [];

    // Create fresh objects so recalculations never mutate months.
    const result = months.map((item) => ({
      ...item,
      value: 0,
    }));

    const currentYear = currentDate.getFullYear();

    const startDate =
      period === "This year"
        ? new Date(currentYear, 0, 1)
        : new Date(currentYear, currentDate.getMonth() - 6, 1);

    const endDate = new Date(currentDate);
    endDate.setHours(23, 59, 59, 999);

    payments.forEach((payment) => {
      if (payment.currency !== currency) return;

      const date = new Date(payment.paymentDate);

      if (Number.isNaN(date.getTime()) || date < startDate || date > endDate) {
        return;
      }

      const month = result.find(
        (item) =>
          item.year === date.getFullYear() &&
          item.monthIndex === date.getMonth(),
      );

      if (month) {
        month.value += payment.amount;
      }
    });

    return result;
  }, [payments, currency, months, period, currentDate]);

  const maxValue = Math.max(1, ...chartData.map((item) => item.value));

  const points = chartData
    .map((item, index) => {
      const x =
        chartData.length === 1
          ? 310
          : 10 + (index * 600) / (chartData.length - 1);

      const y = 150 - (item.value / maxValue) * 130;

      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = points ? `10,150 ${points} 610,150` : "10,150 610,150";

  return (
    <div className="chart-wrap">
      <div className="chart-y-labels">
        {[1, 0.75, 0.5, 0.25, 0].map((fraction) => (
          <span key={fraction}>
            {formatMoney(maxValue * fraction, currency)}
          </span>
        ))}
      </div>

      <div className="chart-main">
        <svg
          viewBox="0 0 620 170"
          preserveAspectRatio="none"
          className="revenue-svg"
          role="img"
          aria-label={`Revenue chart in ${currency}`}
        >
          {[10, 45, 80, 115, 150].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="620"
              y2={y}
              stroke="#edf0f3"
              strokeDasharray="4 5"
            />
          ))}

          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16a37b" stopOpacity=".22" />
              <stop offset="100%" stopColor="#16a37b" stopOpacity="0" />
            </linearGradient>
          </defs>

          <polygon points={areaPoints} fill="url(#revenueGradient)" />

          {points && (
            <polyline
              points={points}
              fill="none"
              stroke="#159b75"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {chartData.map((item, index) => {
            const x =
              chartData.length === 1
                ? 310
                : 10 + (index * 600) / (chartData.length - 1);

            const y = 150 - (item.value / maxValue) * 130;

            return (
              <circle
                key={`${item.month}-${item.year}`}
                cx={x}
                cy={y}
                r="4"
                fill="#fff"
                stroke="#159b75"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>

        <div className="chart-x-labels">
          {chartData.map((item, index) => (
            <span key={`${item.month}-${item.year}-${index}`}>
              {item.month}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();

  const [period, setPeriod] = useState("Last 7 months");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");

  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [chartCurrency, setChartCurrency] = useState("");

  // Current time is initialized only in the browser after mounting.
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  // LOAD ACTUAL DATABASE DATA

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setLoadError("");

        const [clientData, invoiceData, paymentData] = await Promise.all([
          getAllClients(),
          getAllInvoices(),
          getAllPayments(),
        ]);

        if (!active) return;

        setClients(clientData);
        setInvoices(invoiceData);
        setPayments(paymentData);

        const currencies = Array.from(
          new Set(
            paymentData.map((payment) => payment.currency).filter(Boolean),
          ),
        );

        setChartCurrency((current) =>
          current && currencies.includes(current)
            ? current
            : currencies[0] || "",
        );
      } catch (error) {
        if (!active) return;

        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load dashboard data.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3000);
  };

  // CALCULATE PAYMENT TOTALS PER INVOICE

  const paidByInvoice = useMemo(() => {
    const totals = new Map<string, number>();

    payments.forEach((payment) => {
      totals.set(
        payment.invoiceId,
        (totals.get(payment.invoiceId) || 0) + payment.amount,
      );
    });

    return totals;
  }, [payments]);

  // CALCULATE INVOICE BALANCES AND STATUS

  const dashboardInvoices = useMemo<DashboardInvoice[]>(() => {
    if (!currentDate) return [];

    const today = new Date(currentDate);
    today.setHours(0, 0, 0, 0);

    return invoices.map((invoice) => {
      const paidAmount = paidByInvoice.get(invoice.id) || 0;

      const outstanding = Math.max(0, invoice.total - paidAmount);

      const dueDate = new Date(invoice.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      let displayStatus: DashboardInvoice["displayStatus"];

      if (outstanding <= 0) {
        displayStatus = "Paid";
      } else if (invoice.status === "Draft") {
        displayStatus = "Draft";
      } else if (
        invoice.dueDate &&
        !Number.isNaN(dueDate.getTime()) &&
        dueDate < today
      ) {
        displayStatus = "Overdue";
      } else {
        displayStatus = "Pending";
      }

      return {
        ...invoice,
        paidAmount,
        outstanding,
        displayStatus,
      };
    });
  }, [invoices, paidByInvoice, currentDate]);

  // TOTAL REVENUE BY CURRENCY

  const revenueTotals = useMemo(() => {
    return groupByCurrency(
      payments.map((payment) => ({
        currency: payment.currency,
        amount: payment.amount,
      })),
    );
  }, [payments]);

  // OUTSTANDING BY CURRENCY

  const outstandingTotals = useMemo(() => {
    return groupByCurrency(
      dashboardInvoices.map((invoice) => ({
        currency: invoice.currency,
        amount: invoice.outstanding,
      })),
    );
  }, [dashboardInvoices]);

  // INVOICE STATUS COUNTS

  const paidCount = dashboardInvoices.filter(
    (invoice) => invoice.displayStatus === "Paid",
  ).length;

  const pendingCount = dashboardInvoices.filter(
    (invoice) =>
      invoice.displayStatus === "Pending" || invoice.displayStatus === "Draft",
  ).length;

  const overdueCount = dashboardInvoices.filter(
    (invoice) => invoice.displayStatus === "Overdue",
  ).length;

  // RECENT INVOICES

  const recentInvoices = useMemo(() => {
    return [...dashboardInvoices]
      .sort(
        (a, b) =>
          new Date(b.createdAt || b.issueDate).getTime() -
          new Date(a.createdAt || a.issueDate).getTime(),
      )
      .slice(0, 5);
  }, [dashboardInvoices]);

  const filteredInvoices = recentInvoices.filter((invoice) =>
    `${invoice.invoiceNumber} ${invoice.clientName}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  // TOP CLIENTS BASED ON RECEIVED PAYMENTS

  const topClients = useMemo(() => {
    const totals = new Map<string, number>();

    payments.forEach((payment) => {
      if (chartCurrency && payment.currency !== chartCurrency) {
        return;
      }

      totals.set(
        payment.clientId,
        (totals.get(payment.clientId) || 0) + payment.amount,
      );
    });

    return [...clients]
      .map((client) => ({
        ...client,
        totalPaid: totals.get(client.id) || 0,
      }))
      .sort((a, b) => b.totalPaid - a.totalPaid)
      .slice(0, 4);
  }, [clients, payments, chartCurrency]);

  // EXPORT REPORT

  function handleExportReport() {
    const rows = [
      [
        "Invoice Number",
        "Client",
        "Issue Date",
        "Currency",
        "Invoice Total",
        "Paid Amount",
        "Outstanding",
        "Status",
      ],
      ...dashboardInvoices.map((invoice) => [
        invoice.invoiceNumber,
        invoice.clientName,
        invoice.issueDate,
        invoice.currency,
        invoice.total,
        invoice.paidAmount,
        invoice.outstanding,
        invoice.displayStatus,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "freelancerkit-dashboard-report.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  const mainCurrency = revenueTotals[0]?.currency || "USD";

  return (
    <div className="dashboard-content">
      <div className="welcome-row">
        <div>
          <div className="eyebrow">
            <Sparkles size={14} />
            YOUR BUSINESS AT A GLANCE
          </div>

          <h1>
            Good afternoon <span>✦</span>
          </h1>

          <p>Here&apos;s what&apos;s happening with your freelance business.</p>
        </div>

        <div className="welcome-actions">
          <button className="button secondary" onClick={handleExportReport}>
            <Download size={16} />
            Export report
          </button>

          <button
            className="button primary"
            onClick={() => router.push("/invoices")}
          >
            <Plus size={17} />
            New invoice
          </button>
        </div>
      </div>

      {notice && <div className="notice">{notice}</div>}

      {loadError && <div className="notice">Dashboard error: {loadError}</div>}

      {loading && <div className="notice">Loading your business data...</div>}

      {/* STATISTICS */}

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-top">
            <span>Total Revenue</span>
            <div className="stat-icon green-icon">
              <CircleDollarSign size={20} />
            </div>
          </div>

          <div className="stat-number">
            {formatMoney(
              revenueTotals.find((item) => item.currency === mainCurrency)
                ?.amount || 0,
              mainCurrency,
            )}
          </div>

          <div className="stat-bottom">
            <span>Received payments</span>
          </div>

          {revenueTotals.length > 1 && (
            <div className="text-xs mt-2">
              {revenueTotals
                .filter((item) => item.currency !== mainCurrency)
                .map((item) => (
                  <div key={item.currency}>
                    {formatMoney(item.amount, item.currency)}
                  </div>
                ))}
            </div>
          )}
        </article>

        <article className="stat-card">
          <div className="stat-top">
            <span>Outstanding</span>
            <div className="stat-icon amber-icon">
              <Clock3 size={20} />
            </div>
          </div>

          <div className="stat-number">
            {formatMoney(
              outstandingTotals.find((item) => item.currency === mainCurrency)
                ?.amount || 0,
              mainCurrency,
            )}
          </div>

          <div className="stat-bottom">
            <span>Remaining invoice balances</span>
          </div>

          {outstandingTotals.length > 1 && (
            <div className="text-xs mt-2">
              {outstandingTotals
                .filter((item) => item.currency !== mainCurrency)
                .map((item) => (
                  <div key={item.currency}>
                    {formatMoney(item.amount, item.currency)}
                  </div>
                ))}
            </div>
          )}
        </article>

        <article className="stat-card">
          <div className="stat-top">
            <span>Total Clients</span>
            <div className="stat-icon blue-icon">
              <Users size={20} />
            </div>
          </div>

          <div className="stat-number">{clients.length}</div>

          <div className="stat-bottom">
            <span>Saved clients</span>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-top">
            <span>Active Projects</span>
            <div className="stat-icon purple-icon">
              <BriefcaseBusiness size={20} />
            </div>
          </div>

          <div className="stat-number">
            {
              dashboardInvoices.filter(
                (invoice) =>
                  invoice.outstanding > 0 && invoice.displayStatus !== "Draft",
              ).length
            }
          </div>

          <div className="stat-bottom">
            <span>Invoices with balance due</span>
          </div>
        </article>
      </section>

      {/* REVENUE AND INVOICE OVERVIEW */}

      <section className="main-grid">
        <article className="panel revenue-panel">
          <div className="panel-header">
            <div>
              <h2>Revenue overview</h2>
              <p>Track your actual payments over time</p>
            </div>

            <button
              className="select-button"
              onClick={() =>
                setPeriod(
                  period === "Last 7 months" ? "This year" : "Last 7 months",
                )
              }
            >
              <CalendarDays size={15} />
              {period}
              <ChevronDown size={14} />
            </button>
          </div>

          <div className="revenue-summary">
            <div className="revenue-value">
              {formatMoney(
                revenueTotals.find((item) => item.currency === chartCurrency)
                  ?.amount || 0,
                chartCurrency || "USD",
              )}
            </div>

            <span className="trend positive">
              <CheckCircle2 size={14} />
              Actual payments
            </span>
          </div>

          {revenueTotals.length > 1 && (
            <div className="mb-3">
              <select
                value={chartCurrency}
                onChange={(event) => setChartCurrency(event.target.value)}
                className="select-button"
                aria-label="Choose revenue chart currency"
              >
                {revenueTotals.map((item) => (
                  <option key={item.currency} value={item.currency}>
                    {item.currency}
                  </option>
                ))}
              </select>
            </div>
          )}

          <RevenueChart
            payments={payments}
            currency={chartCurrency || "USD"}
            period={period}
            currentDate={currentDate}
          />
        </article>

        <article className="panel overview-panel">
          <div className="panel-header">
            <div>
              <h2>Invoice overview</h2>
              <p>Your invoice payment summary</p>
            </div>

            <button
              className="icon-button"
              aria-label="View invoices"
              onClick={() => router.push("/invoices")}
            >
              <MoreHorizontal size={20} />
            </button>
          </div>

          <div className="invoice-total">
            <span>Total invoices</span>
            <strong>{invoices.length}</strong>
          </div>

          <div className="progress-track">
            <div
              className="progress-paid"
              style={{
                width: `${
                  invoices.length ? (paidCount / invoices.length) * 100 : 0
                }%`,
              }}
            />

            <div
              className="progress-pending"
              style={{
                width: `${
                  invoices.length ? (pendingCount / invoices.length) * 100 : 0
                }%`,
              }}
            />

            <div
              className="progress-overdue"
              style={{
                width: `${
                  invoices.length ? (overdueCount / invoices.length) * 100 : 0
                }%`,
              }}
            />
          </div>

          <div className="overview-list">
            <div>
              <span className="legend-dot paid-dot" />
              Paid <strong>{paidCount}</strong>
            </div>

            <div>
              <span className="legend-dot pending-dot" />
              Pending <strong>{pendingCount}</strong>
            </div>

            <div>
              <span className="legend-dot overdue-dot" />
              Overdue <strong>{overdueCount}</strong>
            </div>
          </div>

          <div className="overview-footer">
            <CheckCircle2 size={16} />
            <span>
              {invoices.length
                ? `${paidCount} of ${invoices.length} invoices fully paid.`
                : "Your invoice summary will appear here."}
            </span>
          </div>
        </article>
      </section>

      {/* RECENT INVOICES AND TOP CLIENTS */}

      <section className="bottom-grid">
        <article className="panel table-panel">
          <div className="panel-header">
            <div>
              <h2>Recent invoices</h2>
              <p>Your latest saved invoices</p>
            </div>

            <button
              className="text-button"
              onClick={() => router.push("/invoices")}
            >
              View all <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="table-toolbar">
            <div className="search-box">
              <Search size={16} />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search invoices..."
                aria-label="Search invoices"
              />
            </div>

            <span className="table-count">
              {filteredInvoices.length} invoices
            </span>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>INVOICE</th>
                  <th>CLIENT</th>
                  <th>DATE</th>
                  <th>AMOUNT</th>
                  <th>STATUS</th>
                </tr>
              </thead>

              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="invoice-id">{invoice.invoiceNumber}</td>

                    <td>
                      <div className="client-cell">
                        <Avatar
                          initials={getInitials(invoice.clientName)}
                          color={getAvatarColor(invoice.clientName)}
                        />

                        <div>
                          <strong>{invoice.clientName}</strong>
                          <small>
                            {invoice.items?.[0]?.description || "Invoice"}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td className="date-cell">
                      {formatDate(invoice.issueDate)}
                    </td>

                    <td className="amount-cell">
                      {formatMoney(invoice.total, invoice.currency)}
                    </td>

                    <td>
                      <span
                        className={`status ${invoice.displayStatus.toLowerCase()}`}
                      >
                        {invoice.displayStatus}
                      </span>
                    </td>
                  </tr>
                ))}

                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty-state">
                      {invoices.length
                        ? "No matching invoices found."
                        : "No invoices yet. Create your first invoice."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel clients-panel">
          <div className="panel-header">
            <div>
              <h2>Top clients</h2>
              <p>Ranked by received payments</p>
            </div>

            <button
              className="icon-button"
              aria-label="View clients"
              onClick={() => router.push("/clients")}
            >
              <MoreHorizontal size={20} />
            </button>
          </div>

          <div className="client-list">
            {topClients.map((client) => (
              <div className="client-item" key={client.id}>
                <Avatar
                  initials={getInitials(client.name)}
                  color={getAvatarColor(client.name)}
                />

                <div className="client-info">
                  <strong>{client.name}</strong>
                  <span>{client.email || client.company || "Client"}</span>
                </div>

                <strong className="client-amount">
                  {formatMoney(client.totalPaid, chartCurrency || "USD")}
                </strong>
              </div>
            ))}

            {topClients.length === 0 && (
              <p className="empty-state">No clients added yet.</p>
            )}
          </div>

          <button
            className="add-client-button"
            onClick={() => router.push("/clients")}
          >
            <Plus size={16} />
            Manage clients
          </button>
        </article>
      </section>

      <footer className="dashboard-footer">
        <span>© 2026 FreelancerKit</span>

        <span>
          Built for independent creators <span className="footer-heart">♥</span>
        </span>
      </footer>
    </div>
  );
}
