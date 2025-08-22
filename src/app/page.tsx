export default function Dashboard() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">👥 Total Alumni: 120</div>
        <div className="bg-white p-4 rounded-lg shadow">💼 Job Posts: 15</div>
        <div className="bg-white p-4 rounded-lg shadow">📅 Events: 3 upcoming</div>
      </div>
    </div>
  );
}
