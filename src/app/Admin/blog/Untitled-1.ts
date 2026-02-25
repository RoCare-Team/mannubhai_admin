// app/admin/franchise-leads/page.tsx  (if using App Router)
"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from  "../../firebase/config"; // your firebase config

interface lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  investment: string;
  message: string;
  status: string;
  createdAt: Date;
}

export default function FranchiseLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        let q = query(collection(db, "franchise_leads"), orderBy("createdAt", "desc"));

        // Apply status filter
        if (statusFilter !== "all") {
          q = query(
            collection(db, "franchise_leads"),
            where("status", "==", statusFilter),
            orderBy("createdAt", "desc")
          );
        }

        // Apply date range filter
        if (dateFrom && dateTo) {
          const from = Timestamp.fromDate(new Date(dateFrom));
          const to = Timestamp.fromDate(new Date(dateTo));
          q = query(
            collection(db, "franchise_leads"),
            where("createdAt", ">=", from),
            where("createdAt", "<=", to),
            ...(statusFilter !== "all" ? [where("status", "==", statusFilter)] : []),
            orderBy("createdAt", "desc")
          );
        }

        const snapshot = await getDocs(q);
        const data: Lead[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as any),
          createdAt: doc.data().createdAt?.toDate(),
        }));
        setLeads(data);
      } catch (err) {
        console.error("Error fetching leads:", err);
      }
    };

    fetchLeads();
  }, [statusFilter, dateFrom, dateTo]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Franchise Leads</h1>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="all">All Status</option>
          <option value="new">New</option>
          <option value="in-progress">In Progress</option>
          <option value="closed">Closed</option>
        </select>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="border p-2 rounded"
        />
      </div>

      {/* Leads Table */}
      <table className="w-full border-collapse border text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Name</th>
            <th className="border p-2">Email</th>
            <th className="border p-2">Phone</th>
            <th className="border p-2">City</th>
            <th className="border p-2">Investment</th>
            <th className="border p-2">Status</th>
            <th className="border p-2">Created At</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id}>
              <td className="border p-2">{lead.name}</td>
              <td className="border p-2">{lead.email}</td>
              <td className="border p-2">{lead.phone}</td>
              <td className="border p-2">{lead.city}</td>
              <td className="border p-2">{lead.investment}</td>
              <td className="border p-2">{lead.status}</td>
              <td className="border p-2">
                {lead.createdAt?.toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
