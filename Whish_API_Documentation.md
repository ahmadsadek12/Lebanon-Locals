
# **Whish API Documentation (v1.3 – October 2025)**

## 📘 **Overview**
The **Whish API** is a REST-based service accessible over HTTPS.

### **Base URLs**
- **Live:** `https://whish.money/itel-service/api/`  
- **Sandbox:** `https://api.sandbox.whish.money/itel-service/api/`

### **Requirements**
- Must send and receive **JSON** over HTTPS.
- Each request must include these headers:
  - `channel`: provided by Whish  
  - `secret`: provided by Whish  
  - `websiteurl`: third-party website URL  
  - `Content-Type`: `application/json`

### **Response Format**
| Field | Type | Description |
|--------|------|-------------|
| `status` | Boolean | Indicates success or failure |
| `code` | String | Operation-specific error code |
| `dialog` | String | User-friendly message |
| `data` | Object | Contains response payload |

---

## ⚙️ **Endpoints**

### **1. Get Balance**
Returns the real account balance (currently only LBP supported).

**Method:** `GET`  
**URI:** `/payment/account/balance`  
**Request:**  
No body parameters required (headers only).

**Response Example:**
```json
{
  "status": true,
  "code": null,
  "dialog": null,
  "extra": null,
  "data": {
    "balanceDetails": {
      "balance": 217.718
    }
  }
}
```
📍 **Sandbox Endpoint:**  
`https://lb.sandbox.whish.money/itel-service/api/payment/account/balance`

---

### **2. Get Rate (Inactive)**
Returns the current rate or fee deducted from an invoice.

**Method:** `POST`  
**URI:** `/payment/whish/rate`

**Request Body:**
| Field | Type | Description |
|--------|------|-------------|
| `amount` | Double | Amount to be paid |
| `currency` | String | “LBP” or “USD” |

**Response Example:**
```json
{
  "status": true,
  "code": null,
  "dialog": null,
  "extra": null,
  "data": {
    "rate": 0.041666666666666667
  }
}
```

📍 **Sandbox Endpoint:**  
`https://lb.sandbox.whish.money/itel-service/api/payment/whish/rate`

---

### **3. Post Payment**
Creates a payment session and returns a URL where the customer pays via Whish Balance.

**Method:** `POST`  
**URI:** `/payment/whish`

**Request Body:**
| Field | Type | Description |
|--------|------|-------------|
| `amount` | Double | Amount to be paid |
| `currency` | String | “LBP”, “USD”, or “AED” |
| `invoice` | String | Description or details of the payment |
| `externalId` | Long | Third-party transaction ID |
| `successCallbackUrl` | String | GET callback URL on success |
| `failureCallbackUrl` | String | GET callback URL on failure |
| `successRedirectUrl` | String | Redirect URL for successful transaction |
| `failureRedirectUrl` | String | Redirect URL for failed transaction |

**Test Cases (Sandbox):**
- ✅ **Success:** phone number `96170902894` + OTP `111111`
- ❌ **Failure:** any number + wrong OTP  
*(Note: No real OTP is sent in Sandbox)*

**Response Example:**
```json
{
  "status": true,
  "code": null,
  "dialog": null,
  "extra": null,
  "data": {
    "collectUrl": "https://whish.money/pay/8nQS2mL"
  }
}
```

📍 **Sandbox Endpoint:**  
`https://lb.sandbox.whish.money/itel-service/api/payment/whish`

---

### **4. Get Status**
Returns the collection status of a payment.

**Method:** `POST`  
**URI:** `/payment/collect/status`

**Request Body:**
| Field | Type | Description |
|--------|------|-------------|
| `currency` | String | “LBP” or “USD” |
| `externalId` | Long | Third-party transaction ID |

**Response Example:**
```json
{
  "status": true,
  "code": null,
  "dialog": null,
  "extra": null,
  "data": {
    "collectStatus": "success",
    "payerPhoneNumber": "96170902894"
  }
}
```

📍 **Sandbox Endpoint:**  
`https://lb.sandbox.whish.money/itel-service/api/payment/collect/status`

---

## 🧾 **Version Control**
| Version | Author | Date | Notes |
|----------|---------|------|-------|
| **1.0** | TecFrac | 2022-11-08 | Initial Release |
| **1.1** | TecFrac | 2025-05-12 | Added test cases & content-type requirements |
| **1.2** | TecFrac | 2025-09-17 | Updated Get Status endpoint with `payerPhoneNumber` |
| **1.3** | TecFrac | 2025-10-03 | Updated Sandbox Base URL |

---

## ⚠️ **Disclaimer**
This document is proprietary to Whish and subject to change. The company reserves the right to modify endpoints, payloads, or authentication details at any time.
