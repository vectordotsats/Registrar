interface ReceiptItem {
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface ReceiptData {
  businessName: string;
  invoiceNumber: string | null;
  saleDate: string;
  customerName: string | null;
  soldBy: string;
  items: ReceiptItem[];
  totalAmount: number;
  amountPaid: number;
  paymentType: string;
  status: string;
}

export function generateReceipt(data: ReceiptData) {
  const balance = data.totalAmount - data.amountPaid;
  const isInvoice = data.paymentType === "credit";
  const title = isInvoice ? `Invoice #${data.invoiceNumber || "—"}` : "Receipt";
  const date = new Date(data.saleDate).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const initial = data.businessName.charAt(0).toUpperCase();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title} - ${data.businessName}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          color: #1a1a1a;
          padding: 0;
          background: #f5f5f5;
        }
        .page {
          max-width: 700px;
          margin: 20px auto;
          background: white;
          position: relative;
          overflow: hidden;
        }

        /* Top zig-zag edge */
        .zigzag-top {
          height: 16px;
          background: linear-gradient(135deg, #f5f5f5 25%, transparent 25%) -14px 0,
                      linear-gradient(225deg, #f5f5f5 25%, transparent 25%) -14px 0;
          background-size: 28px 16px;
          background-color: white;
        }

        /* Bottom zig-zag edge */
        .zigzag-bottom {
          height: 16px;
          background: linear-gradient(315deg, #f5f5f5 25%, transparent 25%) 0 0,
                      linear-gradient(45deg, #f5f5f5 25%, transparent 25%) 0 0;
          background-size: 28px 16px;
          background-color: white;
        }

        .content { padding: 32px 40px; position: relative; }

        /* Faint watermark logo */
        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 200px;
          font-weight: 800;
          color: rgba(108, 92, 231, 0.04);
          pointer-events: none;
          user-select: none;
          line-height: 1;
        }

        /* Purple accent bar at top */
        .accent-bar {
          height: 6px;
          background: linear-gradient(90deg, #6C5CE7, #8B7CF0);
        }

        .header {
          text-align: center;
          margin-bottom: 28px;
          padding-bottom: 20px;
          border-bottom: 2px solid #f0eeff;
        }
        .logo-circle {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #6C5CE7, #8B7CF0);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 12px;
          color: white;
          font-size: 24px;
          font-weight: 700;
        }
        .business-name {
          font-size: 22px;
          font-weight: 700;
          color: #1a1a1a;
        }
        .doc-type {
          font-size: 13px;
          color: #6C5CE7;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-top: 6px;
          font-weight: 600;
        }

        .meta {
          display: flex;
          justify-content: space-between;
          margin-bottom: 24px;
          padding: 16px;
          background: #faf9ff;
          border-radius: 12px;
          border: 1px solid #f0eeff;
        }
        .meta-group { }
        .meta-label { color: #9ca3af; font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 3px; }
        .meta-value { font-weight: 600; color: #1a1a1a; font-size: 14px; }

        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        thead th {
          text-align: left;
          padding: 12px 14px;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: white;
          background: linear-gradient(90deg, #6C5CE7, #8B7CF0);
        }
        thead th:first-child { border-radius: 8px 0 0 8px; }
        thead th:last-child { border-radius: 0 8px 8px 0; text-align: right; }
        thead th:nth-child(3) { text-align: right; }
        thead th:nth-child(2) { text-align: center; }
        tbody td { padding: 14px; font-size: 14px; border-bottom: 1px solid #f3f4f6; }
        tbody td:last-child { text-align: right; font-weight: 600; }
        tbody td:nth-child(3) { text-align: right; }
        tbody td:nth-child(2) { text-align: center; color: #6b7280; }
        tbody tr:last-child td { border-bottom: none; }

        .totals {
          margin-left: auto;
          width: 260px;
          background: #faf9ff;
          border-radius: 12px;
          padding: 16px;
          border: 1px solid #f0eeff;
        }
        .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
        .total-row.main {
          border-top: 2px solid #6C5CE7;
          padding-top: 12px;
          margin-top: 6px;
          font-weight: 700;
          font-size: 18px;
          color: #6C5CE7;
        }
        .total-row .label { color: #6b7280; }
        .total-row .value { font-weight: 600; }
        .total-row .value.paid { color: #16a34a; }
        .total-row .value.owed { color: #dc2626; }

        .status-bar {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          margin-top: 16px;
        }
        .status {
          display: inline-block;
          padding: 6px 16px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .status.paid { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
        .status.partial { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
        .status.unpaid { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }

        .footer {
          text-align: center;
          margin-top: 32px;
          padding-top: 20px;
          border-top: 2px solid #f0eeff;
          font-size: 13px;
          color: #9ca3af;
        }

        /* Purple side accents */
        .side-accent-left {
          position: absolute;
          left: 0;
          top: 80px;
          bottom: 80px;
          width: 4px;
          background: linear-gradient(180deg, #6C5CE7, transparent);
          border-radius: 0 4px 4px 0;
        }
        .side-accent-right {
          position: absolute;
          right: 0;
          top: 80px;
          bottom: 80px;
          width: 4px;
          background: linear-gradient(180deg, transparent, #6C5CE7);
          border-radius: 4px 0 0 4px;
        }

        @media print {
          body { padding: 0; background: white; }
          .page { margin: 0; box-shadow: none; }
        }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="accent-bar"></div>
        <div class="zigzag-top"></div>

        <div class="content">
          <div class="side-accent-left"></div>
          <div class="side-accent-right"></div>
          <div class="watermark">${initial}</div>

          <div class="header">
            <div class="business-name">${data.businessName}</div>
            <div class="doc-type">${isInvoice ? "Invoice" : "Sales Receipt"}</div>
          </div>

          <div class="meta">
            <div class="meta-group">
              ${isInvoice && data.invoiceNumber ? `<div><div class="meta-label">Invoice No.</div><div class="meta-value">#${data.invoiceNumber}</div></div>` : ""}
              <div ${isInvoice && data.invoiceNumber ? 'style="margin-top: 10px;"' : ""}><div class="meta-label">Date</div><div class="meta-value">${date}</div></div>
            </div>
            <div class="meta-group" style="text-align: right;">
              <div><div class="meta-label">Customer</div><div class="meta-value">${data.customerName || "Walk-in Customer"}</div></div>
              <div style="margin-top: 10px;"><div class="meta-label">Served by</div><div class="meta-value">${data.soldBy}</div></div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${data.items
                .map(
                  (item) => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td>${formatMoney(item.unit_price)}</td>
                  <td>${formatMoney(item.subtotal)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row main">
              <span>Total</span>
              <span>${formatMoney(data.totalAmount)}</span>
            </div>
            <div class="total-row">
              <span class="label">Paid</span>
              <span class="value paid">${formatMoney(data.amountPaid)}</span>
            </div>
            ${
              balance > 0
                ? `<div class="total-row">
                    <span class="label">Balance Due</span>
                    <span class="value owed">${formatMoney(balance)}</span>
                  </div>`
                : ""
            }
          </div>

          <div class="status-bar">
            <span class="status ${data.status}">${data.status}</span>
          </div>

          <div class="footer">
            Thank you for trusting ${data.businessName}
          </div>
        </div>

        <div class="zigzag-bottom"></div>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  }
}