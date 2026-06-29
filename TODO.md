# TODO — Add M-Pesa STK Push (Sandbox)

## Step 1 — Repository prep
- [ ] Inspect existing donation endpoints and UI donation flows.

## Step 2 — Backend STK Push + Callback
- [ ] Add STK Push endpoint (POST /api/mpesa/stkpush) to initiate Safaricom STK Push.
- [ ] Add STK Callback endpoint (POST /api/mpesa/callback) to receive Safaricom callback.
- [ ] Store a temporary payment reference mapping (reference → campaign + donor details).
- [ ] On successful callback, record the donation using existing logic (same campaign updates + contribution ledger).

## Step 3 — Frontend wiring
- [x] Update Quick Donate + Campaign Detail donation button to call STK Push endpoint when gateway = M-Pesa.
- [ ] Add UI states: awaiting callback / success toast.
- [ ] Add polling endpoint (or lightweight approach) so UI can confirm success after callback.


## Step 4 — Env & local setup
- [ ] Add required env vars documentation to README.
- [ ] Provide instructions for Safaricom sandbox (shortcode, passkey, callback URLs).

## Step 5 — Test
- [ ] Run app and test sandbox flow end-to-end.
- [ ] Verify ledger entry uses paymentMethod = "M-Pesa STK Push".

