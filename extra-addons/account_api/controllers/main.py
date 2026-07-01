import json
import base64
import logging
import requests
import datetime
import traceback
from odoo import http
from odoo.http import request
from dateutil.relativedelta import relativedelta

_logger = logging.getLogger(__name__)


class AccountMoveController(http.Controller):

    @http.route(
        "/account/move/create", type="json", auth="public", methods=["POST"], csrf=False
    )
    def create_account_move(self, **kwargs):
        try:
            data = json.loads(request.httprequest.get_data())
            if not data:
                return {
                    "success": False,
                    "error": "No se recibieron datos en la petición",
                }

            company = (
                request.env["res.company"]
                .sudo()
                .search([("active", "=", True)], limit=1)
            )
            if not company:
                return {"success": False, "error": "No hay ninguna compañía activa."}

            journal = (
                request.env["account.journal"]
                .sudo()
                .search(
                    [("type", "=", "sale"), ("company_id", "=", company.id)], limit=1
                )
            )
            if not journal:
                return {
                    "success": False,
                    "error": "No se encontró un diario de ventas en la compañía activa.",
                }

            data_user = data.get("user")
            data_product = data.get("product")
            if not data_user or not data_product:
                return {
                    "success": False,
                    "error": "Faltan datos de usuario o producto en la petición",
                }

            user_external_id = data_user.get("id")
            user_dni = data_user.get("dni")
            data_product_description = data_product.get("description")
            data_product_amount = data_product.get("amount", 0)
            data_product_session_id = data_product.get("sessionId")
            data_external_invoice_id = data_product.get("invoiceId")
            if (
                not user_external_id
                or not data_product_description
                or not data_external_invoice_id
            ):
                return {
                    "success": False,
                    "error": "Faltan datos necesarios en la petición",
                }

            partner_id = (
                request.env["res.partner"]
                .sudo()
                .search(
                    [
                        ("vat", "=", user_dni),
                    ],
                    limit=1,
                )
            )

            if not partner_id:
                partner_vals = {
                    "name": f"Client {user_external_id}",
                    "vat": user_dni,
                    "ref": user_external_id,
                    "company_id": company.id,
                    "l10n_ar_afip_responsibility_type_id": request.env.ref("l10n_ar.res_CF").id,
                    "l10n_latam_identification_type_id": request.env.ref("l10n_ar.it_dni").id
                }
                partner_id = request.env["res.partner"].sudo().create(partner_vals)

            product_id = (
                request.env["product.product"]
                .sudo()
                .search(
                    [
                        ("default_code", "=", data_product_session_id)
                    ],
                    limit=1,
                )
            )

            if not product_id:
                default_tax_id = company.account_sale_tax_id
                product_vals = {
                    "name": data_product_description,
                    "default_code": data_product_session_id,
                    "list_price": data_product_amount,
                    "company_id": company.id,
                    "type": "service",
                    "taxes_id": [(6, 0, [default_tax_id.id])] if default_tax_id else [],
                }
                product_tmpl_id = request.env["product.template"].sudo().create(product_vals)
                product_id = product_tmpl_id.product_variant_id

            today = datetime.date.today()
            first_day = today.replace(day=1)
            next_month_first = first_day + relativedelta(months=1)
            date_value = datetime.datetime.now().strftime("%Y-%m-%d")
            vals = {
                "partner_id": partner_id.id,
                "company_id": company.id,
                "journal_id": journal.id,
                "move_type": "out_invoice",
                "date": date_value,
                "invoice_date": date_value,
                "l10n_ar_afip_service_start": first_day.strftime("%Y-%m-%d"),
                "l10n_ar_afip_service_end": next_month_first.strftime("%Y-%m-%d"),
                "ref": data_external_invoice_id,
                "invoice_line_ids": [
                    (
                        0,
                        0,
                        {
                            "product_id": product_id.id,
                            "quantity": 1.0,
                            "price_unit": float(data_product_amount),
                            "name": data_product_description,
                        },
                    )
                ],
            }

            account_move = request.env["account.move"].sudo().create(vals)

            account_move.action_post()
            account_move.sudo()._portal_ensure_token()
            base_url = request.httprequest.host_url.rstrip("/")
            share_url = "{}/my/invoices/{}?access_token={}".format(
                base_url,
                account_move.id,
                account_move.access_token,
            )

            request.env.cr.commit()
            
            pdf_response = requests.get(f"{share_url}&report_type=pdf&download=true", timeout=30)
            pdf_base64 = base64.b64encode(pdf_response.content)

            return {
                "invoiceId": data_external_invoice_id,
                "base64Invoice": pdf_base64,
                "linkPayment": "url_de_mercadopago_o_payu",
            }

        except Exception as e:
            # Log del error
            _logger.error("Error al crear account.move: %s", str(e))

            # Rollback en caso de error
            request.env.cr.rollback()

            return {"success": False, "error": str(e)}

    @http.route(
        "/account/move/status", type="json", auth="public", methods=["GET"], csrf=False
    )
    def get_account_move_status(self, **kwargs):
        try:
            data = json.loads(request.httprequest.get_data())
            if not data:
                return {
                    "success": False,
                    "error": "No se recibieron datos en la petición",
                }

            data_external_invoice_id = data.get("invoiceId")
            if not data_external_invoice_id:
                return {
                    "success": False,
                    "error": "Falta el ID de la factura en la petición",
                }

            account_move = (
                request.env["account.move"]
                .sudo()
                .search([("ref", "=", data_external_invoice_id)], limit=1)
            )

            if not account_move:
                return {
                    "success": False,
                    "error": "No se encontró ninguna factura con el ID proporcionado.",
                }

            states = {
                "not_paid": "PENDING",
                "paid": "PAID",
                "cancel": "CANCELED",
            }
            status = states.get(account_move.payment_state, "UNKNOWN")
            return {
                "invoiceId": data_external_invoice_id,
                "status": status,
            }

        except Exception as e:
            # Log del error
            _logger.error("Error al obtener el estado de account.move: %s", str(e))

            return {"success": False, "error": str(e)}

    @http.route(
        "/account/move/cancel", type="json", auth="public", methods=["POST"], csrf=False
    )
    def cancel_account_move(self, **kwargs):
        try:
            data = json.loads(request.httprequest.get_data())
            if not data:
                return {"success": False, "error": "No se recibieron datos en la petición"}

            data_external_invoice_id = data.get("invoiceId")
            if not data_external_invoice_id:
                return {"success": False, "error": "Falta el ID de la factura en la petición"}

            account_move = (
                request.env["account.move"]
                .sudo()
                .search([("ref", "=", data_external_invoice_id)], limit=1)
            )

            if not account_move:
                return {"success": False, "error": "No se encontró ninguna factura con el ID proporcionado."}

            # Si la factura está en estado 'posted', crear nota de crédito automáticamente
            # (esto prevalece sobre la comprobación de AFIP)
            force_refund = account_move.state == "posted"

            # Determinar si la factura fue publicada en AFIP.
            # En este entorno hay módulos que usan los campos `afip_auth_code` / `afip_auth_mode`
            # (por ejemplo integraciones con pyafipws). Si existe un código de autorización,
            # consideramos que ya fue publicada.
            published_in_afip = False
            try:
                published_in_afip = bool(getattr(account_move, "afip_auth_code", False))
            except Exception:
                published_in_afip = False

            # Si no está publicada y no está 'posted', cancelamos directamente
            if not published_in_afip and not force_refund:
                # Use el método estándar para cancelar (button_cancel está presente en account.move)
                account_move.sudo().button_cancel()
                request.env.cr.commit()
                return {"invoiceId": data_external_invoice_id, "status": "CANCELED", "success": True}

            # Si está publicada en AFIP, crear nota de crédito (out_refund) con motivo 'Devolucion'
            # Reutilizamos las líneas de la factura original
            # Si ya existe una nota de crédito asociada a esta factura, devolverla en vez de crear otra
            try:
                existing_refunds = account_move.reversal_move_ids.filtered(
                    lambda m: m.move_type in ("out_refund", "in_refund") and m.state != "cancel"
                )
            except Exception:
                existing_refunds = account_move.reversal_move_ids.filtered(
                    lambda m: m.move_type in ("out_refund", "in_refund")
                )

            if existing_refunds:
                # Use the most recent refund (by id)
                credit_move = existing_refunds.sorted(lambda r: r.id, reverse=True)[0]
                try:
                    credit_move.sudo()._portal_ensure_token()
                except Exception:
                    pass
                request.env.cr.commit()
                base_url = request.httprequest.host_url.rstrip("/")
                share_url = "{}/my/invoices/{}?access_token={}".format(
                    base_url, credit_move.id, credit_move.access_token
                )
                try:
                    pdf_response = requests.get(f"{share_url}&report_type=pdf&download=true", timeout=30)
                    pdf_base64 = base64.b64encode(pdf_response.content)
                except Exception:
                    pdf_base64 = False

                return {
                    "invoiceId": data_external_invoice_id,
                    "status": "REFUNDED",
                    "creditInvoiceRef": credit_move.ref or (credit_move.name or f"{data_external_invoice_id}-NC"),
                    "creditInvoiceId": credit_move.id,
                    "base64Invoice": pdf_base64,
                    "success": True,
                }

            invoice_lines = []
            for line in account_move.invoice_line_ids:
                tax_ids = line.tax_ids.ids if hasattr(line, "tax_ids") else []
                invoice_lines.append(
                    (
                        0,
                        0,
                        {
                            "product_id": line.product_id.id if line.product_id else False,
                            "name": line.name,
                            "quantity": float(line.quantity),
                            "price_unit": float(line.price_unit),
                            "tax_ids": [(6, 0, tax_ids)],
                            "account_id": line.account_id.id if line.account_id else False,
                        },
                    )
                )

            today = datetime.datetime.now().strftime("%Y-%m-%d")
            refund_ref = f"{data_external_invoice_id}-NC"

            # Prepare default values for reversal so Odoo sets reversed_entry_id and handles reconciliation
            default_vals = {
                "ref": refund_ref,
                "invoice_origin": account_move.name or account_move.l10n_latam_document_number or account_move.ref,
                "date": today,
                "invoice_date": today,
                # AFIP related fields: repetir periodo de servicio si existían
                "l10n_ar_afip_service_start": getattr(account_move, "l10n_ar_afip_service_start", False),
                "l10n_ar_afip_service_end": getattr(account_move, "l10n_ar_afip_service_end", False),
            }

            # Determine reverse move_type using a safe local map (mirrors core TYPE_REVERSE_MAP)
            reverse_map = {
                "entry": "entry",
                "out_invoice": "out_refund",
                "out_refund": "out_invoice",
                "in_invoice": "in_refund",
                "in_refund": "in_invoice",
                "out_receipt": "out_refund",
                "in_receipt": "in_refund",
            }
            reverse_move_type = reverse_map.get(account_move.move_type, "out_refund")
            default_vals["move_type"] = reverse_move_type

            # Prefer a l10n_latam document type from the invoice's available types filtered for credit_note
            try:
                # account_move.l10n_latam_available_document_type_ids is computed and should contain valid candidates
                candidates = account_move.l10n_latam_available_document_type_ids.filtered(
                    lambda d: d.internal_type == "credit_note"
                )
                if candidates:
                    default_vals["l10n_latam_document_type_id"] = candidates[0].id
                else:
                    # Fallback: search globally by country of the company
                    country = account_move.company_id.account_fiscal_country_id and account_move.company_id.account_fiscal_country_id.id or False
                    if country:
                        doc_type = request.env["l10n_latam.document.type"].sudo().search([
                            ("internal_type", "=", "credit_note"),
                            ("country_id", "=", country),
                        ], limit=1)
                        if doc_type:
                            default_vals["l10n_latam_document_type_id"] = doc_type.id
            except Exception:
                # If localization not available or any error, continue without setting the document type
                pass

            # Prefer using the same journal as the original invoice for the reversal
            try:
                if account_move.journal_id:
                    default_vals["journal_id"] = account_move.journal_id.id
            except Exception:
                pass

            # Use the core _reverse_moves to create a proper reversal (sets reversed_entry_id and posts/reconciles if cancel=True)
            # Run reversal using the invoice's company context to avoid multi-company singleton issues
            try:
                credit_moves = account_move.sudo().with_company(account_move.company_id)._reverse_moves(default_values_list=[default_vals], cancel=True)
            except Exception:
                # Fallback to calling without explicit company if something goes wrong
                credit_moves = account_move.sudo()._reverse_moves(default_values_list=[default_vals], cancel=True)
            # _reverse_moves returns the created reverse moves; we're dealing with a single invoice
            credit_move = credit_moves and credit_moves[0] or None
            if credit_move:
                try:
                    credit_move.sudo().with_company(credit_move.company_id)._portal_ensure_token()
                except Exception:
                    credit_move.sudo()._portal_ensure_token()
                # Commit antes de intentar obtener el PDF
                request.env.cr.commit()

            base_url = request.httprequest.host_url.rstrip("/")
            share_url = "{}/my/invoices/{}?access_token={}".format(
                base_url, credit_move.id, credit_move.access_token
            )

            # Obtener PDF de la nota de crédito
            try:
                pdf_response = requests.get(f"{share_url}&report_type=pdf&download=true", timeout=30)
                pdf_base64 = base64.b64encode(pdf_response.content)
            except Exception:
                pdf_base64 = False

            return {
                "invoiceId": data_external_invoice_id,
                "status": "REFUNDED",
                "creditInvoiceRef": refund_ref,
                "creditInvoiceId": credit_move.id,
                "base64Invoice": pdf_base64,
                "success": True,
            }

        except Exception as e:
            # Log full traceback to help identify the source of 'Expected singleton' errors
            _logger.error("Error al cancelar account.move: %s", str(e))
            _logger.error(traceback.format_exc())
            request.env.cr.rollback()
            return {"success": False, "error": str(e)}

    @http.route(
        "/account/move/paid", type="json", auth="public", methods=["POST"], csrf=False
    )
    def pay_account_move(self, **kwargs):
        try:
            data = json.loads(request.httprequest.get_data())
            if not data:
                return {"success": False, "error": "No se recibieron datos en la petición"}

            data_external_invoice_id = data.get("invoiceId")
            amount = data.get("amount")

            if not data_external_invoice_id:
                return {"success": False, "error": "Falta el ID de la factura en la petición"}

            account_move = (
                request.env["account.move"].sudo().search([("ref", "=", data_external_invoice_id)], limit=1)
            )

            if not account_move:
                return {"success": False, "error": "No se encontró ninguna factura con el ID proporcionado."}

            # Only allow payments on posted invoices
            if account_move.state != "posted":
                return {"success": False, "error": "Solo se pueden pagar facturas en estado 'posted'."}

            # If the invoice was reversed/cancelled, don't allow payment
            if account_move.reversal_move_ids:
                return {"success": False, "error": "La factura ya tiene una nota de crédito asociada (revertida). No se puede pagar."}

            # If already fully paid, return status
            if account_move.payment_state == "paid":
                return {
                    "invoiceId": data_external_invoice_id,
                    "status": "PAID",
                    "paid": True,
                    "paymentIds": [p.id for p in account_move.payment_id | account_move.reconciled_payment_ids | account_move.matched_payment_ids],
                    "success": True,
                }

            # Determine amount to pay: use provided amount or remaining residual
            try:
                if amount is None:
                    # amount_residual is in company currency
                    amount_to_pay = float(account_move.amount_residual)
                else:
                    amount_to_pay = float(amount)
            except Exception:
                return {"success": False, "error": "El campo amount debe ser numérico."}

            # Use the register payment wizard to create/post/reconcile the payment properly
            company = account_move.company_id
            try:
                PaymentRegisterModel = (
                    request.env["account.payment.register"].sudo().with_company(company).with_context(
                        active_model="account.move",
                        active_ids=[account_move.id],
                        skip_invoice_sync=True,
                        company_id=company.id,
                    )
                )

                # Create wizard record (default_get will prepare line_ids etc.) in the company's context
                wizard = PaymentRegisterModel.create({})

                # Set custom amount (wizard.amount is a compute editable field)
                try:
                    wizard.amount = amount_to_pay
                except Exception:
                    # If write fails for any reason, try setting custom_user_amount/currency
                    try:
                        wizard.custom_user_amount = amount_to_pay
                    except Exception:
                        pass

                # Create and post payments under company context
                payments = wizard.with_company(company)._create_payments()

            except Exception as e:
                # If company-scoped approach fails, fallback to plain context (more permissive)
                _logger.warning("Falling back to non-company-scoped payment register due to: %s", str(e))
                _logger.warning(traceback.format_exc())
                try:
                    PaymentRegisterModel = request.env["account.payment.register"].sudo().with_context(
                        active_model="account.move",
                        active_ids=[account_move.id],
                        skip_invoice_sync=True,
                    )
                    wizard = PaymentRegisterModel.create({})
                    try:
                        wizard.amount = amount_to_pay
                    except Exception:
                        try:
                            wizard.custom_user_amount = amount_to_pay
                        except Exception:
                            pass
                    payments = wizard._create_payments()
                except Exception as e2:
                    _logger.error("Error creando el pago para la factura %s: %s", data_external_invoice_id, str(e2))
                    _logger.error(traceback.format_exc())
                    request.env.cr.rollback()
                    return {"success": False, "error": str(e2)}

            # Commit DB before returning
            request.env.cr.commit()

            # Refresh invoice payment state
            account_move_sudo = request.env["account.move"].sudo().browse(account_move.id)

            return {
                "invoiceId": data_external_invoice_id,
                "status": account_move_sudo.payment_state.upper() if account_move_sudo.payment_state else "UNKNOWN",
                "paid": account_move_sudo.payment_state == "paid",
                "paymentIds": payments.ids if payments else [],
                "success": True,
            }

        except Exception as e:
            _logger.error("Error al crear el pago account.move: %s", str(e))
            _logger.error(traceback.format_exc())
            request.env.cr.rollback()
            return {"success": False, "error": str(e)}
