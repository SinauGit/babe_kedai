{
    "name": "LWW POS Receipt Copies",
    "version": "18.0.1.1.0",
    "category": "Sales/Point of Sale",
    "summary": "Cetak struk pelanggan N salinan dalam satu klik",
    "depends": ["point_of_sale"],
    "data": [
        "views/res_config_settings_views.xml",
    ],
    "assets": {
        "point_of_sale._assets_pos": [
            "lww_pos_receipt_copies/static/src/app/**/*",
        ],
    },
    "installable": True,
    "application": False,
    "license": "LGPL-3",
}
