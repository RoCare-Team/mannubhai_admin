"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/config";

// ── Constants ────────────────────────────────────────────────────
const PAGE_SIZE = 9;

// ── Helpers ──────────────────────────────────────────────────────
function getEmbedSrc(raw = "") {
  if (raw.startsWith("http")) return raw;
  return "";
}

function generateNextId(locations) {
  const ids = locations
    .map((l) => parseInt(l.id, 10))
    .filter((n) => !isNaN(n));
  return ids.length > 0 ? Math.max(...ids) + 1 : 1;
}

// ── Empty form state ─────────────────────────────────────────────
const EMPTY_FORM = {
  id: "",
  branch: "",
  city_name: "",
  address: "",
  time: "",
  map: "",
  map_link: "",
  city_id:"",
};

// ── Modal ────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Form ─────────────────────────────────────────────────────────
function LocationForm({ initial, allLocations, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial);
  const [idError, setIdError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validateId = (val) => {
    if (!val.trim()) { setIdError("ID is required"); return false; }
    const isDuplicate = allLocations.some(
      (l) => String(l.id) === String(val.trim()) && l.docId !== initial?.docId
    );
    if (isDuplicate) { setIdError("This ID is already used by another location"); return false; }
    setIdError("");
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateId(form.id)) return;
    onSave(form);
  };

  return (
    <form className="loc-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-group">
          <label>ID <span className="req">*</span></label>
          <input
            value={form.id}
            onChange={(e) => { set("id", e.target.value); validateId(e.target.value); }}
            placeholder="e.g. 42"
            required
          />
          {idError && <span className="field-error">{idError}</span>}
        </div>

        <div className="form-group">
          <label>Branch Name <span className="req">*</span></label>
          <input
            value={form.branch}
            onChange={(e) => set("branch", e.target.value)}
            placeholder="e.g. Koramangala Service Centre"
            required
          />
        </div>

        <div className="form-group">
          <label>City <span className="req">*</span></label>
          <input
            value={form.city_name}
            onChange={(e) => set("city_name", e.target.value)}
            placeholder="e.g. Bangalore"
            required
          />
        </div>

        <div className="form-group">
          <label>City Id <span className="req">*</span></label>
          <input
            value={form.city_id}
            onChange={(e) => set("city_id", e.target.value)}
            placeholder="e.g. city_id"
            required
          />
        </div>

        <div className="form-group full">
          <label>Address <span className="req">*</span></label>
          <textarea
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="Full address…"
            rows={2}
            required
          />
        </div>

        <div className="form-group">
          <label>Working Hours</label>
          <input
            value={form.time}
            onChange={(e) => set("time", e.target.value)}
            placeholder="e.g. 9 AM – 7 PM"
          />
        </div>

        <div className="form-group">
          <label>Directions Link</label>
          <input
            value={form.map_link}
            onChange={(e) => set("map_link", e.target.value)}
            placeholder="https://maps.google.com/…"
          />
        </div>

        <div className="form-group full">
          <label>Map Embed URL</label>
          <input
            value={form.map}
            onChange={(e) => set("map", e.target.value)}
            placeholder="https://www.google.com/maps/embed?pb=…"
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={saving || !!idError}>
          {saving ? "Saving…" : "Save Location"}
        </button>
      </div>
    </form>
  );
}

