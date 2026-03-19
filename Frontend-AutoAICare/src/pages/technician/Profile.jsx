import { Button, Card, Input } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/utils/api";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

const TechnicianProfile = () => {
  const { user, setUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [passwordErrors, setPasswordErrors] = useState({});

  const handleSaveProfile = async () => {
    try {
      const response = await api.patch("/auth/me/", profileData);

      if (response.data) {
        const stored = localStorage.getItem("user");
        if (stored) {
          const parsed = JSON.parse(stored);
          const updated = { ...parsed, ...response.data };
          setUser(updated);
          localStorage.setItem("user", JSON.stringify(updated));
        } else {
          setUser(response.data);
          localStorage.setItem("user", JSON.stringify(response.data));
        }
      }

      setEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const handleChangePassword = async () => {
    setPasswordErrors({});
    const errors = {};

    if (!passwordData.currentPassword)
      errors.currentPassword = "Current password is required";
    if (!passwordData.newPassword)
      errors.newPassword = "New password is required";
    else if (passwordData.newPassword.length < 8)
      errors.newPassword = "Password must be at least 8 characters";

    if (!passwordData.confirmPassword)
      errors.confirmPassword = "Please confirm password";
    else if (passwordData.newPassword !== passwordData.confirmPassword)
      errors.confirmPassword = "Passwords do not match";

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    try {
      await api.post("/auth/change-password/", {
        old_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
        new_password2: passwordData.confirmPassword,
      });

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error("Password change error:", error);

      if (error.response?.data) {
        const be = error.response.data;
        const formatted = {};

        if (be.old_password) formatted.currentPassword = be.old_password[0];
        if (be.new_password) formatted.newPassword = be.new_password[0];
        if (be.new_password2) formatted.confirmPassword = be.new_password2[0];

        setPasswordErrors(formatted);
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage your info, password, and settings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Right Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Info */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Personal Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={profileData.name}
                onChange={(e) =>
                  setProfileData({ ...profileData, name: e.target.value })
                }
                disabled={!editing}
              />

              <Input
                label="Phone Number"
                value={profileData.phone}
                onChange={(e) =>
                  setProfileData({ ...profileData, phone: e.target.value })
                }
                disabled={!editing}
              />

              <Input label="Email Address" value={user?.email || ""} disabled />

              {/* <Input
                label="Branch"
                value={user?.branch?.name || "Not assigned"}
                disabled
              /> */}
            </div>

            <div className="flex justify-end mt-6">
              {editing ? (
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveProfile}>Save Changes</Button>
                </div>
              ) : (
                <Button onClick={() => setEditing(true)}>Edit Profile</Button>
              )}
            </div>
          </Card>

          {/* Change Password */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Change Password</h2>

            <div className="space-y-4">
              {/* Current Password */}
              <div className="relative">
                <Input
                  label="Current Password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      currentPassword: e.target.value,
                    })
                  }
                  error={passwordErrors.currentPassword}
                />
                <button
                  className="absolute right-3 top-9 text-gray-500"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>

              {/* New Password */}
              <div className="relative">
                <Input
                  label="New Password"
                  type={showNewPassword ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      newPassword: e.target.value,
                    })
                  }
                  error={passwordErrors.newPassword}
                />
                <button
                  className="absolute right-3 top-9 text-gray-500"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* Confirm Password */}
              <div className="relative">
                <Input
                  label="Confirm New Password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      confirmPassword: e.target.value,
                    })
                  }
                  error={passwordErrors.confirmPassword}
                />
                <button
                  className="absolute right-3 top-9 text-gray-500"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleChangePassword}>Change Password</Button>
              </div>
            </div>
          </Card>
        </div>
        {/* Left Card – Profile Photo & Basic Info */}
        <div>
          <Card className="p-6 text-center">
            <div className="relative inline-block">
              <div className="w-28 h-28 bg-primary rounded-full flex items-center justify-center text-white text-3xl font-semibold mx-auto">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              {/* <button> ... </button> */}
            </div>

            <h3 className="text-xl font-bold mt-4">{user?.name}</h3>
            <p className="text-gray-600">Technician</p>
            <p className="text-sm text-gray-500">
              {user?.branch_name || "Not assigned"}
            </p>

            {/* <div className="mt-4 p-4 bg-gray-50 rounded-lg"> ... </div> */}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TechnicianProfile;
