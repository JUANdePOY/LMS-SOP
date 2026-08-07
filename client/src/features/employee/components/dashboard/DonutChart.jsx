import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export default function DonutChart({ data, total, centerLabel = "Total" }) {
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-center">
      <div className="relative shrink-0" style={{ width: 170, height: 170 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={80}
              stroke="none"
              paddingAngle={2}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{total}</span>
          <span className="text-xs text-slate-400 dark:text-neutral-500">{centerLabel}</span>
        </div>
      </div>

      <ul className="space-y-2">
        {data.map((item) => (
          <li key={item.name} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-slate-600 dark:text-neutral-400">{item.name}</span>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">
              {item.count} ({item.value}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
