export async function onRequestPost(context) {
  try {
    const body = await context.request.json();

    const {
      citationNumber,
      email,
      name,
      plateNumber
    } = body;

    // Basic validation
    if (!citationNumber || !email || !name || !plateNumber) {
      return jsonResponse(
        {
          success: false,
          message: "Missing required payment information."
        },
        400
      );
    }

    /*
      IMPORTANT:
      For production, the server must look up the citation
      in your authoritative database and determine the amount
      itself.

      Do NOT trust an amount supplied by payment.html.
    */

    // Temporary placeholder until the citation database is connected.
    // We will replace this with the authoritative citation lookup.
    const amount = 100;
    const currency = "NGN";

    const txRef =
      `TS-${citationNumber}-${Date.now()}`;

    const payload = {
      tx_ref: txRef,
      amount: amount,
      currency: currency,
      redirect_url:
        `${new URL(context.request.url).origin}/functions/payment-callback`,
      customer: {
        email: email,
        name: name
      },
      customizations: {
        title: "Traffic Services",
        description: `Payment for citation ${citationNumber}`
      },
      meta: {
        citation_number: citationNumber,
        plate_number: plateNumber
      }
    };

    const response = await fetch(
      "https://api.flutterwave.com/v3/payments",
      {
        method: "POST",
        headers: {
          "Authorization":
            `Bearer ${context.env.FLW_SECRET_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    const result = await response.json();

    if (!response.ok || result.status !== "success") {
      console.error("Flutterwave error:", result);

      return jsonResponse(
        {
          success: false,
          message: "Unable to initialize payment."
        },
        502
      );
    }

    return jsonResponse({
      success: true,
      paymentLink: result.data.link,
      reference: txRef
    });

  } catch (error) {
    console.error("Create payment error:", error);

    return jsonResponse(
      {
        success: false,
        message: "Unable to process the payment request."
      },
      500
    );
  }
}

function jsonResponse(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}