from odoo import fields, models


class ResConfigSettings(models.TransientModel):
    _inherit = "res.config.settings"

    pos_receipt_copies = fields.Integer(related="pos_config_id.receipt_copies", readonly=False)
    pos_receipt_rawbt = fields.Boolean(related="pos_config_id.receipt_rawbt", readonly=False)
