from odoo import api, fields, models


class PosConfig(models.Model):
    _inherit = "pos.config"

    receipt_copies = fields.Integer(string="Jumlah Salinan Struk", default=3)
    receipt_rawbt = fields.Boolean(string="Cetak via RawBT (ESC/POS)", default=False)

    @api.model
    def _load_pos_data_fields(self, config_id):
        params = super()._load_pos_data_fields(config_id)
        if params:
            params.extend(["receipt_copies", "receipt_rawbt"])
        return params
