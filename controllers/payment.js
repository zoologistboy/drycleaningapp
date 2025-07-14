const flutterwave = require("flutterwave-node-v3");
const flw = new flutterwave(
  process.env.FLW_PUBLIC_KEY,
  process.env.FLW_SECRET_KEY
);

const initiatePayment = async (req, res) => {
  try {
    const { orderId, amount, email } = req.body;
    
    const response = await flw.Payment.initiate({
      tx_ref: `order_${orderId}_${Date.now()}`,
      amount,
      currency: "NGN",
      payment_options: "card",
      customer: { email },
      customizations: {
        title: "FreshPress Dry Cleaning",
        description: `Payment for Order #${orderId}`
      }
    });

    res.json({ status: "success", data: response.data.link });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

// Webhook handler
const paymentWebhook = async (req, res) => {
  const secretHash = process.env.FLW_SECRET_HASH;
  const signature = req.headers["verif-hash"];
  
  if (signature !== secretHash) {
    return res.status(401).end();
  }

  const payload = JSON.parse(req.body);
  console.log("✅ Webhook received:", payload);

  const { tx_ref, status } = req.body;
  const orderId = tx_ref.split("_")[1];

  if (status === "successful") {
    await Order.findByIdAndUpdate(orderId, { isPaid: true });
    // Add notification to user
  }

  res.status(200).end();
};

module.exports = {
    paymentWebhook,
    initiatePayment
}

