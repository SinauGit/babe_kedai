import { PrinterService } from "@point_of_sale/app/printer/printer_service";
import { patch } from "@web/core/utils/patch";

patch(PrinterService.prototype, {
    async printHtml(el, options) {
        const copies = this.receiptCopies || 1;
        if (copies <= 1) {
            return super.printHtml(el, options);
        }
        if (!this.device) {
            const wrapper = document.createElement("div");
            for (let i = 0; i < copies; i++) {
                const copy = el.cloneNode(true);
                if (i < copies - 1) {
                    copy.style.breakAfter = "page";
                    copy.style.pageBreakAfter = "always";
                }
                wrapper.appendChild(copy);
            }
            return super.printHtml(wrapper, options);
        }
        let result = true;
        for (let i = 0; i < copies; i++) {
            result = await super.printHtml(el.cloneNode(true), options);
        }
        return result;
    },
});
