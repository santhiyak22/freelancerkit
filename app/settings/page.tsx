"use client";

import { useRef, useState } from "react";
import {
  Download,
  Upload,
  ShieldCheck,
  Database,
  FileJson,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

import { createBackup, restoreBackup } from "@/lib/db";

export default function SettingsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [lastBackup, setLastBackup] = useState("");

  async function handleExport() {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const backup = await createBackup();

      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      const date = new Date().toISOString().slice(0, 10);

      link.href = url;
      link.download = `freelancerkit-backup-${date}.json`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);

      setLastBackup(new Date().toLocaleString());
      setMessage("Your backup was downloaded successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to export backup.");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setLoading(true);
    setMessage("");
    setError("");

    try {
      if (!file.name.toLowerCase().endsWith(".json")) {
        throw new Error("Please select a JSON backup file.");
      }

      const text = await file.text();

      let backup: unknown;

      try {
        backup = JSON.parse(text);
      } catch {
        throw new Error("The selected file contains invalid JSON.");
      }

      const confirmed = window.confirm(
        "Restore this backup?\n\n" +
          "Existing records with matching IDs will be updated. " +
          "Other existing records will be preserved. " +
          "It is recommended to export a backup before continuing.",
      );

      if (!confirmed) return;

      await restoreBackup(backup);

      setMessage(
        "Backup restored successfully. Your existing records have been preserved.",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to restore backup.",
      );
    } finally {
      setLoading(false);

      // Allow selecting the same file again.
      event.target.value = "";
    }
  }

  return (
    <div className="dashboard-content">
      <div className="welcome-row">
        <div>
          <h1>Settings</h1>
          <p>Manage your FreelancerKit workspace.</p>
        </div>
      </div>

      <section className="panel">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <Database size={22} />
          </div>

          <div>
            <h2 className="text-lg font-semibold">Backup & Restore</h2>
            <p className="text-sm text-gray-500">
              Protect your clients, invoices, quotations and payments.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* EXPORT */}
          <div className="border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Download size={20} />
              <h3 className="font-semibold">Export Backup</h3>
            </div>

            <p className="text-sm text-gray-500 mb-5">
              Download all your business data as a JSON file. Keep this file
              somewhere safe.
            </p>

            <button
              type="button"
              onClick={handleExport}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-3 font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Download size={18} />
              )}
              Download Backup
            </button>
          </div>

          {/* IMPORT */}
          <div className="border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Upload size={20} />
              <h3 className="font-semibold">Import Backup</h3>
            </div>

            <p className="text-sm text-gray-500 mb-5">
              Restore your business records from a previously exported
              FreelancerKit JSON backup.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImport}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-3 font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Upload size={18} />
              )}
              Choose Backup File
            </button>
          </div>
        </div>

        {/* STATUS */}
        {message && (
          <div className="mt-5 flex items-start gap-2 rounded-lg bg-green-50 border border-green-200 p-4 text-green-700">
            <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
            <p className="text-sm">{message}</p>
          </div>
        )}

        {error && (
          <div className="mt-5 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {lastBackup && (
          <p className="text-xs text-gray-500 mt-4">
            Last backup downloaded: {lastBackup}
          </p>
        )}
      </section>

      {/* DATA PROTECTION */}
      <section className="panel mt-5">
        <div className="flex items-center gap-3 mb-3">
          <ShieldCheck size={22} className="text-green-600" />
          <h2 className="font-semibold">Data Protection</h2>
        </div>

        <ul className="space-y-3 text-sm text-gray-600">
          <li className="flex gap-2">
            <CheckCircle2 size={17} className="text-green-600 shrink-0" />
            Existing records are preserved during restore.
          </li>

          <li className="flex gap-2">
            <CheckCircle2 size={17} className="text-green-600 shrink-0" />
            Imported records update matching IDs.
          </li>

          <li className="flex gap-2">
            <CheckCircle2 size={17} className="text-green-600 shrink-0" />
            Invalid and unsupported backup files are rejected.
          </li>

          <li className="flex gap-2">
            <CheckCircle2 size={17} className="text-green-600 shrink-0" />
            Your data stays in your browser's local IndexedDB storage.
          </li>
        </ul>

        <div className="mt-5 rounded-lg bg-amber-50 border border-amber-200 p-4">
          <div className="flex items-center gap-2 text-amber-800 font-medium text-sm">
            <FileJson size={18} />
            Important
          </div>

          <p className="text-sm text-amber-800 mt-2">
            FreelancerKit stores data locally in this browser. Clearing browser
            storage or using another device will not automatically transfer your
            records. Download backups regularly and store them securely.
          </p>
        </div>
      </section>
    </div>
  );
}
