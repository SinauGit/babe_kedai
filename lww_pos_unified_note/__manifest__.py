{
    "name": "LWW POS Unified Note",
    "version": "18.0.1.0.0",
    "category": "Point of Sale",
    "summary": "Satu catatan per item: tercetak di struk pelanggan dan tiket dapur",
    "depends": ["point_of_sale"],
    "data": [],
    "assets": {
        "point_of_sale._assets_pos": [
            "lww_pos_unified_note/static/src/js/pos_order_line.js",
            "lww_pos_unified_note/static/src/xml/control_buttons.xml",
        ],
    },
    "installable": True,
    "application": False,
    "license": "LGPL-3",
}
