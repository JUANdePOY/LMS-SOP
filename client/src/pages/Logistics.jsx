import { useState, useEffect } from "react";
import { getSupplies, getLowStockSupplies } from "@/services/api";
import { Loader, Package, AlertTriangle } from "lucide-react";

export default function Logistics() {
  const [supplies, setSupplies] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSupplies();
  }, []);

  const loadSupplies = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getSupplies();
      if (response.data.status === 'success') {
        setSupplies(response.data.data.supplies || []);
      }
      const lowStockResponse = await getLowStockSupplies();
      if (lowStockResponse.data.status === 'success') {
        setLowStock(lowStockResponse.data.data.supplies || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load supplies');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mb-4">Logistics</h1>
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-800 dark:text-red-200 mb-4">
          {error}
        </div>
      )}

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 p-4">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-800 dark:text-yellow-200">Low Stock Alert</h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              {lowStock.length} item(s) below reorder level
            </p>
          </div>
        </div>
      )}

      {/* Supplies Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-700">
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Category</th>
              <th className="px-4 py-2 text-left">Available</th>
              <th className="px-4 py-2 text-left">Reorder Level</th>
              <th className="px-4 py-2 text-left">Location</th>
            </tr>
          </thead>
          <tbody>
            {supplies.length > 0 ? supplies.map((supply) => (
              <tr key={supply.id} className="border-b border-neutral-200 dark:border-neutral-700">
                <td className="px-4 py-2">{supply.name || 'N/A'}</td>
                <td className="px-4 py-2">{supply.category || 'N/A'}</td>
                <td className="px-4 py-2">
                  <span className={supply.quantity_available <= supply.reorder_level ? 'text-red-500 font-medium' : ''}>
                    {supply.quantity_available || 0}
                  </span>
                </td>
                <td className="px-4 py-2">{supply.reorder_level || 0}</td>
                <td className="px-4 py-2">{supply.location || 'N/A'}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-neutral-500">
                  No supplies found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
