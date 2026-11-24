"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Plus,
  Users,
  Mail,
  Phone,
  Building2,
  Pencil,
  Trash2,
  X,
  Eye,
  UserRound,
  RefreshCw,
} from "lucide-react";

import { getAllClients, saveClient, removeClient } from "@/lib/db";

import type { Client } from "@/types/client";

const emptyForm = {
  name: "",
  company: "",
  email: "",
  phone: "",
  country: "",
  notes: "",
};

type ClientForm = typeof emptyForm;

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const loadClients = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllClients();
      setClients(data);
    } catch {
      setError("Unable to load clients. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const filteredClients = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return clients;

    return clients.filter((client) =>
      [client.name, client.company, client.email, client.phone, client.country]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [clients, search]);

  function openAddModal() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  }

  function openEditModal(client: Client) {
    setEditingId(client.id);
    setForm({
      name: client.name,
      company: client.company,
      email: client.email,
      phone: client.phone,
      country: client.country,
      notes: client.notes,
    });
    setError("");
    setSelectedClient(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();

    if (!name || !email) {
      setError("Client name and email are required.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    const duplicate = clients.some(
      (client) =>
        client.email.toLowerCase() === email && client.id !== editingId,
    );

    if (duplicate) {
      setError("A client with this email already exists.");
      return;
    }

    try {
      setSaving(true);

      const existing = clients.find((client) => client.id === editingId);

      const now = new Date().toISOString();

      const client: Client = {
        id: editingId ?? crypto.randomUUID(),
        name,
        company: form.company.trim(),
        email,
        phone: form.phone.trim(),
        country: form.country.trim(),
        notes: form.notes.trim(),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      await saveClient(client);
      await loadClients();

      closeModal();
      setNotice(
        editingId
          ? "Client updated successfully."
          : "New client added successfully.",
      );
    } catch {
      setError("Unable to save client. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(client: Client) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${client.name}?`,
    );

    if (!confirmed) return;

    try {
      await removeClient(client.id);
      await loadClients();

      if (selectedClient?.id === client.id) {
        setSelectedClient(null);
      }

      setNotice("Client deleted successfully.");
    } catch {
      setError("Unable to delete this client.");
    }
  }

  return (
    <main className="clients-page">
      <header className="clients-topbar">
        <Link href="/" className="back-link">
          <ArrowLeft size={17} />
          Dashboard
        </Link>

        <span className="storage-label">
          <span /> Local storage enabled
        </span>
      </header>

      <div className="clients-content">
        <div className="clients-heading">
          <div>
            <div className="clients-eyebrow">BUSINESS MANAGEMENT / CLIENTS</div>
            <h1>Clients</h1>
            <p>Manage your relationships and keep client details organized.</p>
          </div>

          <button className="client-primary-btn" onClick={openAddModal}>
            <Plus size={17} />
            Add new client
          </button>
        </div>

        {notice && (
          <div className="client-notice">
            {notice}
            <button onClick={() => setNotice("")} aria-label="Dismiss">
              <X size={15} />
            </button>
          </div>
        )}

        {error && !modalOpen && <div className="client-error">{error}</div>}

        <section className="client-stats">
          <article>
            <div className="client-stat-icon">
              <Users size={19} />
            </div>
            <div>
              <span>Total clients</span>
              <strong>{clients.length}</strong>
            </div>
          </article>

          <article>
            <div className="client-stat-icon">
              <Building2 size={19} />
            </div>
            <div>
              <span>Companies</span>
              <strong>
                {
                  new Set(
                    clients
                      .map((client) => client.company.trim().toLowerCase())
                      .filter(Boolean),
                  ).size
                }
              </strong>
            </div>
          </article>

          <article>
            <div className="client-stat-icon">
              <UserRound size={19} />
            </div>
            <div>
              <span>Individual clients</span>
              <strong>
                {clients.filter((client) => !client.company.trim()).length}
              </strong>
            </div>
          </article>
        </section>

        <section className="clients-panel">
          <div className="clients-panel-heading">
            <div>
              <h2>All clients</h2>
              <p>Your complete client directory</p>
            </div>

            <button
              className="refresh-btn"
              onClick={() => void loadClients()}
              aria-label="Refresh clients"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="clients-toolbar">
            <div className="clients-search">
              <Search size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, company or email..."
              />
              {search && (
                <button onClick={() => setSearch("")} aria-label="Clear search">
                  <X size={15} />
                </button>
              )}
            </div>

            <span>{filteredClients.length} results</span>
          </div>

          {loading ? (
            <div className="clients-empty">Loading clients...</div>
          ) : filteredClients.length === 0 ? (
            <div className="clients-empty">
              <div className="empty-icon">
                <Users size={28} />
              </div>
              <h3>{search ? "No matching clients" : "No clients yet"}</h3>
              <p>
                {search
                  ? "Try another name, email or company."
                  : "Add your first client to start managing your business."}
              </p>
              {!search && (
                <button className="client-primary-btn" onClick={openAddModal}>
                  <Plus size={16} /> Add your first client
                </button>
              )}
            </div>
          ) : (
            <div className="clients-table-wrap">
              <table className="clients-table">
                <thead>
                  <tr>
                    <th>CLIENT</th>
                    <th>COMPANY</th>
                    <th>EMAIL</th>
                    <th>PHONE</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client.id}>
                      <td>
                        <div className="client-name-cell">
                          <div className="client-initials">
                            {client.name.slice(0, 2).toUpperCase()}
                          </div>
                          <strong>{client.name}</strong>
                        </div>
                      </td>

                      <td>{client.company || "Individual"}</td>

                      <td>
                        <span className="client-email">{client.email}</span>
                      </td>

                      <td>{client.phone || "—"}</td>

                      <td>
                        <div className="client-actions">
                          <button
                            title="View client"
                            aria-label="View client"
                            onClick={() => setSelectedClient(client)}
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            title="Edit client"
                            aria-label="Edit client"
                            onClick={() => openEditModal(client)}
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            className="delete-action"
                            title="Delete client"
                            aria-label="Delete client"
                            onClick={() => void handleDelete(client)}
                          >
                            <Trash2 size={16} />
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

        <p className="clients-footer">
          FreelancerKit · Your client data stays in this browser.
        </p>
      </div>

      {modalOpen && (
        <div
          className="client-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            className="client-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="client-modal-title"
          >
            <div className="client-modal-header">
              <div>
                <h2 id="client-modal-title">
                  {editingId ? "Edit client" : "Add new client"}
                </h2>
                <p>Enter your client&apos;s business information.</p>
              </div>

              <button onClick={closeModal} aria-label="Close modal">
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <label>
                Client name *
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Olivia Smith"
                />
              </label>

              <label>
                Company name
                <input
                  value={form.company}
                  onChange={(e) =>
                    setForm({ ...form, company: e.target.value })
                  }
                  placeholder="e.g. Olivia Studio"
                />
              </label>

              <label>
                Email address *
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="hello@example.com"
                />
              </label>

              <div className="client-form-grid">
                <label>
                  Phone number
                  <input
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    placeholder="+91 98765 43210"
                  />
                </label>

                <label>
                  Country
                  <input
                    value={form.country}
                    onChange={(e) =>
                      setForm({ ...form, country: e.target.value })
                    }
                    placeholder="India"
                  />
                </label>
              </div>

              <label>
                Notes
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Additional client information..."
                />
              </label>

              {error && <div className="client-error">{error}</div>}

              <div className="client-modal-actions">
                <button
                  type="button"
                  className="client-cancel-btn"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="client-primary-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save changes"
                      : "Add client"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {selectedClient && (
        <div
          className="client-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedClient(null);
          }}
        >
          <section className="client-modal" role="dialog" aria-modal="true">
            <div className="client-modal-header">
              <div>
                <h2>Client details</h2>
                <p>View your saved client information.</p>
              </div>
              <button
                onClick={() => setSelectedClient(null)}
                aria-label="Close"
              >
                <X size={19} />
              </button>
            </div>

            <div className="client-detail-profile">
              <div className="client-detail-avatar">
                {selectedClient.name.slice(0, 2).toUpperCase()}
              </div>
              <h3>{selectedClient.name}</h3>
              <p>{selectedClient.company || "Individual client"}</p>
            </div>

            <div className="client-detail-list">
              <div>
                <Mail size={16} />
                <span>{selectedClient.email}</span>
              </div>
              <div>
                <Phone size={16} />
                <span>{selectedClient.phone || "Not provided"}</span>
              </div>
              <div>
                <Building2 size={16} />
                <span>{selectedClient.country || "Country not provided"}</span>
              </div>
            </div>

            {selectedClient.notes && (
              <div className="client-notes">
                <strong>Notes</strong>
                <p>{selectedClient.notes}</p>
              </div>
            )}

            <div className="client-modal-actions">
              <button
                className="client-cancel-btn"
                onClick={() => setSelectedClient(null)}
              >
                Close
              </button>
              <button
                className="client-primary-btn"
                onClick={() => openEditModal(selectedClient)}
              >
                <Pencil size={15} /> Edit client
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
