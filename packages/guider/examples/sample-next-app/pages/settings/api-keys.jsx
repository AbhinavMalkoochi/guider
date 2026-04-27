export default function SettingsApiKeysPage() {
  return (
    <div>
      <h1>API Keys</h1>
      <button data-guider='api-keys-el-0'>Create new key</button>
      <table aria-label="API keys list">
        <thead><tr><th>Name</th><th>Created</th><th></th></tr></thead>
        <tbody>
          <tr><td>prod</td><td>2025-01-02</td><td><button data-guider='api-keys-el-1'>Revoke</button></td></tr>
        </tbody>
      </table>
    </div>
  );
}
