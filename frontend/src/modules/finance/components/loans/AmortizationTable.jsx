/**
 * AmortizationTable — shows the full EMI schedule for a loan.
 * Pure calculation; no API calls.
 */
import { useMemo } from 'react';

function buildSchedule(principal, annualRate, months) {
  const r = annualRate / 100 / 12;
  let emi;
  if (r === 0) {
    emi = principal / months;
  } else {
    emi = (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  }

  const rows = [];
  let balance = principal;
  for (let i = 1; i <= months; i++) {
    const interest  = balance * r;
    const prinPart  = emi - interest;
    balance        -= prinPart;
    rows.push({
      month:     i,
      emi:       emi,
      principal: prinPart,
      interest:  interest,
      balance:   Math.max(0, balance),
    });
  }
  return { emi, rows };
}

const fmt = (v) => Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function AmortizationTable({ loan }) {
  const principal = Number(loan.total_loan_limit || 0);
  const rate      = Number(loan.interest_rate || 0);
  const months    = Number(loan.loan_tenure_months || 0);

  const { emi, rows } = useMemo(() => {
    if (!principal || !months) return { emi: 0, rows: [] };
    return buildSchedule(principal, rate, months);
  }, [principal, rate, months]);

  if (!principal || !months) {
    return (
      <div className="text-center text-xs text-gray-400 py-6">
        Set loan amount and tenure to view schedule.
      </div>
    );
  }

  const totalInterest = rows.reduce((s, r) => s + r.interest, 0);

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Monthly EMI', value: `NPR ${fmt(emi)}` },
          { label: 'Total Interest', value: `NPR ${fmt(totalInterest)}` },
          { label: 'Total Payable', value: `NPR ${fmt(principal + totalInterest)}` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{label}</p>
            <p className="text-xs font-black text-gray-700 mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {['Month', 'EMI', 'Principal', 'Interest', 'Balance'].map((h) => (
                <th key={h} className="px-3 py-2 text-[10px] font-black text-gray-500 uppercase tracking-wider text-right first:text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.month} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2 font-semibold text-gray-600">{row.month}</td>
                <td className="px-3 py-2 text-right text-gray-700">{fmt(row.emi)}</td>
                <td className="px-3 py-2 text-right text-green-600 font-semibold">{fmt(row.principal)}</td>
                <td className="px-3 py-2 text-right text-red-500">{fmt(row.interest)}</td>
                <td className="px-3 py-2 text-right font-bold text-gray-800">{fmt(row.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
