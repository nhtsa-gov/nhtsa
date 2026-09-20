export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Basic Worker test
    if (
      url.pathname === "/api/test" &&
      request.method === "GET"
    ) {
      return jsonResponse({
        success: true,
        message: "Cloudflare Worker is working."
      });
    }

    // Flutterwave authentication test
    if (
      url.pathname === "/api/flutterwave-test" &&
      request.method === "GET"
    ) {
      return jsonResponse({
        success: true,
        message: "Flutterwave Standard uses the server-side secret key."
      });
    }

    // Create Flutterwave Standard hosted checkout
    if (
      url.pathname === "/api/create-payment" &&
      request.method === "POST"
    ) {
      return createPayment(request, env);
    }

    // Serve website
    return env.ASSETS.fetch(request);
  }
};


// ====================================================
// CREATE FLUTTERWAVE STANDARD PAYMENT
// ====================================================

async function createPayment(request, env) {
  try {
    // -----------------------------------------------
    // CHECK SECRET KEY
    // -----------------------------------------------

    if (!env.FLW_SECRET_KEY) {
      return jsonResponse(
        {
          success: false,
          message:
            "Flutterwave Secret Key is not configured."
        },
        500
      );
    }


    // -----------------------------------------------
    // READ REQUEST
    // -----------------------------------------------

    let body;

    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        {
          success: false,
          message: "Invalid payment request."
        },
        400
      );
    }


    const citationNumber =
      String(body.citationNumber || "").trim();

    const email =
      String(body.email || "").trim();

    const name =
      String(body.name || "").trim();

    const plateNumber =
      String(body.plateNumber || "").trim();


    // -----------------------------------------------
    // VALIDATE REQUIRED INFORMATION
    // -----------------------------------------------

    if (
      !citationNumber ||
      !email ||
      !name ||
      !plateNumber
    ) {
      return jsonResponse(
        {
          success: false,
          message:
            "Missing required payment information."
        },
        400
      );
    }


    // -----------------------------------------------
    // VALIDATE EMAIL
    // -----------------------------------------------

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      return jsonResponse(
        {
          success: false,
          message:
            "Please provide a valid email address."
        },
        400
      );
    }


    // -----------------------------------------------
    // SERVER-SIDE PAYMENT AMOUNT
    // -----------------------------------------------
    //
    // Prototype amount.
    //
    // The browser's amount is NOT trusted.
    // Replace this with your authorized citation
    // database before production use.
    //

    const amount = 100;
    const currency = "USD";


    // -----------------------------------------------
    // UNIQUE TRANSACTION REFERENCE
    // -----------------------------------------------

    const txRef =
      `TS-${citationNumber}-${Date.now()}`;


    // -----------------------------------------------
    // REDIRECT URL
    // -----------------------------------------------

    const redirectUrl =
      `${new URL(request.url).origin}/confirmation.html`;


    // -----------------------------------------------
    // FLUTTERWAVE STANDARD PAYLOAD
    // -----------------------------------------------

    const payload = {
      tx_ref: txRef,

      amount: amount,

      currency: currency,

      redirect_url: redirectUrl,

      customer: {
        email: email,

        name: name
      },

      payment_options: "card",

      customizations: {
        title: "Traffic Services",

        description:
          `Payment for citation ${citationNumber}`
      },

      meta: {
        citation_number:
          citationNumber,

        plate_number:
          plateNumber
      }
    };


    // -----------------------------------------------
    // CREATE HOSTED PAYMENT
    // -----------------------------------------------

    const response =
      await fetch(
        "https://api.flutterwave.com/v3/payments",
        {
          method: "POST",

          headers: {
            "Authorization":
              `Bearer ${env.FLW_SECRET_KEY}`,

            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(payload)
        }
      );


    // -----------------------------------------------
    // READ FLUTTERWAVE RESPONSE
    // -----------------------------------------------

    const responseText =
      await response.text();

    let result;

    try {
      result =
        JSON.parse(responseText);
    } catch {
      result = {
        raw_response:
          responseText
      };
    }


    // -----------------------------------------------
    // HANDLE FLUTTERWAVE ERROR
    // -----------------------------------------------

    if (!response.ok) {
      return jsonResponse(
        {
          success: false,

          message:
            "Flutterwave rejected the payment request.",

          flutterwave_status:
            response.status,

          flutterwave_response:
            result,

          reference:
            txRef
        },
        response.status
      );
    }


    // -----------------------------------------------
    // GET HOSTED PAYMENT LINK
    // -----------------------------------------------

    const paymentLink =
      result?.data?.link || null;


    if (!paymentLink) {
      return jsonResponse(
        {
          success: false,

          message:
            "Flutterwave did not return a hosted payment link.",

          reference:
            txRef,

          flutterwave_response:
            result
        },
        502
      );
    }


    // -----------------------------------------------
    // SUCCESS
    // -----------------------------------------------

    return jsonResponse({
      success: true,

      message:
        "Flutterwave checkout created successfully.",

      paymentLink:
        paymentLink,

      reference:
        txRef,

      amount:
        amount,

      currency:
        currency
    });


  } catch (error) {

    return jsonResponse(
      {
        success: false,

        message:
          "Payment initialization failed.",

        error:
          error?.message ||
          "Unknown Worker error"
      },
      500
    );
  }
}


// ====================================================
// JSON RESPONSE HELPER
// ====================================================

function jsonResponse(
  data,
  status = 200
) {
  return new Response(
    JSON.stringify(
      data,
      null,
      2
    ),
    {
      status: status,

      headers: {
        "Content-Type":
          "application/json",

        "Cache-Control":
          "no-store"
      }
    }
  );
}