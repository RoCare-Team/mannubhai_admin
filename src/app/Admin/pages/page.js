"use client";
import { useState, useEffect, useRef } from "react";
import {
  collection, getDocs, orderBy, query,
  limit, startAfter, getCountFromServer, where,
  doc, updateDoc
} from "firebase/firestore";
import { db } from "@/app/firebase/config";

const PAGE_SIZE = 20;

// ── Field groups for the edit modal ──────────────────────────────────────────
const FIELD_GROUPS = [
  {
    label: "Basic Info",
    fields: [
      { key: "id",               label: "ID",               type: "text",     readOnly: true },
      { key: "page_title",       label: "Page Title",       type: "text" },
      { key: "page_url",         label: "Page URL",         type: "text" },
      { key: "page_youtube_url", label: "YouTube URL",      type: "text" },
      { key: "page_content",     label: "Page Content",     type: "textarea" },
      { key: "status",           label: "Status",           type: "select", options: [{ value: "1", label: "Active" }, { value: "0", label: "Inactive" }] },
      { key: "robot",            label: "Robot",            type: "select", options: [{ value: "index", label: "index" }, { value: "noindex", label: "noindex" }] },
    ],
  },
  {
    label: "SEO",
    fields: [
      { key: "meta_title",       label: "Meta Title",       type: "text" },
      { key: "meta_description", label: "Meta Description", type: "textarea" },
      { key: "meta_keywords",    label: "Meta Keywords",    type: "text" },
    ],
  },
  {
    label: "Relations",
    fields: [
      { key: "category_id",     label: "Category ID",      type: "text" },
      { key: "city_id",         label: "City ID",          type: "text" },
      { key: "brand_id",        label: "Brand ID",         type: "text" },
      { key: "group_category",  label: "Group Category",   type: "text" },
      { key: "brand_faq",       label: "Brand FAQ",        type: "text" },
    ],
  },
  {
    label: "FAQ Questions",
    fields: Array.from({ length: 10 }, (_, i) => ({
      key: `faqquestion${i + 1}`,
      label: `Question ${i + 1}`,
      type: "text",
    })),
  },
  {
    label: "FAQ Answers",
    fields: Array.from({ length: 10 }, (_, i) => ({
      key: `faqanswer${i + 1}`,
      label: `Answer ${i + 1}`,
      type: "textarea",
    })),
  },
  {
    label: "Timestamps",
    fields: [
      { key: "created_at", label: "Created At", type: "text", readOnly: true },
      { key: "updated_at", label: "Updated At", type: "text", readOnly: true },
    ],
  },
];

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ page, categoryMap, cityMap, onClose, onSaved }) {
  const [form, setForm] = useState(() => {
    const init = {};
    FIELD_GROUPS.flatMap((g) => g.fields).forEach(({ key }) => {
      init[key] = page[key] ?? "";
    });
    return init;
  });
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saved, setSaved] = useState(false);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {};
      FIELD_GROUPS.flatMap((g) => g.fields)
        .filter((f) => !f.readOnly)
        .forEach(({ key }) => {
          payload[key] = form[key] === "" ? null : form[key];
        });
      payload.updated_at = new Date().toISOString().replace("T", " ").slice(0, 19);

      await updateDoc(doc(db, "page_master_tb", page.docId), payload);
      setSaved(true);
      onSaved({ ...page, ...payload });
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Trap scroll behind modal
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const currentGroup = FIELD_GROUPS[activeTab];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Modal header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900 truncate max-w-sm">
              {page.page_title || "Untitled Page"}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {categoryMap[String(page.category_id)] || "—"} · {cityMap[String(page.city_id)] || "—"} · doc: {page.docId}
            </p>
          </div>
          <button onClick={onClose} className="ml-4 text-gray-400 hover:text-gray-600 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 pb-0 border-b border-gray-200 overflow-x-auto flex-shrink-0">
          {FIELD_GROUPS.map((g, i) => (
            <button
              key={g.label}
              onClick={() => setActiveTab(i)}
              className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === i
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {currentGroup.fields.map(({ key, label, type, readOnly, options }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {label}
                {readOnly && <span className="ml-1 text-gray-400 font-normal">(read-only)</span>}
              </label>

              {type === "select" ? (
                <select
                  value={form[key] ?? ""}
                  onChange={(e) => set(key, e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : type === "textarea" ? (
                <textarea
                  value={form[key] ?? ""}
                  onChange={(e) => set(key, e.target.value)}
                  readOnly={readOnly}
                  rows={3}
                  className={`w-full text-sm border border-gray-300 rounded-md px-3 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    readOnly ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "bg-white text-gray-800"
                  }`}
                />
              ) : (
                <input
                  type="text"
                  value={form[key] ?? ""}
                  onChange={(e) => set(key, e.target.value)}
                  readOnly={readOnly}
                  className={`w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    readOnly ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "bg-white text-gray-800"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 flex-shrink-0">
          {saveError ? (
            <p className="text-xs text-red-500 flex-1 mr-4">{saveError}</p>
          ) : saved ? (
            <p className="text-xs text-green-600 flex-1 mr-4">✓ Saved successfully</p>
          ) : (
            <p className="text-xs text-gray-400 flex-1 mr-4">
              Tab through sections · read-only fields are not saved
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main table component ──────────────────────────────────────────────────────
export default function PageMasterTable() {
  const [pages, setPages] = useState([]);
  const [totalCount, setTotalCount] = useState(null);
  const [categoryMap, setCategoryMap] = useState({});
  const [cityMap, setCityMap] = useState({});
  const [categories, setCategories] = useState([]);
  const [cities, setCities] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const cursors = useRef([undefined]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState(null);

  // Edit modal
  const [editingPage, setEditingPage] = useState(null);

  // ── Meta fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [catSnap, citySnap] = await Promise.all([
          getDocs(collection(db, "category_manage")),
          getDocs(collection(db, "city_tb")),
        ]);
        const catMap = {}, catList = [];
        catSnap.docs.forEach((d) => {
          const data = d.data();
          const id = String(data.id || d.id);
          catMap[id] = data.category_name || "—";
          if (data.status === "1" || data.status === 1)
            catList.push({ id, name: data.category_name || "Unnamed" });
        });
        catList.sort((a, b) => a.name.localeCompare(b.name));

        const ctyMap = {}, cityList = [];
        citySnap.docs.forEach((d) => {
          const data = d.data();
          const id = String(data.id || d.id);
          ctyMap[id] = data.city_name || "—";
          if (data.status === "1" || data.status === 1)
            cityList.push({ id, name: data.city_name || "Unnamed" });
        });
        cityList.sort((a, b) => a.name.localeCompare(b.name));

        setCategoryMap(catMap); setCityMap(ctyMap);
        setCategories(catList); setCities(cityList);
      } catch (err) { console.error("Meta fetch error:", err); }
    };
    fetchMeta();
  }, []);

  // ── Query builder ───────────────────────────────────────────────────
  const buildQuery = (cursor) => {
    const constraints = [orderBy("updated_at", "desc"), limit(PAGE_SIZE)];
    if (categoryFilter !== "all") constraints.unshift(where("category_id", "==", categoryFilter));
    if (cityFilter !== "all") constraints.unshift(where("city_id", "==", cityFilter));
    if (cursor) constraints.push(startAfter(cursor));
    return query(collection(db, "page_master_tb"), ...constraints);
  };

  const fetchCount = async () => {
    try {
      const constraints = [];
      if (categoryFilter !== "all") constraints.push(where("category_id", "==", categoryFilter));
      if (cityFilter !== "all") constraints.push(where("city_id", "==", cityFilter));
      const snap = await getCountFromServer(query(collection(db, "page_master_tb"), ...constraints));
      setTotalCount(snap.data().count);
    } catch { setTotalCount(null); }
  };

  const fetchPage = async (pageNum) => {
    pageNum === 1 ? setLoading(true) : setPageLoading(true);
    try {
      const cursor = cursors.current[pageNum - 1];
      const snapshot = await getDocs(buildQuery(cursor));
      const data = snapshot.docs.map((d) => ({ docId: d.id, ...d.data() }));
      if (snapshot.docs.length === PAGE_SIZE)
        cursors.current[pageNum] = snapshot.docs[snapshot.docs.length - 1];
      setPages(data);
      setCurrentPage(pageNum);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); setPageLoading(false); }
  };

  useEffect(() => {
    cursors.current = [undefined];
    setCurrentPage(1);
    setTotalCount(null);
    fetchPage(1);
    fetchCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, cityFilter]);

  const totalPages = totalCount !== null ? Math.ceil(totalCount / PAGE_SIZE) : null;
  const hasNext = pages.length === PAGE_SIZE;
  const hasPrev = currentPage > 1;
  const hasFilters = categoryFilter !== "all" || cityFilter !== "all";

  const formatDate = (val) => {
    if (!val) return "—";
    if (val?.toDate) return val.toDate().toLocaleDateString("en-IN");
    if (typeof val === "string") return val.slice(0, 10);
    return "—";
  };
  const isActive = (s) => s === "1" || s === 1;

  // Update the row in place after save (no refetch needed)
  const handleSaved = (updatedPage) => {
    setPages((prev) => prev.map((p) => p.docId === updatedPage.docId ? updatedPage : p));
  };

  const startItem = (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = startItem + pages.length - 1;

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex items-center gap-3 text-gray-500">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white border border-red-200 rounded-lg p-6 max-w-md text-center">
        <p className="text-red-600 font-medium text-sm">Failed to load</p>
        <p className="text-gray-400 text-xs mt-1">{error}</p>
      </div>
    </div>
  );

  return (
    <>
      {editingPage && (
        <EditModal
          page={editingPage}
          categoryMap={categoryMap}
          cityMap={cityMap}
          onClose={() => setEditingPage(null)}
          onSaved={handleSaved}
        />
      )}

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Pages</h1>
              <p className="text-sm text-gray-500 mt-1">
                {totalCount !== null ? `${totalCount.toLocaleString()} total records` : "Counting…"}
                {hasFilters && " (filtered)"}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                <option value="all">All Categories</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                <option value="all">All Cities</option>
                {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {hasFilters && (
                <button onClick={() => { setCategoryFilter("all"); setCityFilter("all"); }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 underline">Clear</button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className={`overflow-x-auto transition-opacity duration-150 ${pageLoading ? "opacity-50" : "opacity-100"}`}>
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Page Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meta Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pages.map((page, i) => (
                    <tr key={page.docId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-400 text-xs">{startItem + i}</td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="font-medium text-gray-900 truncate">
                          {page.page_title || <span className="text-gray-400 italic">Untitled</span>}
                        </p>
                        {page.id && <p className="text-xs text-gray-400 mt-0.5">ID: {page.id}</p>}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-gray-600 truncate">
                          {page.meta_title || <span className="text-gray-400 italic">—</span>}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-800 font-medium">
                          {categoryMap[String(page.category_id)] || <span className="text-gray-400 italic">—</span>}
                        </p>
                        <p className="text-xs text-gray-400">ID: {page.category_id || "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-800 font-medium">
                          {cityMap[String(page.city_id)] || <span className="text-gray-400 italic">—</span>}
                        </p>
                        <p className="text-xs text-gray-400">ID: {page.city_id || "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          isActive(page.status) ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          {isActive(page.status) ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {formatDate(page.updated_at)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setEditingPage(page)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-md hover:bg-indigo-50 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pages.length === 0 && (
              <div className="py-16 text-center text-gray-400 text-sm">
                {hasFilters ? "No pages match the selected filters." : "No records found."}
              </div>
            )}

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {pages.length > 0
                  ? `Showing ${startItem}–${endItem}${totalCount !== null ? ` of ${totalCount.toLocaleString()}` : ""}`
                  : "No results"}
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => { if (hasPrev && !pageLoading) fetchPage(currentPage - 1); }}
                  disabled={!hasPrev || pageLoading}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Prev
                </button>
                <span className="text-xs text-gray-500 px-1">
                  Page {currentPage}{totalPages ? ` of ${totalPages.toLocaleString()}` : ""}
                </span>
                <button onClick={() => { if (hasNext && !pageLoading) fetchPage(currentPage + 1); }}
                  disabled={!hasNext || pageLoading}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  Next
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                {pageLoading && <div className="w-4 h-4 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin ml-1" />}
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}