import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { CATEGORY_COLORS, CATEGORY_LABELS_FA } from "../utils/categories.js";

export function CategoryChart({ data, onSelect }) {
  if (!data.length) {
    return <div className="py-10 text-center text-sm text-tg-hint">هنوز خرجی برای این ماه ثبت نشده.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 40 }} barCategoryGap="30%">
        <XAxis
          dataKey="category"
          tickFormatter={(key) => CATEGORY_LABELS_FA[key]}
          tick={{ fontSize: 10, fontFamily: "IranSans", fill: "var(--tg-theme-hint-color)" }}
          angle={-35}
          textAnchor="end"
          interval={0}
        />
        <YAxis hide />
        <Tooltip
          formatter={(value) => [value.toLocaleString("fa-IR") + " تومان", ""]}
          contentStyle={{
            fontFamily: "IranSans",
            fontSize: 12,
            borderRadius: 8,
            background: "var(--tg-theme-bg-color)",
            border: "none",
          }}
        />
        <Bar dataKey="total" radius={[6, 6, 0, 0]} onClick={(entry) => onSelect(entry.category)}>
          {data.map((entry) => (
            <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
