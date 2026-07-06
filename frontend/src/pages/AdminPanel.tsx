import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Users, Key, Trash2, Lock, Check, X, AlertCircle } from "lucide-react";
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

export function AdminPanel() {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [adminPasswordChange, setAdminPasswordChange] = useState({ old: "", new: "" });
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);

  useEffect(() => {
    // Check if current user is admin (based on username from environment)
    if (user && (user.is_super_admin || user.username === "Kritika")) {
      fetchUsers();
    } else {
      setLoading(false);
      setError("Access denied. Only admin users can access this panel.");
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
      
      // Add masked passwords for display (in real system, never show actual passwords)
      const usersWithPasswords = response.data.map((u: any) => ({
        ...u,
        password: "••••••••" // Masked for security
      }));
      
      setUsers(usersWithPasswords);
      setLoading(false);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to fetch users");
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const token = localStorage.getItem("access_token");
      await axios.delete(`http://127.0.0.1:8000/api/admin/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setUsers(users.filter(u => u.id !== userId));
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to delete user");
    }
  };

  const handleToggleActive = async (userId: number) => {
    try {
      const token = localStorage.getItem("access_token");
      await axios.put(`http://127.0.0.1:8000/api/admin/users/${userId}/toggle-active`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setUsers(users.map(u => u.id === userId ? { ...u, is_active: !u.is_active } : u));
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to toggle user status");
    }
  };

  const handlePasswordChange = async () => {
    if (!selectedUser || !newPassword) return;

    try {
      const token = localStorage.getItem("access_token");
      await axios.put(`http://127.0.0.1:8000/api/admin/users/${selectedUser.id}/password`, {
        user_id: selectedUser.id,
        new_password: newPassword
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setShowPasswordModal(false);
      setSelectedUser(null);
      setNewPassword("");
      alert("Password updated successfully");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to update password");
    }
  };

  const handleAdminPasswordChange = async () => {
    try {
      const token = localStorage.getItem("access_token");
      await axios.put("http://127.0.0.1:8000/api/admin/change-password", {
        old_password: adminPasswordChange.old,
        new_password: adminPasswordChange.new
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setShowAdminPasswordModal(false);
      setAdminPasswordChange({ old: "", new: "" });
      alert("Admin password changed successfully");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to change admin password");
    }
  };

  if (!user || (!user.is_super_admin && user.username !== "Kritika")) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 dark:bg-[#07111f] sm:p-8">
        <div className="mx-auto max-w-md">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-6">
              <div className="mb-4 flex items-start gap-3">
                <div className="mt-1 rounded-full bg-red-500/10 p-2 text-red-600">
                  <AlertCircle size={18} />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Access Denied</h1>
                  <p className="text-sm text-slate-500">Only admin users can access this panel.</p>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Please login as admin to access user management.
              </p>
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
              <div className="rounded-full bg-teal-500/10 p-2 text-teal-600">
                <Users size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold">User Management</h1>
                <p className="text-sm text-slate-500">Manage user accounts and permissions</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowAdminPasswordModal(true)}
                className="flex items-center gap-2 text-sm"
              >
                <Lock size={16} />
                Change Admin Password
              </Button>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Card className="p-6">
            {loading ? (
              <div className="text-center py-8 text-slate-500">Loading users...</div>
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
                      <th className="pb-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Actions</th>
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
                        <td className="py-3">
                          <div className="flex gap-2">
                            {!user.is_super_admin && (
                              <>
                                <Button
                                  onClick={() => handleToggleActive(user.id)}
                                  className="h-8 px-2 text-xs"
                                  variant={user.is_active ? "secondary" : "primary"}
                                >
                                  {user.is_active ? "Deactivate" : "Activate"}
                                </Button>
                                <Button
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowPasswordModal(true);
                                  }}
                                  className="h-8 px-2 text-xs"
                                >
                                  <Key size={14} />
                                </Button>
                                <Button
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="h-8 px-2 text-xs bg-red-500 hover:bg-red-600"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </>
                            )}
                          </div>
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

      {/* Password Change Modal */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md p-6">
            <h2 className="mb-4 text-lg font-bold">Change Password for {selectedUser.username}</h2>
            <label className="mb-4 block">
              <span className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300">New Password</span>
              <input
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </label>
            <div className="flex gap-2">
              <Button onClick={handlePasswordChange} className="flex-1">
                Change Password
              </Button>
              <Button
                onClick={() => {
                  setShowPasswordModal(false);
                  setSelectedUser(null);
                  setNewPassword("");
                }}
                variant="secondary"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Admin Password Change Modal */}
      {showAdminPasswordModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md p-6">
            <h2 className="mb-4 text-lg font-bold">Change Admin Password</h2>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Current Password</span>
                <input
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
                  type="password"
                  value={adminPasswordChange.old}
                  onChange={(e) => setAdminPasswordChange({ ...adminPasswordChange, old: e.target.value })}
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300">New Password</span>
                <input
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
                  type="password"
                  value={adminPasswordChange.new}
                  onChange={(e) => setAdminPasswordChange({ ...adminPasswordChange, new: e.target.value })}
                  required
                />
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleAdminPasswordChange} className="flex-1">
                Change Password
              </Button>
              <Button
                onClick={() => {
                  setShowAdminPasswordModal(false);
                  setAdminPasswordChange({ old: "", new: "" });
                }}
                variant="secondary"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}