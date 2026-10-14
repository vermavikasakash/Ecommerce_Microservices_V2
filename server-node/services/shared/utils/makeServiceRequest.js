const makeServiceRequest = async (
  baseUrl,
  method,
  path,
  body = null,
  customerId = null,
  extraHeaders = {}
) => {
  const headers = {
    "content-type": "application/json",
    ...Object.fromEntries(
      Object.entries(extraHeaders).filter(([, value]) => value)
    ),
  };

  if (customerId) {
    headers["x-customer-id"] = customerId;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, options);
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const error = new Error(data.message || `Service error: ${response.status}`);
      error.statusCode = response.status;
      throw error;
    }

    return data;
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 502;
      error.message = `Service unavailable: ${baseUrl}`;
    }
    throw error;
  }
};

module.exports = { makeServiceRequest };
