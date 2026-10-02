import { patch } from "@web/core/utils/patch";
import { PosOrderline } from "@point_of_sale/app/models/pos_order_line";

patch(PosOrderline.prototype, {
    setup(vals) {
        super.setup(...arguments);
        if (vals && vals.note && !this.customer_note) {
            this.customer_note = vals.note;
        }
    },
    setNote(note) {
        super.setNote(...arguments);
        this.set_customer_note(note);
    },
});
