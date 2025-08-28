import { Layout } from '../components/Layout';

export default function DashboardPage() {
  return (
    <Layout>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-bold">Members</h2>
          <p>120 active members</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-bold">Income</h2>
          <p>$3,500 this month</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-bold">Employees</h2>
          <p>8 staff on duty</p>
        </div>
      </div>
    </Layout>
  );
}
