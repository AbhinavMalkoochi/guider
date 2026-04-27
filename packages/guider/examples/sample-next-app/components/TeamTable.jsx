export function TeamTable() {
  return (
    <table aria-label="Team members table">
      <thead>
        <tr><th>Name</th><th>Role</th><th>Actions</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>Alice</td>
          <td>Admin</td>
          <td>
            <button data-guider='teamtable-el-0'>Remove</button>
            <button data-guider='teamtable-el-1'>Change role</button>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
