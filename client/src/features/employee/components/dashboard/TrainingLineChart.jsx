import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function TrainingLineChart({ data }) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="trainingGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2F5EFF" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#2F5EFF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F4" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #F1F2F6",
              borderRadius: "10px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
              color: "#111827",
              fontSize: "12px",
            }}
            formatter={(value) => [`${value}%`, "Progress"]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#2F5EFF"
            strokeWidth={2.5}
            fill="url(#trainingGradient)"
            dot={{ fill: "#2F5EFF", r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#2F5EFF" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
