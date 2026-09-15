import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { NamedCount } from '../../types/api';
import { CHART_COLORS, DashboardPanel, EmptyChartNote } from './dashboard-ui';

type BarChartPanelProps = {
  title: string;
  subtitle?: string;
  data: NamedCount[];
  emptyMessage?: string;
};

function truncateLabel(value: string, max = 18) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

export function NamedBarChart({ title, subtitle, data, emptyMessage }: BarChartPanelProps) {
  if (data.length === 0) {
    return (
      <DashboardPanel title={title} subtitle={subtitle}>
        <EmptyChartNote message={emptyMessage ?? 'No data available'} />
      </DashboardPanel>
    );
  }

  // Horizontal bars keep category labels readable and avoid fat full-width columns.
  const chartHeight = Math.max(200, data.length * 40 + 40);

  return (
    <DashboardPanel title={title} subtitle={subtitle}>
      <div className="w-full" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 4, right: 20, left: 4, bottom: 4 }}
            barCategoryGap="24%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={148}
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickFormatter={(value: string) => truncateLabel(String(value), 20)}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(15, 118, 110, 0.06)' }}
              contentStyle={{
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                boxShadow: '0 8px 20px rgba(15, 23, 42, 0.06)',
              }}
            />
            <Bar dataKey="count" fill="#0f766e" radius={[0, 5, 5, 0]} barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </DashboardPanel>
  );
}

type PieChartPanelProps = {
  title: string;
  subtitle?: string;
  data: NamedCount[];
  emptyMessage?: string;
};

export function NamedPieChart({ title, subtitle, data, emptyMessage }: PieChartPanelProps) {
  const chartData = data.filter((entry) => entry.count > 0);

  if (chartData.length === 0) {
    return (
      <DashboardPanel title={title} subtitle={subtitle}>
        <EmptyChartNote message={emptyMessage ?? 'No data available'} />
      </DashboardPanel>
    );
  }

  return (
    <DashboardPanel title={title} subtitle={subtitle}>
      <div className="mx-auto h-52 max-w-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={54}
              outerRadius={74}
              paddingAngle={chartData.length > 1 ? 3 : 0}
              stroke="#fff"
              strokeWidth={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                boxShadow: '0 8px 20px rgba(15, 23, 42, 0.06)',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 flex flex-wrap justify-center gap-3">
        {data.map((entry, index) => (
          <li key={entry.name} className="flex items-center gap-2 text-xs text-slate-600">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
            />
            {entry.name} ({entry.count})
          </li>
        ))}
      </ul>
    </DashboardPanel>
  );
}
