#!/usr/bin/env python3
"""Build monthly finance summaries from normalized import JSON files."""

from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from dataclasses import asdict, dataclass
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path


MONEY = Decimal("0.01")
PERCENT = Decimal("0.01")
SPENDING_GROUPS = {"50 Necessidades", "30 Desejos", "20 Futuro"}


@dataclass(frozen=True)
class SummaryRow:
    month: str
    budget_group: str
    category: str
    amount: str
    monthly_revenue: str
    percent_of_revenue: str
    transaction_count: int
    notes: str


def money(value: Decimal) -> str:
    return str(value.quantize(MONEY, rounding=ROUND_HALF_UP))


def percent(value: Decimal) -> str:
    return str(value.quantize(PERCENT, rounding=ROUND_HALF_UP))


def month_from_date(value: str) -> str:
    return value[:7]


def load_transactions(paths: list[Path]) -> list[dict[str, str]]:
    transactions: list[dict[str, str]] = []
    for path in paths:
        payload = json.loads(path.read_text(encoding="utf-8"))
        source_name = path.name
        for item in payload.get("transactions", []):
            normalized = dict(item)
            normalized.setdefault("source_file", source_name)
            if "type" not in normalized:
                normalized["type"] = "Despesa"
            if "status" not in normalized:
                normalized["status"] = "Confirmado"
            if "budget_group" not in normalized:
                normalized["budget_group"] = "30 Desejos"
            if "category" not in normalized:
                normalized["category"] = "Outros"
            transactions.append(normalized)
    return transactions


def build_summary(transactions: list[dict[str, str]]) -> list[SummaryRow]:
    revenue_by_month: defaultdict[str, Decimal] = defaultdict(lambda: Decimal("0.00"))
    grouped_amounts: defaultdict[tuple[str, str, str], Decimal] = defaultdict(lambda: Decimal("0.00"))
    grouped_counts: defaultdict[tuple[str, str, str], int] = defaultdict(int)

    for transaction in transactions:
        if transaction.get("status") == "Ignorar":
            continue

        amount = Decimal(transaction["amount"])
        month = month_from_date(transaction["date"])
        group = transaction.get("budget_group", "")
        category = transaction.get("category", "Outros")

        if group == "Receita" or transaction.get("type") == "Receita":
            revenue_by_month[month] += amount
            grouped_amounts[(month, "Receita", category)] += amount
            grouped_counts[(month, "Receita", category)] += 1
            continue

        if group not in SPENDING_GROUPS:
            continue

        grouped_amounts[(month, group, category)] += amount
        grouped_counts[(month, group, category)] += 1

    rows: list[SummaryRow] = []
    for key in sorted(grouped_amounts):
        month, group, category = key
        amount = grouped_amounts[key]
        monthly_revenue = revenue_by_month[month]
        percent_value = Decimal("0.00")
        if monthly_revenue:
            percent_value = (amount / monthly_revenue) * Decimal("100")

        rows.append(
            SummaryRow(
                month=month,
                budget_group=group,
                category=category,
                amount=money(amount),
                monthly_revenue=money(monthly_revenue),
                percent_of_revenue=percent(percent_value),
                transaction_count=grouped_counts[key],
                notes="Receita usada como denominador do próprio mês.",
            )
        )
    return rows


def write_csv(rows: list[SummaryRow], output: Path) -> None:
    with output.open("w", newline="", encoding="utf-8") as handle:
        fieldnames = list(asdict(rows[0]).keys()) if rows else [field.name for field in SummaryRow.__dataclass_fields__.values()]
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(asdict(row))


def main() -> int:
    parser = argparse.ArgumentParser(description="Build monthly summaries from normalized finance JSON files.")
    parser.add_argument("json_files", nargs="+", type=Path)
    parser.add_argument("--json-out", type=Path, required=True)
    parser.add_argument("--csv-out", type=Path)
    args = parser.parse_args()

    transactions = load_transactions(args.json_files)
    rows = build_summary(transactions)
    payload = {
        "source_files": [str(path) for path in args.json_files],
        "summary_count": len(rows),
        "rows": [asdict(row) for row in rows],
    }
    args.json_out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.csv_out:
        write_csv(rows, args.csv_out)

    print(f"transactions: {len(transactions)}")
    print(f"summary rows: {len(rows)}")
    print(f"json: {args.json_out}")
    if args.csv_out:
        print(f"csv: {args.csv_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
