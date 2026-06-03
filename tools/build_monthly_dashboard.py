#!/usr/bin/env python3
"""Build cleaner monthly dashboard summaries from normalized finance JSON files."""

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
SPENDING_GROUPS = ("50 Necessidades", "30 Desejos", "20 Futuro")
TARGET_PERCENT = {
    "50 Necessidades": Decimal("50.00"),
    "30 Desejos": Decimal("30.00"),
    "20 Futuro": Decimal("20.00"),
    "Receita": Decimal("100.00"),
}


@dataclass(frozen=True)
class GroupRow:
    month: str
    budget_group: str
    amount: str
    monthly_revenue: str
    percent_of_revenue: str
    target_percent: str
    difference_percent: str
    transaction_count: int


@dataclass(frozen=True)
class CategoryRow:
    month: str
    budget_group: str
    category: str
    amount: str
    monthly_revenue: str
    percent_of_revenue: str
    transaction_count: int


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
        for item in payload.get("transactions", []):
            normalized = dict(item)
            normalized.setdefault("type", "Despesa")
            normalized.setdefault("status", "Confirmado")
            normalized.setdefault("budget_group", "30 Desejos")
            normalized.setdefault("category", "Outros")
            transactions.append(normalized)
    return transactions


def build_dashboard(transactions: list[dict[str, str]]) -> tuple[list[GroupRow], list[CategoryRow]]:
    revenue_by_month: defaultdict[str, Decimal] = defaultdict(lambda: Decimal("0.00"))
    group_amounts: defaultdict[tuple[str, str], Decimal] = defaultdict(lambda: Decimal("0.00"))
    group_counts: defaultdict[tuple[str, str], int] = defaultdict(int)
    category_amounts: defaultdict[tuple[str, str, str], Decimal] = defaultdict(lambda: Decimal("0.00"))
    category_counts: defaultdict[tuple[str, str, str], int] = defaultdict(int)

    for transaction in transactions:
        if transaction.get("status") == "Ignorar":
            continue

        amount = Decimal(transaction["amount"])
        month = month_from_date(transaction["date"])
        group = transaction.get("budget_group", "")
        category = transaction.get("category", "Outros")

        if group == "Receita" or transaction.get("type") == "Receita":
            revenue_by_month[month] += amount
            group_amounts[(month, "Receita")] += amount
            group_counts[(month, "Receita")] += 1
            continue

        if group not in SPENDING_GROUPS:
            continue

        group_amounts[(month, group)] += amount
        group_counts[(month, group)] += 1
        category_amounts[(month, group, category)] += amount
        category_counts[(month, group, category)] += 1

    group_rows: list[GroupRow] = []
    for month, group in sorted(group_amounts):
        amount = group_amounts[(month, group)]
        monthly_revenue = revenue_by_month[month]
        pct = Decimal("0.00") if not monthly_revenue else (amount / monthly_revenue) * Decimal("100")
        target = TARGET_PERCENT[group]
        group_rows.append(
            GroupRow(
                month=month,
                budget_group=group,
                amount=money(amount),
                monthly_revenue=money(monthly_revenue),
                percent_of_revenue=percent(pct),
                target_percent=percent(target),
                difference_percent=percent(pct - target),
                transaction_count=group_counts[(month, group)],
            )
        )

    category_rows: list[CategoryRow] = []
    for month, group, category in sorted(category_amounts):
        amount = category_amounts[(month, group, category)]
        monthly_revenue = revenue_by_month[month]
        pct = Decimal("0.00") if not monthly_revenue else (amount / monthly_revenue) * Decimal("100")
        category_rows.append(
            CategoryRow(
                month=month,
                budget_group=group,
                category=category,
                amount=money(amount),
                monthly_revenue=money(monthly_revenue),
                percent_of_revenue=percent(pct),
                transaction_count=category_counts[(month, group, category)],
            )
        )

    return group_rows, category_rows


def write_csv(rows: list[object], output: Path) -> None:
    with output.open("w", newline="", encoding="utf-8") as handle:
        fieldnames = list(asdict(rows[0]).keys()) if rows else []
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(asdict(row))


def main() -> int:
    parser = argparse.ArgumentParser(description="Build cleaner monthly dashboard summaries.")
    parser.add_argument("json_files", nargs="+", type=Path)
    parser.add_argument("--json-out", type=Path, required=True)
    parser.add_argument("--groups-csv-out", type=Path)
    parser.add_argument("--categories-csv-out", type=Path)
    args = parser.parse_args()

    transactions = load_transactions(args.json_files)
    group_rows, category_rows = build_dashboard(transactions)
    payload = {
        "source_files": [str(path) for path in args.json_files],
        "group_count": len(group_rows),
        "category_count": len(category_rows),
        "group_rows": [asdict(row) for row in group_rows],
        "category_rows": [asdict(row) for row in category_rows],
    }
    args.json_out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.groups_csv_out:
        write_csv(group_rows, args.groups_csv_out)
    if args.categories_csv_out:
        write_csv(category_rows, args.categories_csv_out)

    print(f"transactions: {len(transactions)}")
    print(f"group rows: {len(group_rows)}")
    print(f"category rows: {len(category_rows)}")
    print(f"json: {args.json_out}")
    if args.groups_csv_out:
        print(f"groups csv: {args.groups_csv_out}")
    if args.categories_csv_out:
        print(f"categories csv: {args.categories_csv_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