// ── Branch Card ──────────────────────────────────────────────────
function BranchCard({ branch, onEdit, onDelete }) {
  const [mapError, setMapError] = useState(false);
  const embedSrc = getEmbedSrc(branch.map);

  return (
    <div className="branch-card">
      <div className="map-wrap">
        {embedSrc && !mapError ? (
          <iframe
            src={embedSrc}
            title={`Map – ${branch.branch}`}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            onError={() => setMapError(true)}
          />
        ) : (
          <div className="map-placeholder">
            <span>📍</span>
            <p>Map unavailable</p>
          </div>
        )}
      </div>

      <div className="card-body">
        <span className="city-badge">{branch.city_name}</span>
        <h2 className="branch-name">{branch.branch}</h2>
        <p className="address">{branch.address}</p>

        <div className="meta-row">
          <span className="meta-icon">🕐</span>
          <span>{branch.time}</span>
        </div>

        <div className="card-footer">
          {branch.map_link && branch.map_link !== "#" ? (
            <a href={branch.map_link} target="_blank" rel="noopener noreferrer" className="directions-btn">
              Get Directions ↗
            </a>
          ) : (
            <span className="no-link">No directions link</span>
          )}
          <span className="branch-id">#{branch.id}</span>
        </div>

        <div className="admin-actions">
          <button className="btn-edit" onClick={() => onEdit(branch)}>✏ Edit</button>
          <button className="btn-delete" onClick={() => onDelete(branch)}>🗑 Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Confirm Dialog ───────────────────────────────────────────────
function ConfirmDialog({ branch, onConfirm, onCancel, deleting }) {
  return (
    <Modal title="Delete Location" onClose={onCancel}>
      <div className="confirm-body">
        <p>Are you sure you want to delete <strong>{branch.branch}</strong>?</p>
        <p className="confirm-sub">This action cannot be undone.</p>
        <div className="form-actions">
          <button className="btn-ghost" onClick={onCancel} disabled={deleting}>Cancel</button>
          <button className="btn-danger" onClick={onConfirm} disabled={deleting}>
            {deleting ? "Deleting…" : "Yes, Delete"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Toast ────────────────────────────────────────────────────────
function Toast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return <div className={`toast toast-${type}`}>{message}</div>;
}

// ── Main Page ────────────────────────────────────────────────────
export default function FranchiseLocationsPage() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("All");
  const [page, setPage] = useState(1);

  // Modal state
  const [modalMode, setModalMode] = useState(null); // "add" | "edit" | "delete"
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const snapshot = await getDocs(collection(db, "franchise_loaction"));
      const data = snapshot.docs.map((d) => ({ docId: d.id, ...d.data() }));
      setLocations(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load franchise locations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLocations(); }, [fetchLocations]);

  // ── Filter + Paginate ──────────────────────────────────────────
  const cities = ["All", ...new Set(locations.map((l) => l.city_name).filter(Boolean))];

  const filtered = locations.filter((l) => {
    const matchCity = cityFilter === "All" || l.city_name === cityFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      l.branch?.toLowerCase().includes(q) ||
      l.address?.toLowerCase().includes(q) ||
      l.city_name?.toLowerCase().includes(q);
    return matchCity && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, cityFilter]);

  // ── Actions ────────────────────────────────────────────────────
  const showToast = (message, type = "success") => setToast({ message, type });

  const handleAdd = () => {
    const nextId = String(generateNextId(locations));
    setSelectedBranch({ ...EMPTY_FORM, id: nextId });
    setModalMode("add");
  };

  const handleEdit = (branch) => {
    setSelectedBranch({ ...branch });
    setModalMode("edit");
  };

  const handleDelete = (branch) => {
    setSelectedBranch(branch);
    setModalMode("delete");
  };

  const handleSave = async (form) => {
    setSaving(true);
    try {
      const { docId, ...data } = form;
      if (modalMode === "add") {
        await addDoc(collection(db, "franchise_loaction"), data);
        showToast("Location added successfully!");
      } else {
        await updateDoc(doc(db, "franchise_loaction", docId), data);
        showToast("Location updated successfully!");
      }
      await fetchLocations();
      setModalMode(null);
    } catch (err) {
      console.error(err);
      showToast("Failed to save. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "franchise_loaction", selectedBranch.docId));
      showToast("Location deleted.");
      await fetchLocations();
      setModalMode(null);
    } catch (err) {
      console.error(err);
      showToast("Failed to delete. Please try again.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const closeModal = () => !saving && !deleting && setModalMode(null);

  // ── Render ─────────────────────────────────────────────────────
  return (
    <>
      

      {/* Header */}
      <header className="page-header">
        <p className="header-eyebrow">MannuBhai Service Expert · Admin Panel</p>
        <h1 className="header-title">Franchise <span>Locations</span></h1>
        <p className="header-sub">Manage all service centre listings</p>
        <button className="header-add-btn" onClick={handleAdd}>+ Add Location</button>
      </header>

      {/* Controls */}
      {!loading && !error && (
        <div className="controls">
          <input
            className="search-input"
            type="text"
            placeholder="Search by name, city or address…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="city-pills">
            {cities.map((city) => (
              <button
                key={city}
                className={`pill${cityFilter === city ? " active" : ""}`}
                onClick={() => setCityFilter(city)}
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Meta bar */}
      {!loading && !error && filtered.length > 0 && (
        <div className="meta-bar">
          <p className="result-count">
            {filtered.length} location{filtered.length !== 1 ? "s" : ""}
            {totalPages > 1 && ` · Page ${safePage} of ${totalPages}`}
          </p>
          {totalPages > 1 && (
            <div className="pagination">
              <button className="pg-btn" onClick={() => setPage((p) => p - 1)} disabled={safePage === 1}>←</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  className={`pg-btn${safePage === n ? " active" : ""}`}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
              <button className="pg-btn" onClick={() => setPage((p) => p + 1)} disabled={safePage === totalPages}>→</button>
            </div>
          )}
        </div>
      )}

      {/* Body */}
      {loading ? (
        <div className="state-wrap">
          <div className="spinner" />
          <p>Loading locations…</p>
        </div>
      ) : error ? (
        <div className="state-wrap">
          <p className="error-msg">⚠ {error}</p>
          <button className="btn-primary" onClick={fetchLocations}>Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="state-wrap">
          <p>No locations match your search.</p>
        </div>
      ) : (
        <div className="grid">
          {paginated.map((loc) => (
            <BranchCard key={loc.docId} branch={loc} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {(modalMode === "add" || modalMode === "edit") && (
        <Modal
          title={modalMode === "add" ? "Add New Location" : "Edit Location"}
          onClose={closeModal}
        >
          <LocationForm
            initial={selectedBranch}
            allLocations={locations}
            onSave={handleSave}
            onCancel={closeModal}
            saving={saving}
          />
        </Modal>
      )}

      {/* Delete Confirm Modal */}
      {modalMode === "delete" && selectedBranch && (
        <ConfirmDialog
          branch={selectedBranch}
          onConfirm={handleConfirmDelete}
          onCancel={closeModal}
          deleting={deleting}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />
      )}
    </>
  );
}