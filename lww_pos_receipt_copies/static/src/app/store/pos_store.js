import { PosStore } from "@point_of_sale/app/store/pos_store";
import { patch } from "@web/core/utils/patch";
import { buildReceiptBytes, sendToRawBT } from "@lww_pos_receipt_copies/app/rawbt/escpos";

const isAndroid = () => /Android/i.test(navigator.userAgent);

patch(PosStore.prototype, {
    async printReceipt({
        basic = false,
        order = this.get_order(),
        printBillActionTriggered = false,
    } = {}) {
        const configured = parseInt(this.config.receipt_copies) || 1;
        const copies = printBillActionTriggered ? 1 : Math.max(1, configured);
        if (this.config.receipt_rawbt && isAndroid() && !basic && !printBillActionTriggered) {
            return this.lwwPrintViaRawBT(order, copies);
        }
        this.printer.receiptCopies = copies;
        try {
            return await super.printReceipt({ basic, order, printBillActionTriggered });
        } finally {
            this.printer.receiptCopies = 1;
        }
    },

    async lwwPrintViaRawBT(order, copies) {
        const data = this.orderExportForPrinting(order);
        const bytes = buildReceiptBytes(data, {
            copies,
            formatCurrency: this.env.utils.formatCurrency,
        });
        sendToRawBT(bytes);
        order.nb_print += 1;
        if (typeof order.id === "number") {
            await this.data.write("pos.order", [order.id], { nb_print: order.nb_print });
        }
        return true;
    },
});
