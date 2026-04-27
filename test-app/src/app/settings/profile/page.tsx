export default function ProfileSettings() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
        <p className="text-gray-400 text-sm">Manage your account details and preferences.</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {/* Fake Tabs */}
        <div className="flex border-b border-gray-800 bg-gray-800/30 overflow-x-auto">
          <button className="px-6 py-3 text-sm font-medium border-b-2 border-cyan-500 text-cyan-400">General</button>
          <button data-guider="tab-security" className="px-6 py-3 text-sm font-medium border-b-2 border-transparent text-gray-400 hover:text-gray-200">Security</button>
          <button data-guider="tab-notifications" className="px-6 py-3 text-sm font-medium border-b-2 border-transparent text-gray-400 hover:text-gray-200">Notifications</button>
          <button data-guider="tab-preferences" className="px-6 py-3 text-sm font-medium border-b-2 border-transparent text-gray-400 hover:text-gray-200">Preferences</button>
        </div>

        <div className="p-8 space-y-8">
          <section>
            <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm text-gray-400 font-medium">First Name</label>
                <input data-guider="input-firstname" type="text" defaultValue="Admin" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:border-cyan-500 outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400 font-medium">Last Name</label>
                <input data-guider="input-lastname" type="text" defaultValue="User" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:border-cyan-500 outline-none" />
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-sm text-gray-400 font-medium">Email Address</label>
                <div className="flex gap-3">
                  <input data-guider="input-email" type="email" defaultValue="admin@omnicloud.local" className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:border-cyan-500 outline-none" disabled />
                  <button data-guider="change-email-btn" className="bg-gray-800 hover:bg-gray-700 border border-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">Change</button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Changing your email requires verifying the new address.</p>
              </div>
            </div>
          </section>

          <hr className="border-gray-800" />

          <section>
            <h3 className="text-lg font-semibold mb-4">Two-Factor Authentication</h3>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 flex items-center justify-between">
              <div>
                <div className="font-medium flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Authenticator App
                </div>
                <div className="text-sm text-gray-400">Configured via Google Authenticator.</div>
              </div>
              <button data-guider="manage-mfa" className="bg-gray-800 hover:bg-gray-700 border border-gray-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors">Manage</button>
            </div>
          </section>

          <hr className="border-gray-800" />

          <section className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-red-400">Danger Zone</h3>
              <p className="text-sm text-gray-400">Permanently delete your account and all resources.</p>
            </div>
            <button data-guider="delete-account" className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors">Delete Account</button>
          </section>
        </div>
        
        <div className="p-6 bg-gray-800/30 border-t border-gray-800 flex justify-end gap-3">
          <button data-guider="cancel-profile" className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white">Cancel</button>
          <button data-guider="save-profile" className="bg-cyan-600 hover:bg-cyan-500 px-6 py-2 rounded-lg text-sm font-medium text-white shadow-lg shadow-cyan-500/20">Save Changes</button>
        </div>
      </div>
    </div>
  );
}
