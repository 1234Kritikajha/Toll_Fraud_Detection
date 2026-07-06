import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Lock, User, Check, X, AlertCircle, Database } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import axios from "axios";
import { useAuth } from "../auth/AuthContext";

interface User {
  id: number;
  username: string;
  email: string;
  phone_number: string | null;
  password: string;
  is_active: boolean;
  is_super_admin: boolean;
  created_at: string;
}

export function UserInfo() {
  const { user, login, logout } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminCredentials, setAdminCredentials] = useState({ username: "", password: "" });

  useEffect(() => {
    // Check if current user is already admin (based on username from environment)
    if (user && (user.is_super_admin || user.username === "Kritika")) {
      setIsAdminLoggedIn(true);
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.get("http://127.0.0.1:8000/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // For display purposes, we'll show masked passwords
      // In a real system, you should never display actual passwords
      const usersWithPasswords = response.data.map((u: any) => ({
        ...u,
        password: "••••••••" // Masked password for security
      }));
      
      setUsers(usersWithPasswords);
      setLoading(false);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to fetch users");
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      await login(adminCredentials);
      
      // Check if logged in as admin (using the admin username from environment)
      if (adminCredentials.username === "Kritika") {
        setIsAdminLoggedIn(true);
        fetchUsers();
      } else {
        setError("Only admin users can access the database");
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Admin login failed");
    }
  };

  if (!isAdminLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 dark:bg-[#07111f] sm:p-8">
        <div className="mx-auto max-w-md">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-6">
              <div className="mb-4 flex items-start gap-3">
                <div className="mt-1 rounded-full bg-blue-500/10 p-2 text-blue-600">
                  <Database size={18} />
                </div>
                <div>
                  <h1 className="text-lg font-bold">User Database Access</h1>
                  <p className="text-sm text-slate-500">Admin login required to view user information</p>
                </div>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <label className="block">
                  <span className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <User size={14} /> Admin Username
                  </span>
                  <input
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
                    value={adminCredentials.username}
                    onChange={(e) => setAdminCredentials({ ...adminCredentials, username: e.target.value })}
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <Lock size={14} /> Admin Password
                  </span>
                  <input
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
                    type="password"
                    value={adminCredentials.password}
                    onChange={(e) => setAdminCredentials({ ...adminCredentials, password: e.target.value })}
                    required
                  />
                </label>

                {error && <div className="rounded-md bg-red-50 p-3 text-xs text-red-700">{error}</div>}

                <Button type="submit" className="h-10 w-full text-sm font-bold">
                  Access Database
                </Button>
              </form>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 dark:bg-[#07111f] sm:p-8">
      <div className="mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-500/10 p-2 text-blue-600">
                <Database size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold">User Database</h1>
                <p className="text-sm text-slate-500">Complete user information with credentials</p>
              </div>
            </div>
            <Button
              onClick={() => {
                setIsAdminLoggedIn(false);
                setAdminCredentials({ username: "", password: "" });
                logout();
              }}
              className="flex items-center gap-2 text-sm bg-red-500 hover:bg-red-600"
            >
              <Shield size={16} />
              Logout
            </Button>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Card className="p-6">
            {loading ? (
              <div className="text-center py-8 text-slate-500">Loading user database...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="pb-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">ID</th>
                      <th className="pb-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Username</th>
                      <th className="pb-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Email</th>
                      <th className="pb-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Phone</th>
                      <th className="pb-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Password</th>
                      <th className="pb-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Status</th>
                      <th className="pb-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Role</th>
                      <th className="pb-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Signup Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-3 text-sm text-slate-600 dark:text-slate-300">{user.id}</td>
                        <td className="py-3 text-sm font-medium text-slate-900 dark:text-white">{user.username}</td>
                        <td className="py-3 text-sm text-slate-600 dark:text-slate-300">{user.email}</td>
                        <td className="py-3 text-sm text-slate-600 dark:text-slate-300">{user.phone_number || "-"}</td>
                        <td className="py-3 text-sm text-slate-600 dark:text-slate-300 font-mono">{user.password}</td>
                        <td className="py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                            user.is_active 
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}>
                            {user.is_active ? <Check size={12} /> : <X size={12} />}
                            {user.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3">
                          {user.is_super_admin && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                              <Shield size={12} />
                              Admin
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-sm text-slate-600 dark:text-slate-300">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}