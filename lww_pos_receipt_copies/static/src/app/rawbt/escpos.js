const W = 32;
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;
const CUT = [GS, 0x56, 0x42, 0x00];
const RAWBT_PACKAGE = "ru.a402d.rawbtprinter";

const encoder = new TextEncoder();

function ascii(value) {
    return String(value ?? "")
        .replace(/\r/g, "")
        .replace(/[\u00a0\u202f]/g, " ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\x20-\x7e\n]/g, "?");
}

function wrap(text, width = W) {
    const out = [];
    for (const paragraph of ascii(text).split("\n")) {
        let line = "";
        for (let word of paragraph.split(/\s+/).filter(Boolean)) {
            while (word.length > width) {
                if (line) {
                    out.push(line);
                    line = "";
                }
                out.push(word.slice(0, width));
                word = word.slice(width);
            }
            if (!line) {
                line = word;
            } else if (line.length + 1 + word.length <= width) {
                line += " " + word;
            } else {
                out.push(line);
                line = word;
            }
        }
        out.push(line);
    }
    return out;
}

function center(text, width = W) {
    return " ".repeat(Math.max(0, Math.floor((width - text.length) / 2))) + text;
}

function leftRight(left, right) {
    const l = ascii(left);
    const r = ascii(right);
    if (l.length + r.length + 1 <= W) {
        return [l + " ".repeat(W - l.length - r.length) + r];
    }
    const indent = l.match(/^ */)[0];
    const lines = wrap(l.trim(), W - indent.length).map((row) => indent + row);
    lines.push(" ".repeat(Math.max(0, W - r.length)) + r);
    return lines;
}

function concat(parts) {
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const out = new Uint8Array(total);
    let pos = 0;
    for (const part of parts) {
        out.set(part, pos);
        pos += part.length;
    }
    return out;
}

class EscPos {
    constructor() {
        this.parts = [];
    }
    raw(...bytes) {
        this.parts.push(Uint8Array.from(bytes));
        return this;
    }
    text(line = "") {
        this.parts.push(encoder.encode(ascii(line) + "\n"));
        return this;
    }
    dashes() {
        return this.text("-".repeat(W));
    }
    bold(on) {
        return this.raw(ESC, 0x45, on ? 1 : 0);
    }
    centered(text) {
        wrap(text).forEach((line) => this.text(center(line)));
        return this;
    }
    centeredBig(text) {
        const value = ascii(text);
        const pad = Math.max(0, Math.floor((W - value.length * 2) / 2));
        this.raw(GS, 0x21, 0x11);
        this.text(" ".repeat(pad) + value);
        return this.raw(GS, 0x21, 0x00);
    }
    leftRight(left, right) {
        leftRight(left, right).forEach((line) => this.text(line));
        return this;
    }
    bytes() {
        return concat(this.parts);
    }
}

function buildOneReceipt(data, formatCurrency) {
    const p = new EscPos();
    const header = data.headerData || {};
    const company = header.company || {};
    p.raw(ESC, 0x40);

    if (company.name) {
        p.bold(true).centered(company.name).bold(false);
    }
    if (company.phone) {
        p.centered("Tel:" + company.phone);
    }
    if (company.vat) {
        p.centered((company.country_id?.vat_label || "Tax ID") + ":" + company.vat);
    }
    if (company.email) {
        p.centered(company.email);
    }
    if (company.website) {
        p.centered(company.website);
    }
    if (header.header) {
        p.centered(header.header);
    }
    if (header.cashier) {
        p.dashes();
        p.centered(header.cashier);
    }
    if (header.trackingNumber) {
        p.centeredBig(String(header.trackingNumber));
    }
    if (header.generalNote) {
        wrap(header.generalNote).forEach((line) => p.text(line));
    }
    p.text();

    for (const line of data.orderlines || []) {
        wrap(line.productName).forEach((row) => p.text(row));
        const qtyText = `  ${line.qty} x ${line.unitPrice}`;
        p.leftRight(qtyText, line.price);
        if (line.discount) {
            p.text(`  Disc ${line.discount}%`);
        }
        if (line.customerNote) {
            wrap("* " + line.customerNote, W - 2).forEach((row) => p.text("  " + row));
        }
    }

    const taxTotals = data.taxTotals;
    if (taxTotals && taxTotals.has_tax_groups) {
        p.dashes();
        for (const subtotal of taxTotals.subtotals || []) {
            p.leftRight(subtotal.name, formatCurrency(subtotal.base_amount_currency));
            for (const group of subtotal.tax_groups || []) {
                p.leftRight(group.group_name, formatCurrency(group.tax_amount_currency));
            }
        }
    }

    p.dashes();
    p.bold(true);
    p.leftRight(data.label_total, formatCurrency(taxTotals.order_sign * taxTotals.order_total));
    p.bold(false);
    if (data.show_rounding) {
        p.leftRight(
            data.label_rounding,
            formatCurrency(taxTotals.order_sign * taxTotals.order_rounding)
        );
        p.leftRight(
            "To Pay",
            formatCurrency(taxTotals.order_sign * (taxTotals.order_total + taxTotals.order_rounding))
        );
    }
    for (const payment of data.paymentlines || []) {
        p.leftRight(payment.name, formatCurrency(payment.amount));
    }
    if (data.show_change) {
        p.leftRight(data.label_change, formatCurrency(data.order_change));
    }
    if (data.total_discount) {
        p.leftRight(data.label_discounts, formatCurrency(data.total_discount));
    }
    p.text();

    if (data.footer) {
        p.centered(data.footer);
    }
    if (data.name) {
        p.centered(data.name);
    }
    if (data.date) {
        p.centered(data.date);
    }
    p.raw(LF, LF);
    p.raw(...CUT);
    return p.bytes();
}

export function buildReceiptBytes(data, { copies = 1, formatCurrency }) {
    const one = buildOneReceipt(data, formatCurrency);
    return concat(Array.from({ length: Math.max(1, copies) }, () => one));
}

function toBase64(bytes) {
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
}

export function sendToRawBT(bytes) {
    window.location.href =
        "intent:base64," + toBase64(bytes) + "#Intent;scheme=rawbt;package=" + RAWBT_PACKAGE + ";end;";
}
