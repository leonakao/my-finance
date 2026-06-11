#!/usr/bin/env python3
"""Extract Santander credit-card invoice items from a PDF.

This intentionally uses only the Python standard library. Santander invoices
embed readable text in compressed PDF streams, so we can decode the streams,
read text drawing commands, and reconstruct the expense rows well enough for
review before importing into Notion.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import zlib
from dataclasses import dataclass, asdict
from decimal import Decimal
from pathlib import Path


DATE_RE = re.compile(r"(?P<day>\d{2})/(?P<month>\d{2})")
MONEY_RE = re.compile(r"^-?\d{1,3}(?:\.\d{3})*,\d{2}$|^-?\d+,\d{2}$")
MONEY_FIND_RE = re.compile(r"-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+,\d{2}")
ROW_TAIL_WITH_INSTALLMENT_RE = re.compile(r"^(.*?)(\d{2}/\d{2})(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+,\d{2})$")
ROW_TAIL_AMOUNT_ONLY_RE = re.compile(r"^(.*?)(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+,\d{2})$")


@dataclass(frozen=True)
class TextEvent:
    page: int
    y: float
    x: float
    font: str
    text: str


@dataclass(frozen=True)
class Transaction:
    date: str
    description: str
    amount: str
    category: str
    budget_group: str
    installment: str
    source_card: str


def decode_pdf_string(raw: bytes) -> str:
    out = bytearray()
    i = 0
    while i < len(raw):
        c = raw[i]
        if c == 92:  # backslash
            i += 1
            if i >= len(raw):
                break
            c = raw[i]
            escapes = {
                ord("n"): 10,
                ord("r"): 13,
                ord("t"): 9,
                ord("b"): 8,
                ord("f"): 12,
            }
            if c in escapes:
                out.append(escapes[c])
                i += 1
            elif c in b"()\\":
                out.append(c)
                i += 1
            elif 48 <= c <= 55:
                j = i
                while j < len(raw) and j < i + 3 and 48 <= raw[j] <= 55:
                    j += 1
                out.append(int(raw[i:j], 8))
                i = j
            else:
                out.append(c)
                i += 1
        else:
            out.append(c)
            i += 1
    return out.decode("latin1", "replace")


def text_from_tj_array(raw: bytes) -> str:
    parts = re.finditer(rb"\((?:\\.|[^\\)])*\)", raw, re.S)
    return "".join(decode_pdf_string(part.group(0)[1:-1]) for part in parts)


def text_from_tj_operator(raw: bytes) -> str:
    match = re.match(rb"^\((.*)\)\s*Tj$", raw, re.S)
    return decode_pdf_string(match.group(1)) if match else ""


def inflate_streams(pdf: bytes) -> list[bytes]:
    streams: list[bytes] = []
    for match in re.finditer(rb"stream\r?\n(.*?)\r?\nendstream", pdf, re.S):
        try:
            streams.append(zlib.decompress(match.group(1)))
        except zlib.error:
            continue
    return streams


def extract_text_events(pdf_path: Path) -> list[TextEvent]:
    pdf = pdf_path.read_bytes()
    events: list[TextEvent] = []
    page = 0
    command_re = re.compile(
        rb"BT|ET|"
        rb"/[A-Za-z0-9]+\s+1\s+Tf|"
        rb"[-\d.]+\s+[-\d.]+\s+[-\d.]+\s+[-\d.]+\s+[-\d.]+\s+[-\d.]+\s+Tm|"
        rb"[-\d.]+\s+[-\d.]+\s+Td|"
        rb"\((?:\\.|[^\\)])*\)\s*Tj|"
        rb"\[(?:\\.|[^\]])*\]TJ",
        re.S,
    )

    for stream in inflate_streams(pdf):
        if b"TJ" not in stream and b"Tj" not in stream:
            continue
        page += 1
        in_text = False
        x = 0.0
        y = 0.0
        font = ""
        for match in command_re.finditer(stream):
            token = match.group(0)
            if token == b"BT":
                in_text = True
                continue
            if token == b"ET":
                in_text = False
                continue
            if not in_text:
                continue
            if token.endswith(b" Tf"):
                font = token.split()[0].decode("ascii", "replace")
                continue
            if token.endswith(b" Tm"):
                parts = token.split()
                x = float(parts[4])
                y = float(parts[5])
                continue
            if token.endswith(b" Td"):
                parts = token.split()
                x += float(parts[0])
                y += float(parts[1])
                continue
            if token.endswith(b"Tj"):
                text = text_from_tj_operator(token).strip()
                if text:
                    events.append(TextEvent(page=page, y=round(y, 2), x=round(x, 2), font=font, text=text))
                continue
            if token.endswith(b"TJ"):
                text = text_from_tj_array(token[:-2]).strip()
                if text:
                    events.append(TextEvent(page=page, y=round(y, 2), x=round(x, 2), font=font, text=text))
    return events


def row_text_from_events(row_events: list[TextEvent]) -> str:
    return re.sub(r"\s+", " ", "".join(event.text for event in row_events)).strip()


def decimal_from_brl(value: str) -> Decimal:
    return Decimal(value.replace(".", "").replace(",", "."))


def brl_from_decimal(value: Decimal) -> str:
    text = f"{value:.2f}"
    whole, cents = text.split(".")
    groups = []
    while whole:
        groups.append(whole[-3:])
        whole = whole[:-3]
    return f"{'.'.join(reversed(groups))},{cents}"


def infer_closing_month(rows: dict[tuple[int, float], list[TextEvent]]) -> int:
    for row_events in rows.values():
        row_text = row_text_from_events(row_events)
        match = re.search(r"até\s*(\d{2})/(\d{2})|\b\d{2}/\d{2}/\d{2,4}\s*a\s*\d{2}/(\d{2})/\d{2,4}\b", row_text, re.I)
        if match:
            return int(match.group(2) or match.group(3))
    return 12


def infer_year(rows: dict[tuple[int, float], list[TextEvent]]) -> int:
    for row_events in rows.values():
        row_text = row_text_from_events(row_events)
        full_year_match = re.search(r"\b\d{2}/\d{2}/(\d{4})\b", row_text)
        if full_year_match:
            return int(full_year_match.group(1))
        short_year_match = re.search(r"\b\d{2}/\d{2}/(\d{2})\b", row_text)
        if short_year_match:
            return 2000 + int(short_year_match.group(1))
    return 2026


def infer_card_by_position(page: int, x: float, active_cards: dict[int, str]) -> str:
    if page == 2 and x < 285:
        return active_cards.get(5480, "5480")
    if page == 2 and x >= 285:
        return active_cards.get(128, "0128")
    if page == 3:
        return active_cards.get(128, "0128")
    return ""


def category_for(description: str) -> str:
    text = description.upper()
    rules = [
        ("Assinaturas", ["AMAZONPRIME", "AMAZON PRIME", "AMAZON MUSIC", "YOUTUBE", "VERO", "SCP ESSENCIAL"]),
        ("Transporte", ["UBER", "POSTO", "SEM PARAR", "SEM*PARAR", "AZUL", "AEREAS"]),
        ("Saúde", ["DROGASIL", "NUTRIVICA"]),
        ("Pets", ["PETZ", "COBASI", "PETLOVE", "PET CARE", "VETERIN", "VET "]),
        ("Cuidados pessoais", ["SALAO", "SALÃO", "CABEL", "BARBEARIA", "ESTETIC", "MANICURE", "SEPHORA", "BOTICARIO", "OBOTICARIO"]),
        ("Lazer", ["INGRESSO", "MULTIPLEX", "AIRBNB"]),
        (
            "Alimentação",
            [
                "BOUCHERIE",
                "SUSHI",
                "CARNES",
                "PASTEL",
                "ROOFTOP",
                "LANCHES",
                "LIBANESA",
                "PIZZARIA",
                "SALGADOS",
                "MONTANA",
                "DOM ATACADISTA",
                "LA CARNE",
                "SUPERMERCADO",
                "FRANS CAFE",
                "GASTRO",
                "LOS BRUTOS",
                "A LIBANESA",
                "DUAS MENINAS",
            ],
        ),
        ("Compras", ["AMAZON", "MERCADOLIVRE", "KABUM", "CASASBAHIA", "MARKETPLACE", "MKTPLC"]),
    ]
    for category, needles in rules:
        if any(needle in text for needle in needles):
            return category
    return "Outros"


def budget_group_for(category: str, description: str) -> str:
    text = description.upper()
    if any(word in text for word in ["VERO", "OPENAI", "CHATGPT"]):
        return "50 Necessidades"
    if "ANUIDADE" in text:
        return "50 Necessidades"
    if category in {"Saúde", "Moradia", "Pets"}:
        return "50 Necessidades"
    if category == "Cuidados pessoais":
        return "30 Desejos"
    if category == "Transporte":
        if "AZUL" in text or "AEREAS" in text:
            return "30 Desejos"
        return "50 Necessidades"
    if category == "Alimentação":
        if any(word in text for word in ["SUSHI", "PASTEL", "ROOFTOP", "LANCHES", "LIBANESA", "CAFE", "PUB", "PIZZARIA", "LOS BRUTOS", "MONTANA", "SALGADOS", "BOUCHERIE"]):
            return "30 Desejos"
        return "50 Necessidades"
    if category == "Investimentos":
        return "20 Futuro"
    return "30 Desejos"


def normalize_description_and_amount(description: str, amount: str, installment: str) -> tuple[str, str]:
    if not installment and description.endswith("/"):
        integer_part, cents = amount.split(",")
        if len(integer_part) > 2:
            return f"{description}{integer_part[:2]}", f"{integer_part[2:]},{cents}"

    return description, amount


def parse_transactions(events: list[TextEvent]) -> list[Transaction]:
    rows: dict[tuple[int, float], list[TextEvent]] = {}
    active_cards = {128: "0128", 5480: "5480"}

    for event in events:
        if "XXXX XXXX 8713" in event.text:
            active_cards[5480] = "8713"
        rows.setdefault((event.page, event.y), []).append(event)

    closing_month = infer_closing_month(rows)
    statement_year = infer_year(rows)
    candidate_pages: set[int] = set()
    for row_events in rows.values():
        row_text = row_text_from_events(row_events)
        has_date = bool(DATE_RE.search(row_text))
        has_amount = any(not match.group(0).startswith("-") for match in MONEY_FIND_RE.finditer(row_text))
        if has_date and has_amount:
            candidate_pages.add(row_events[0].page)
    page_scores = {page: 0 for page in candidate_pages}
    for row_events in rows.values():
        row_text = row_text_from_events(row_events)
        has_date = bool(DATE_RE.search(row_text))
        has_amount = any(not match.group(0).startswith("-") for match in MONEY_FIND_RE.finditer(row_text))
        if has_date and has_amount:
            page_scores[row_events[0].page] = page_scores.get(row_events[0].page, 0) + 1
    candidate_pages = {page for page, score in page_scores.items() if score >= 3}

    transactions: list[Transaction] = []
    for (page, _y), row_events in sorted(rows.items()):
        if page not in candidate_pages:
            continue
        row_events = sorted(row_events, key=lambda event: event.x)
        row_text = row_text_from_events(row_events)

        date_match = DATE_RE.search(row_text)
        if not date_match:
            continue

        description_start = date_match.end()
        tail = row_text[description_start:].strip()
        installment_tail_match = ROW_TAIL_WITH_INSTALLMENT_RE.match(tail)
        amount_only_tail_match = ROW_TAIL_AMOUNT_ONLY_RE.match(tail)
        tail_match = installment_tail_match or amount_only_tail_match
        if not tail_match:
            continue

        description = tail_match.group(1).strip()
        installment = installment_tail_match.group(2) if installment_tail_match else ""
        amount = installment_tail_match.group(3) if installment_tail_match else amount_only_tail_match.group(2)
        description, amount = normalize_description_and_amount(description, amount, installment)
        if not description or "PAGAMENTODEFATURA" in description.replace(" ", "").upper():
            continue

        day = int(date_match.group("day"))
        month = int(date_match.group("month"))
        year = statement_year - 1 if month > closing_month else statement_year
        card = infer_card_by_position(page, row_events[0].x, active_cards)

        category = category_for(description)
        transactions.append(
            Transaction(
                date=f"{year:04d}-{month:02d}-{day:02d}",
                description=description,
                amount=str(decimal_from_brl(amount)),
                category=category,
                budget_group=budget_group_for(category, description),
                installment=installment,
                source_card=card,
            )
        )

    return transactions


def write_csv(transactions: list[Transaction], output: Path) -> None:
    with output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(asdict(transactions[0]).keys()) if transactions else [])
        writer.writeheader()
        for transaction in transactions:
            writer.writerow(asdict(transaction))


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract Santander invoice transactions from PDF.")
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--json-out", type=Path, default=Path("fatura.santander.json"))
    parser.add_argument("--csv-out", type=Path)
    args = parser.parse_args()

    events = extract_text_events(args.pdf)
    transactions = parse_transactions(events)
    total = sum((Decimal(item.amount) for item in transactions), Decimal("0.00"))

    payload = {
        "source_pdf": str(args.pdf),
        "transaction_count": len(transactions),
        "total": str(total),
        "total_brl": brl_from_decimal(total),
        "transactions": [asdict(item) for item in transactions],
    }

    args.json_out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.csv_out:
        write_csv(transactions, args.csv_out)

    print(f"transactions: {len(transactions)}")
    print(f"total: R$ {brl_from_decimal(total)}")
    print(f"json: {args.json_out}")
    if args.csv_out:
        print(f"csv: {args.csv_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
