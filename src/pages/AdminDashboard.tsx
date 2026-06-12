import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Users, FileText, Trash2, Plus, Store } from "lucide-react";
import { getDailyReport, getUsers, createUser, deleteUser, User } from "../lib/api";

export default function AdminDashboard() {
  const [report, setReport] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // New user form form
  const [newUname, setNewUname] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "employee">("employee");

  const loadData = async () => {
    setLoading(true);
    try {
      const [r, u] = await Promise.all([getDailyReport(), getUsers()]);
      setReport(r);
      setUsers(u);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await createUser({ username: newUname, password: newPwd, name: newName, role: newRole });
    setNewUname(""); setNewPwd(""); setNewName("");
    loadData();
  };

  const handleDeleteUser = async (id: string) => {
    if(!confirm("Are you sure?")) return;
    await deleteUser(id);
    loadData();
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading dashboard...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 pb-20">
      
      {/* Header */}
      <header className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-sans">Admin Dashboard</h1>
            <p className="text-slate-500 text-sm">Store overview and employee management</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column - Daily Stats */}
        <div className="lg:col-span-1 space-y-6">
          <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
            <h2 className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 mb-6 text-slate-500">
              <FileText size={16} className="text-primary-500" /> Daily Summary
            </h2>
            {report && (
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] tracking-widest font-bold uppercase text-slate-400 mb-1">Total Sales</p>
                  <p className="text-4xl font-black text-slate-900 dark:text-white">₱{report.totalSales.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] tracking-widest font-bold uppercase text-slate-400 mb-1">Transactions Count</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{report.transactionCount}</p>
                </div>
                
                <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-sm font-semibold mb-3">Sales by Employee</p>
                  <div className="space-y-3">
                    {Object.entries(report.salesByEmployee).map(([empId, amount]: any) => {
                      const emp = users.find(u => u.id === empId);
                      return (
                        <div key={empId} className="flex justify-between items-center text-sm">
                          <span className="text-slate-600 dark:text-slate-300">{emp?.name || empId}</span>
                          <span className="font-medium">₱{amount.toFixed(2)}</span>
                        </div>
                      )
                    })}
                    {Object.keys(report.salesByEmployee).length === 0 && (
                      <p className="text-sm text-slate-400">No sales yet today.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right Column - Employee Management */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
            <h2 className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 mb-6 text-slate-500">
              <Users size={16} className="text-blue-500" /> Employee Management
            </h2>
            
            <div className="overflow-x-auto mb-8">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">Name</th>
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3 text-right rounded-tr-lg">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="px-4 py-3 font-medium">{u.name}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{u.username}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {u.role !== 'admin' && (
                          <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add User Form */}
            <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-700">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Plus size={16} /> Add New Employee
              </h3>
              <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="text" placeholder="Full Name" required value={newName} onChange={e=>setNewName(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm"
                />
                <input 
                  type="text" placeholder="Username" required value={newUname} onChange={e=>setNewUname(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm"
                />
                <input 
                  type="password" placeholder="Password" required value={newPwd} onChange={e=>setNewPwd(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm"
                />
                <select 
                  value={newRole} onChange={e=>setNewRole(e.target.value as any)}
                  className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm"
                >
                  <option value="employee">Employee (Cashier)</option>
                  <option value="admin">Admin</option>
                </select>
                <div className="md:col-span-2">
                  <button type="submit" className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-sm font-medium hover:opacity-90 transition">
                    Create Account
                  </button>
                </div>
              </form>
            </div>

          </section>
        </div>

      </div>
    </div>
  );
}
