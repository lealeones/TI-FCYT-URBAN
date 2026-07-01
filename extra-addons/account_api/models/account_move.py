from odoo import models, _
import requests
import json
import logging

_logger = logging.getLogger(__name__)


class AccountMove(models.Model):
    _inherit = "account.move"

    def _send_payment_status_webhook(self):
        """Send webhook notification when payment status changes"""
        for record in self:
            states = {
                "not_paid": "PENDING",
                "paid": "PAID",
                "cancel": "CANCELED",
            }
            if not record.ref or len(record.ref) == 0:
                _logger.warning(
                    f"Skipping webhook for invoice with empty reference (ID: {record.id})"
                )
                continue
            if not record.payment_state or len(record.payment_state) == 0:
                _logger.warning(
                    f"Skipping webhook for invoice {record.ref} with empty payment state"
                )
                continue
            if not record.payment_state in states.keys():
                _logger.warning(
                    f"Skipping webhook for invoice {record.ref} with unsupported payment state {record.payment_state}"
                )
                continue

            data = {
                "invoiceId": record.ref,
                "status": states.get(record.payment_state, "UNKNOWN"),
            }

            webhook_url = (
                self.env["ir.config_parameter"]
                .sudo()
                .get_param("account.api.invoice.state.webhook")
            )

            try:
                headers = {"Content-Type": "application/json"}

                response = requests.post(
                    webhook_url, data=json.dumps(data), headers=headers, timeout=30
                )

                if response.status_code == 200:
                    _logger.info(
                        f"Notificación de pago enviada exitosamente para factura {record.ref}"
                    )
                else:
                    _logger.warning(
                        f"Error al enviar notificación de pago para factura {record.ref}. Status code: {response.status_code}"
                    )

            except requests.exceptions.RequestException as e:
                _logger.error(
                    f"Error al enviar notificación de pago para factura {record.ref}: {str(e)}"
                )
            except Exception as e:
                _logger.error(
                    f"Error inesperado al procesar notificación de pago para factura {record.ref}: {str(e)}"
                )

    def _compute_payment_state(self):
        super()._compute_payment_state()
        for record in self:
            record._send_payment_status_webhook()
