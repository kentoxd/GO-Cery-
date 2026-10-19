# Online payments (PayMongo): card, GCash, and Maya

Customers can now pay by **Credit / Debit Card**, **GCash (Online)**, or **Maya (Online)**. The order is placed first, then the customer pays on the order page. The payment is checked by the server and the order becomes **Confirmed** by itself. The older GCash and Maya (manual QR plus receipt) and Cash on Delivery still work as before.

The online options are **hidden** until `apiBaseUrl` is set (step 4), so nothing breaks while you set this up.

**QR Ph** is built in too, but it is switched off, because PayMongo only turns it on for your account after you ask their support. When they confirm, add this line to the `paymentMethods` list in `js/config.js` (and to `onlinePaymentMethods`, which already includes it), and to `ALL_PAYMENT_METHODS` in `src/app/checkout/checkout.component.ts`:
`{ id: 'qrph', name: 'QR Ph', icon: '🔳', online: true }`

## 1. PayMongo account and keys
1. Sign up at https://dashboard.paymongo.com and stay in **Test mode**.
2. Go to **Developers, then API Keys** and copy the test keys (`pk_test_...` and `sk_test_...`).
3. Cards, GCash, and Maya work in test mode right away. (QR Ph needs PayMongo to switch it on first, see above.) Email their support and ask them to configure QR Ph for your test keys (this is in their QR Ph guide).

## 2. Run the server on your computer
1. Copy `.env.example` to `.env` and fill in the keys. `server/service-account.json` is your Firebase service account file.
2. Run `npm start`. Open http://localhost:3000/api/health. You should see "Go! Cery API running".

## 3. Put the server online (so the live website and the app can reach it)
Easiest free option is **Render** (render.com):
1. New, then **Blueprint** (or Web Service), and choose your GitHub repo. The `render.yaml` file already has the settings.
2. Add the environment variables: `PAYMONGO_SECRET_KEY`, `PAYMONGO_PUBLIC_KEY`, `PAYMONGO_WEBHOOK_SECRET`, and `FIREBASE_SERVICE_ACCOUNT_JSON` (paste the whole contents of the service account file as one line).
3. Copy your server address, for example `https://gocery-api.onrender.com`.
The free plan sleeps when unused, so the first payment after a quiet period can take about a minute to start.

## 4. Tell the website and the app where the server is
- Website: in `js/config.js` set `apiBaseUrl: 'https://gocery-api.onrender.com'`, then run `firebase deploy --only hosting`.
- Mobile app: in `src/environments/environment.ts` and `environment.prod.ts` set `apiBaseUrl`, then run `npm run build`, `npx cap sync android`, and build the APK again.

## 5. Webhook (recommended)
In the PayMongo dashboard, go to **Developers, then Webhooks, then Add endpoint**.
- URL: `https://<your-server>/api/webhooks/paymongo`
- Events: `payment.paid` and `payment.failed`
- Copy the signing secret (`whsk_...`) into `PAYMONGO_WEBHOOK_SECRET`.

The order page also asks the server to check the payment every few seconds, so payments are still picked up if the webhook is not set up.

## 6. Firestore rules
Run `firebase deploy --only firestore:rules`. The new payment status `awaiting_payment` must be allowed.

## 7. Testing
Cards (any future expiry date and any 3-digit CVC):
- `4343 4343 4343 4345`: paid, no 3D Secure
- `4120 0000 0000 0007`: opens the 3D Secure test page. Choose **Authorize**
- `5100 0000 0000 0198`: declined (insufficient funds)

**GCash and Maya in test mode:** you are sent to a PayMongo test page. Click **Authorize** to simulate a successful payment, or **Fail** to simulate a failed one. No GCash or Maya account is needed.

**QR Ph in test mode (only if you turned it on):** the code that is generated is a **real QR Ph code**. **Never scan it and pay.** If PayMongo returns a test link, the order page shows it. Open that link to simulate the payment.

## How it is protected
- The payment amount is always taken from the saved order on the server, never from the browser.
- Secret keys stay on the server. The browser only ever gets the public key.
- Card numbers go from the customer's device straight to PayMongo. Our server and database never see them.
- Webhooks are accepted only with a valid PayMongo signature.
