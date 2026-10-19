# Order status emails

The customer gets an email every time their order changes: **placed, confirmed, preparing, out for delivery, delivered, cancelled, refunded**. It uses the same EmailJS account you already use for the registration code, with a **second template**.

## 1. Create the email template (about 5 minutes)
1. Open https://dashboard.emailjs.com and go to **Email Templates, then Create New Template**.
2. Name it `Order status`. In the settings of the template set:
   - **To Email:** `{{email}}`
   - **Subject:** `Go! Cery order {{order_id}}: {{order_status}}`
   - **From Name:** `Go! Cery`
3. Open the code editor of the template and paste the whole contents of `emailjs-order-template.html`. Save.
4. Copy the **Template ID** (it looks like `template_abc123`).

The free EmailJS plan allows 2 templates (you already use 1) and 200 emails per month. An order that goes through every step sends about 5 emails.

## 2. Tell the website and the app the template ID
- Website: in `js/config.orderemail.js` replace `YOUR_ORDER_TEMPLATE_ID`, then run `firebase deploy --only hosting`.
- Mobile app: in `src/environments/environment.ts` and `environment.prod.ts` replace `YOUR_ORDER_TEMPLATE_ID` in `orderEmailTemplateId`, then run `npm run build`, `npx cap sync android`, and build the APK again.

Until the ID is filled in, no emails are sent and nothing else is affected.

## 3. Who sends which email
| Change | Sent from |
| --- | --- |
| Order placed | the customer's browser or the app |
| Confirmed, preparing, out for delivery, delivered, refunded (admin panel) | the admin's browser |
| Customer cancels an order | the customer's browser or the app |
| Admin confirms a manual GCash or Maya payment | the admin's browser |
| Card or QR Ph payment received | the payment server (optional, step 4) |

The customer's email address is saved on each new order. For older orders it is looked up in the customer's profile.

## 4. Payment server emails (optional)
Only needed if you use the card and QR Ph payments. In EmailJS, go to **Account, Security** and turn on **Allow EmailJS API for non-browser applications**. Copy the **Private Key**. Then add these on the server (Render or your `.env`):
`EMAILJS_SERVICE_ID`, `EMAILJS_ORDER_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY`.

## 5. Test it
1. Place an order. You should get "We received your order".
2. In the admin panel, change the order status. You should get a new email each time.
3. Cancel a pending order as the customer. You should get "Your order was cancelled".

If nothing arrives, check the spam folder, open the browser console (F12) and look for `[mailer]` messages, and make sure the template ID was saved and the site was redeployed.

## Good to know
- A failed email never blocks the order. The order is still updated.
- Changing a status directly in the Firebase Console does not send an email, because the email is sent by the admin panel.
