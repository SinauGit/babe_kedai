import { PosStore } from "@point_of_sale/app/store/pos_store";
import { patch } from "@web/core/utils/patch";

patch(PosStore.prototype, {
    async printReceipt({
        basic = false,
        order = this.get_order(),
        printBillActionTriggered = false,
    } = {}) {
        const configured = parseInt(this.config.receipt_copies) || 1;
        this.printer.receiptCopies = printBillActionTriggered ? 1 : Math.max(1, configured);
        try {
            return await super.printReceipt({ basic, order, printBillActionTriggered });
        } finally {
            this.printer.receiptCopies = 1;
        }
    },
});
