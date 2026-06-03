#!/usr/bin/env python3
"""Normalize Nubank account and card CSV exports for Notion import."""

from __future__ import annotations

import argparse
import csv
import json
from dataclasses import asdict, dataclass
from decimal import Decimal
from pathlib import Path


@dataclass(frozen=True)
class Transaction:
    date: str
    description: str
    amount: str
    type: str
    category: str
    account: str
    status: str
    budget_group: str
    source: str
    external_id: str
    invoice: str
    notes: str


def category_for(description: str) -> str:
    text = description.upper()
    rules = [
        ("Moradia", ["DÉBITO EM CONTA", "DEBITO EM CONTA"]),
        ("Assinaturas", ["SPOTIFY", "NETFLIX", "APPLE.COM/BILL", "CHATGPT", "OPENAI", "WINDSURF", "IFOOD CLUB"]),
        ("Saúde", ["SEGURO VIDA", "SEGURO CELULAR", "YELUMSEG"]),
        ("Telefone", ["BCO C6", "BANCO C6", " C6 "]),
        ("Alimentação", ["COMERCIALBARROS", "IFOOD"]),
        ("Investimentos", ["RDB", "AVENUE SECURITIES", "BANCO INTER", "BCO INTER", "INTER"]),
        ("Transporte", ["UBER", "POSTO"]),
    ]
    for category, needles in rules:
        if any(needle in text for needle in needles):
            return category
    return "Outros"


def iso_from_br(date: str) -> str:
    day, month, year = date.split("/")
    return f"{year}-{month}-{day}"


def transaction_type(amount: Decimal, description: str, source: str) -> tuple[str, str]:
    text = description.upper()
    if source == "card":
        if amount < 0 or "IOF DE VOLTA" in text or "PAGAMENTO RECEBIDO" in text:
            return "Transferência", "Ignorar"
        return "Despesa", "Confirmado"

    if "TRANSFERÊNCIA RECEBIDA" in text and "LEONARDO NAKAO" in text and amount >= Decimal("10000"):
        return "Receita", "Confirmado"
    if "LEONARDO NAKAO" in text:
        return "Transferência", "Confirmado"
    if "BCO C6" in text or "BANCO C6" in text:
        return "Despesa", "Confirmado"
    if "TRANSFERÊNCIA RECEBIDA" in text:
        return "Receita", "Confirmado"
    if "APLICAÇÃO RDB" in text or "RESGATE RDB" in text or "PAGAMENTO DE FATURA" in text:
        return "Transferência", "Confirmado"
    if "AVENUE SECURITIES" in text or "BANCO INTER" in text or "BCO INTER" in text:
        return "Transferência", "Confirmado"
    if amount < 0:
        return "Despesa", "Confirmado"
    return "Receita", "Confirmado"


def budget_group_for(kind: str, status: str, category: str, description: str) -> str:
    text = description.upper()
    if status == "Ignorar":
        return "Ignorar"
    if kind == "Receita":
        return "Receita"
    if any(word in text for word in ["VERO", "OPENAI", "CHATGPT", "WINDSURF"]):
        return "50 Necessidades"
    if "LUCILENE DA SILVA NAKAO" in text:
        return "50 Necessidades"
    if "DÉBITO EM CONTA" in text or "DEBITO EM CONTA" in text:
        return "50 Necessidades"
    if kind == "Transferência":
        if category == "Investimentos" or "APLICAÇÃO RDB" in text or "AVENUE" in text or "BANCO INTER" in text or "BCO INTER" in text:
            return "20 Futuro"
        return "Transferência"
    if category in {"Saúde", "Moradia", "Telefone"}:
        return "50 Necessidades"
    if category == "Transporte":
        return "50 Necessidades"
    if category == "Alimentação":
        if any(word in text for word in ["IFOOD", "BAR", "CAFE", "PUB", "SUSHI", "PIZZARIA", "LANCHES"]):
            return "30 Desejos"
        return "50 Necessidades"
    return "30 Desejos"


def parse_card(path: Path, invoice: str) -> list[Transaction]:
    transactions: list[Transaction] = []
    with path.open(newline="", encoding="utf-8-sig") as handle:
        for index, row in enumerate(csv.DictReader(handle), start=1):
            amount = Decimal(row["amount"])
            kind, status = transaction_type(amount, row["title"], "card")
            category = category_for(row["title"])
            transactions.append(
                Transaction(
                    date=row["date"],
                    description=row["title"],
                    amount=str(abs(amount)),
                    type=kind,
                    category=category,
                    account="Cartão de crédito",
                    status=status,
                    budget_group=budget_group_for(kind, status, category, row["title"]),
                    source="Nubank",
                    external_id=f"nubank-card:{row['date']}:{index}:{row['title']}:{row['amount']}",
                    invoice=invoice,
                    notes="Importado de CSV de fatura do cartão Nubank.",
                )
            )
    return transactions


def parse_account(path: Path) -> list[Transaction]:
    transactions: list[Transaction] = []
    with path.open(newline="", encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle):
            amount = Decimal(row["Valor"])
            kind, status = transaction_type(amount, row["Descrição"], "account")
            category = category_for(row["Descrição"])
            transactions.append(
                Transaction(
                    date=iso_from_br(row["Data"]),
                    description=row["Descrição"],
                    amount=str(abs(amount)),
                    type=kind,
                    category=category,
                    account="Conta principal",
                    status=status,
                    budget_group=budget_group_for(kind, status, category, row["Descrição"]),
                    source="Nubank",
                    external_id=row["Identificador"],
                    invoice="",
                    notes="Importado de CSV de extrato da conta Nubank.",
                )
            )
    return transactions


def write_csv(transactions: list[Transaction], output: Path) -> None:
    with output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(asdict(transactions[0]).keys()) if transactions else [])
        writer.writeheader()
        for transaction in transactions:
            writer.writerow(asdict(transaction))


def summarize(transactions: list[Transaction]) -> dict[str, str | int]:
    confirmed = [item for item in transactions if item.status == "Confirmado"]
    ignored = [item for item in transactions if item.status == "Ignorar"]
    total_confirmed = sum((Decimal(item.amount) for item in confirmed), Decimal("0.00"))
    total_ignored = sum((Decimal(item.amount) for item in ignored), Decimal("0.00"))
    return {
        "transaction_count": len(transactions),
        "confirmed_count": len(confirmed),
        "ignored_count": len(ignored),
        "confirmed_total": str(total_confirmed),
        "ignored_total": str(total_ignored),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Normalize Nubank CSV exports.")
    parser.add_argument("csv", type=Path)
    parser.add_argument("--kind", choices=["account", "card"], required=True)
    parser.add_argument("--invoice", default="")
    parser.add_argument("--json-out", type=Path, required=True)
    parser.add_argument("--csv-out", type=Path)
    args = parser.parse_args()

    transactions = parse_card(args.csv, args.invoice) if args.kind == "card" else parse_account(args.csv)
    payload = {
        "source_csv": str(args.csv),
        "kind": args.kind,
        **summarize(transactions),
        "transactions": [asdict(item) for item in transactions],
    }
    args.json_out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.csv_out:
        write_csv(transactions, args.csv_out)

    print(f"transactions: {payload['transaction_count']}")
    print(f"confirmed: {payload['confirmed_count']} total {payload['confirmed_total']}")
    print(f"ignored: {payload['ignored_count']} total {payload['ignored_total']}")
    print(f"json: {args.json_out}")
    if args.csv_out:
        print(f"csv: {args.csv_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
