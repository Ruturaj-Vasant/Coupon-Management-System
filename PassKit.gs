function createCoupon(formData) {
  Logger.log('Starting createCoupon with formData: ' + JSON.stringify(formData));
  
  var token = generateJWT(CONFIG.PASSKIT.API_KEY, CONFIG.PASSKIT.API_SECRET);
  Logger.log('Generated JWT token');
  
  var pk_url = CONFIG.PASSKIT.BASE_URL;
  
  var payload = {
    "offerId": CONFIG.PASSKIT.OFFER_IDS[formData.serviceType],
    "campaignId": CONFIG.PASSKIT.CAMPAIGN_ID,
    "externalId": "NYUCoupon_" + Date.now(),
    "person": {
      "displayName": formData.userName,
      "emailAddress": formData.userEmail,
      "mobileNumber": formData.userPhone
    },
    "metaData": {
      "couponDetail": "Please mention coupon before ordering. Not valid on specialty versions. One per customer. Not valid with any other coupons or offers.",
      "expiry": formData.expirationDate,
      "discountAmount": formData.discountAmount.toString()
    },
    "universal": {
      "expiryDate": formData.expirationDate
    },
    "status": "UNREDEEMED",
    "expiryDate": formData.expirationDate,
    "redemptionDetails": {
      "redemptionDate": formData.expirationDate
    }
  };

  Logger.log('Prepared payload: ' + JSON.stringify(payload, null, 2));

  var options = {
    method: 'POST',
    headers: {
      'Authorization': token,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  var endpoint = pk_url + '/coupon/singleUse/coupon';
  Logger.log('Making API call to endpoint: ' + endpoint);
  
  try {
    var response = UrlFetchApp.fetch(endpoint, options);
    var respText = response.getContentText();
    var respCode = response.getResponseCode();
    
    Logger.log('Response Code: ' + respCode);
    Logger.log('Response Text: ' + respText);
    
    var result = JSON.parse(respText);
    Logger.log('Parsed result: ' + JSON.stringify(result, null, 2));
    
    return {
      success: respCode === 200,
      url: result.id ? `https://pub2.pskt.io/${result.id}` : null,
      error: respCode !== 200 ? respText : null
    };
  } catch (error) {
    Logger.log('Error in API call: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

function generateJWT(key, secret) {		
    var body = {
        "uid": key,
        "exp": Math.floor(new Date().getTime() / 1000) + 3600,
        "iat": Math.floor(new Date().getTime() / 1000)
    };
    var header = {
        "alg": "HS256",
        "typ": "JWT"
    };
    var token = [];
    token[0] = base64url(JSON.stringify(header));
    token[1] = base64url(JSON.stringify(body));
    token[2] = genTokenSign(token, secret);
    return token.join(".");
}

function genTokenSign(token, secret) {
    if (token.length != 2) return;
    var hash = Utilities.computeHmacSha256Signature(token.join("."), secret);
    var base64Hash = Utilities.base64Encode(hash);
    return urlConvertBase64(base64Hash);
}

function base64url(input) {
    var base64String = Utilities.base64Encode(input);
    return urlConvertBase64(base64String);
}

function urlConvertBase64(input) {
    var output = input.replace(/=+$/, '');
    output = output.replace(/\+/g, '-');
    output = output.replace(/\//g, '_');
    return output;
}
